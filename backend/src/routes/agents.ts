import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { enforceTenantIsolation } from '../middleware/tenant.js';
import { generatePassword, hashPassword, PERMISSION_PRESETS } from '../middleware/permissions.js';
import prisma from '../config/prisma.js';
import { log } from '../utils/logger.js';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(enforceTenantIsolation);

// Validation schemas
const createAgentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  permissions: z.array(z.string()).default([]),
  preset: z.enum(['JUNIOR_AGENT', 'SENIOR_AGENT', 'TEAM_LEAD', 'MARKETING_MANAGER']).optional(),
  maxConcurrentChats: z.number().int().min(1).max(50).default(10),
  skills: z.array(z.string()).default([]),
});

const updateAgentSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  status: z.enum(['ONLINE', 'AWAY', 'BUSY', 'OFFLINE']).optional(),
  permissions: z.array(z.string()).optional(),
  maxConcurrentChats: z.number().int().min(1).max(50).optional(),
  skills: z.array(z.string()).optional(),
  isOnline: z.boolean().optional(),
});

// List agents
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const status = req.query.status as string;

    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    const agents = await prisma.agent.findMany({
      where,
      include: {
        _count: {
          select: { assignedConversations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      agents,
    });
  } catch (error: unknown) {
    log.error('Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents',
    });
  }
});

// Get single agent
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const agent = await prisma.agent.findFirst({
      where: { id, tenantId },
      include: {
        assignedConversations: {
          select: {
            id: true,
            contactPhone: true,
            contactName: true,
            status: true,
            lastMessageAt: true,
            unreadCount: true,
          },
          orderBy: { lastMessageAt: 'desc' },
          take: 20,
        },
        _count: {
          select: { assignedConversations: true },
        },
      },
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    res.json({
      success: true,
      agent,
    });
  } catch (error: unknown) {
    log.error('Error fetching agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent',
    });
  }
});

// Create agent
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const data = createAgentSchema.parse(req.body);

    // Check if email already exists
    const existing = await prisma.agent.findFirst({
      where: {
        tenantId,
        email: data.email,
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'An agent with this email already exists',
      });
    }

    // Generate temporary password
    const tempPassword = generatePassword(data.name);
    const hashedPassword = await hashPassword(tempPassword);

    // Get permissions from preset or use provided permissions
    const permissions = data.preset 
      ? PERMISSION_PRESETS[data.preset]
      : data.permissions;

    const agent = await prisma.agent.create({
      data: {
        tenantId,
        name: data.name,
        email: data.email,
        password: hashedPassword,
        permissions: permissions as any,
        maxConcurrentChats: data.maxConcurrentChats,
        skills: data.skills,
        status: 'OFFLINE',
        isOnline: false,
      },
    });

    log.info('Agent created', { agentId: agent.id, tenantId });

    res.status(201).json({
      success: true,
      agent: { ...agent, password: undefined }, // Don't send password hash
      temporaryPassword: tempPassword,
      loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/agent-login`,
    });
  } catch (error: unknown) {
    log.error('Error creating agent:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create agent',
    });
  }
});

// Update agent
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const data = updateAgentSchema.parse(req.body);

    const existing = await prisma.agent.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    // Check if new email conflicts
    if (data.email && data.email !== existing.email) {
      const conflict = await prisma.agent.findFirst({
        where: {
          tenantId,
          email: data.email,
          id: { not: id },
        },
      });

      if (conflict) {
        return res.status(400).json({
          success: false,
          error: 'An agent with this email already exists',
        });
      }
    }

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...data,
        permissions: data.permissions as any,
      },
    });

    // If permissions are updated, invalidate sessions
    if (data.permissions) {
      // @ts-ignore - session property exists after migration
      await prisma.session.deleteMany({
        where: { agentId: id },
      });
      log.info('Agent sessions invalidated due to permission update', { agentId: id });
    }

    log.info('Agent updated', { agentId: id, tenantId });

    res.json({
      success: true,
      agent,
    });
  } catch (error: unknown) {
    log.error('Error updating agent:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update agent',
    });
  }
});

// Delete agent
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const existing = await prisma.agent.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    // Unassign all conversations
    await prisma.conversation.updateMany({
      where: { assignedAgentId: id },
      data: { assignedAgentId: null },
    });

    await prisma.agent.delete({
      where: { id },
    });

    log.info('Agent deleted', { agentId: id, tenantId });

    res.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error: unknown) {
    log.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete agent',
    });
  }
});

// Update agent status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { status } = req.body;

    if (!['ONLINE', 'AWAY', 'BUSY', 'OFFLINE'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
      });
    }

    const agent = await prisma.agent.findFirst({
      where: { id, tenantId },
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    const updated = await prisma.agent.update({
      where: { id },
      data: {
        status,
        isOnline: status !== 'OFFLINE',
      },
    });

    log.info('Agent status updated', { agentId: id, status, tenantId });

    res.json({
      success: true,
      agent: updated,
    });
  } catch (error: unknown) {
    log.error('Error updating agent status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent status',
    });
  }
});

// Get agent statistics
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const agent = await prisma.agent.findFirst({
      where: { id, tenantId },
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
      });
    }

    const [totalConversations, activeConversations, resolvedConversations] = await Promise.all([
      prisma.conversation.count({
        where: { assignedAgentId: id },
      }),
      prisma.conversation.count({
        where: { assignedAgentId: id, status: 'OPEN' },
      }),
      prisma.conversation.count({
        where: { assignedAgentId: id, status: 'RESOLVED' },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        totalConversations,
        activeConversations,
        resolvedConversations,
        status: agent.status,
        maxConcurrentChats: agent.maxConcurrentChats,
      },
    });
  } catch (error: unknown) {
    log.error('Error fetching agent stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent statistics',
    });
  }
});

export default router;
