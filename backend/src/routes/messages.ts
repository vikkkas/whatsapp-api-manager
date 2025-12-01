import express, { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { enforceTenantIsolation } from '../middleware/tenant.js';
import { log } from '../utils/logger.js';
import { normalizePhoneNumber } from '../utils/phone.js';
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
  type: z.enum(['text', 'image', 'video', 'audio', 'document', 'template', 'interactive']),
  text: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  caption: z.string().optional(),
  filename: z.string().optional(),
  templateName: z.string().optional(),
  languageCode: z.string().optional(),
  templateComponents: z.array(z.any()).optional(),
  interactive: z.any().optional(),
});

const renderTemplateBody = (bodyText?: string | null, components?: Array<any>) => {
  if (!bodyText) return null;
  if (!components || components.length === 0) return bodyText;

  const bodyComponent = components.find(
    (component) => (component.type || '').toLowerCase() === 'body'
  );

  if (!bodyComponent?.parameters) {
    return bodyText;
  }

  let rendered = bodyText;
  bodyComponent.parameters.forEach((param: any, index: number) => {
    const value = typeof param.text === 'string' ? param.text : '';
    const placeholder = new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g');
    rendered = rendered.replace(placeholder, value);
  });

  return rendered;
};

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
router.get('/', requirePermission('VIEW_CONVERSATIONS'), async (req: Request, res: Response) => {
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
router.get('/:id', requirePermission('VIEW_CONVERSATIONS'), async (req: Request, res: Response) => {
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
router.post('/', requirePermission('SEND_MESSAGES'), async (req: Request, res: Response) => {
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

    const normalizedRecipient = normalizePhoneNumber(data.to);
    if (!normalizedRecipient) {
      return res.status(400).json({ error: 'Invalid destination phone number' });
    }
    const metaRecipient = normalizedRecipient.startsWith('+')
      ? normalizedRecipient.slice(1)
      : normalizedRecipient;

    const contact = await prisma.contact.upsert({
      where: {
        tenantId_phoneNumber: {
          tenantId,
          phoneNumber: normalizedRecipient,
        },
      },
      create: {
        tenantId,
        phoneNumber: normalizedRecipient,
        name: normalizedRecipient,
      },
      update: {},
    });

    let conversation = await prisma.conversation.findFirst({
      where: {
        tenantId,
        contactPhone: normalizedRecipient,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          tenantId,
          contactId: contact.id,
          contactPhone: normalizedRecipient,
          contactName: contact.name,
          status: 'OPEN',
        },
      });
    } else if (!conversation.contactId) {
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          contactId: contact.id,
          contactPhone: normalizedRecipient,
          contactName: conversation.contactName || contact.name,
        },
      });
    }

    const templateData =
      data.type === 'template'
        ? await prisma.template.findFirst({
            where: {
              tenantId,
              OR: [
                { id: data.templateName },
                { name: data.templateName },
                { displayName: data.templateName },
              ],
            },
          })
        : null;

    // Use Meta API service to send message
    const metaAPI = await getMetaAPIForTenant(tenantId);
    let waMessageId: string;

    try {
      if (data.type === 'text' && data.text) {
        const result = await metaAPI.sendTextMessage(metaRecipient, data.text, { preview_url: true });
        waMessageId = result.messageId;
      } else if (data.type === 'interactive' && data.interactive) {
        const result = await metaAPI.sendInteractiveMessage(metaRecipient, data.interactive);
        waMessageId = result.messageId;
        // Set text for database storage
        if (data.interactive.body && data.interactive.body.text) {
          data.text = data.interactive.body.text;
        }
      } else if (data.type === 'template') {
        const templateName = templateData?.name || data.templateName;
        const languageCode = data.languageCode || templateData?.language;
      } else if (data.mediaUrl) {
        // For media messages, you'd typically upload the media first to get a mediaId
        // For now, we'll use the URL directly (requires link parameter in sendMediaMessage)
        // In production, implement media upload flow
        throw new Error('Media upload not yet implemented. Please use mediaId instead of URL.');
      } else {
        throw new Error('Invalid message type or missing content');
      }
    } catch (apiError: any) {
      const details =
        apiError.response?.data?.error?.message ||
        apiError.response?.data?.message ||
        apiError.message;

      log.error('WhatsApp API error', {
        error: details,
        tenantId,
        to: data.to,
        status: apiError.response?.status,
      });

      return res.status(502).json({
        error: details || 'Failed to send message via WhatsApp',
      });
    }

    const templateParams =
      data.type === 'template' && data.templateComponents && data.templateComponents.length > 0
        ? data.templateComponents
        : null;

    // Save message to database
    const message = await prisma.message.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        waMessageId,
        direction: 'OUTBOUND',
        from: credential.phoneNumber,
        to: normalizedRecipient,
        type: data.type.toUpperCase() as any,
        text: data.type === 'template' ? (data.text || null) : data.text,
        mediaUrl: data.mediaUrl,
        mediaCaption: data.caption,
        mediaFilename: data.filename,
        status: 'SENT',
        templateName:
          data.type === 'template'
            ? templateData?.displayName || templateData?.name || data.templateName || null
            : null,
        templateParams: templateParams,
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
router.patch('/:id', requirePermission('SEND_MESSAGES'), async (req: Request, res: Response) => {
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
