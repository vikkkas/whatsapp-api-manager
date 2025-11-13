import express, { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenantIsolation } from '../middleware/tenant.js';
import { log } from '../utils/logger.js';
import { getTenantRateLimiter } from '../utils/rateLimiter.js';
import { broadcastNewMessage } from '../services/websocket.js';
import { getMetaAPIForTenant } from '../services/metaAPI.js';

const router = express.Router();

// Apply authentication and tenant isolation to all routes
router.use(authenticate);
router.use(enforceTenantIsolation);

// Validation schemas
const sendMessageSchema = z.object({
  phoneNumberId: z.string(),
  to: z.string(),
  type: z.enum(['text', 'image', 'video', 'audio', 'document']),
  text: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  caption: z.string().optional(),
  filename: z.string().optional(),
});

const listMessagesSchema = z.object({
  conversationId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  direction: z.enum(['INBOUND', 'OUTBOUND']).optional(),
  status: z.enum(['PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED']).optional(),
});

/**
 * GET /api/messages
 * List messages with filters and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listMessagesSchema.parse(req.query);
    const tenantId = req.user!.tenantId;

    const where: any = { tenantId };

    if (query.conversationId) {
      where.conversationId = query.conversationId;
    }

    if (query.direction) {
      where.direction = query.direction;
    }

    if (query.status) {
      where.status = query.status;
    }

    const skip = (query.page - 1) * query.limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          conversation: {
            select: {
              id: true,
              contactPhone: true,
              contactName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.message.count({ where }),
    ]);

    res.json({
      messages,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  } catch (error: any) {
    log.error('Error listing messages', { error: error.message, userId: req.user?.userId });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }

    res.status(500).json({ error: 'Failed to list messages' });
  }
});

/**
 * GET /api/messages/:id
 * Get a specific message
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const message = await prisma.message.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(message);
  } catch (error: any) {
    log.error('Error fetching message', { error: error.message, messageId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

/**
 * POST /api/messages
 * Send a new message directly to WhatsApp API
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = sendMessageSchema.parse(req.body);
    const tenantId = req.user!.tenantId;

    // Get WABA credentials
    const credential = await prisma.wABACredential.findFirst({
      where: {
        phoneNumberId: data.phoneNumberId,
        tenantId,
        isValid: true,
      },
    });

    if (!credential) {
      return res.status(404).json({ error: 'Phone number not found or invalid' });
    }

    // Check rate limits
    const rateLimiter = await getTenantRateLimiter(req.tenant);
    const rateLimitResult = await rateLimiter.consume(1);

    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
        remainingTokens: rateLimitResult.remainingTokens,
      });
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        tenantId,
        contactPhone: data.to,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          tenantId,
          contactPhone: data.to,
          contactName: data.to,
          status: 'OPEN',
        },
      });
    }

    // Use Meta API service to send message
    const metaAPI = await getMetaAPIForTenant(tenantId);
    let waMessageId: string;

    try {
      if (data.type === 'text' && data.text) {
        const result = await metaAPI.sendTextMessage(data.to, data.text, { preview_url: true });
        waMessageId = result.messageId;
      } else if (data.mediaUrl) {
        // For media messages, you'd typically upload the media first to get a mediaId
        // For now, we'll use the URL directly (requires link parameter in sendMediaMessage)
        // In production, implement media upload flow
        throw new Error('Media upload not yet implemented. Please use mediaId instead of URL.');
      } else {
        throw new Error('Invalid message type or missing content');
      }
    } catch (apiError: any) {
      log.error('WhatsApp API error', {
        error: apiError.message,
        tenantId,
        to: data.to,
      });
      throw new Error(`Failed to send message via WhatsApp: ${apiError.message}`);
    }

    // Save message to database
    const message = await prisma.message.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        waMessageId,
        direction: 'OUTBOUND',
        from: credential.phoneNumber,
        to: data.to,
        type: data.type.toUpperCase() as any,
        text: data.text,
        mediaUrl: data.mediaUrl,
        mediaCaption: data.caption,
        mediaFilename: data.filename,
        status: 'SENT',
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
      },
    });

    // Broadcast new message via WebSocket
    broadcastNewMessage(conversation.id, message);

    log.info('Message sent successfully', {
      messageId: message.id,
      waMessageId,
      to: data.to,
      tenantId,
    });

    res.status(201).json(message);
  } catch (error: any) {
    log.error('Error sending message', {
      error: error.message,
      userId: req.user?.userId,
      stack: error.stack,
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      // Invalidate credential
      await prisma.wABACredential.update({
        where: { phoneNumberId: req.body.phoneNumberId },
        data: {
          isValid: false,
          invalidReason: 'Authentication failed with WhatsApp API',
        },
      });

      return res.status(401).json({ error: 'WhatsApp credentials invalid' });
    }

    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * PATCH /api/messages/:id
 * Update message status
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { status } = req.body;

    const message = await prisma.message.findFirst({
      where: { id, tenantId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { status },
    });

    res.json(updated);
  } catch (error: any) {
    log.error('Error updating message', { error: error.message, messageId: req.params.id });
    res.status(500).json({ error: 'Failed to update message' });
  }
});

export default router;
