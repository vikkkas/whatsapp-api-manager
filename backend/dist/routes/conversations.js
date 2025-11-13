import express from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenantIsolation } from '../middleware/tenant.js';
import { log } from '../utils/logger.js';
const router = express.Router();
router.use(authenticate);
router.use(enforceTenantIsolation);
const listConversationsSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['OPEN', 'RESOLVED', 'ARCHIVED']).optional(),
    search: z.string().optional(),
    assignedTo: z.string().optional(),
});
const updateConversationSchema = z.object({
    status: z.enum(['OPEN', 'RESOLVED', 'ARCHIVED']).optional(),
    assignedTo: z.string().uuid().nullable().optional(),
    tags: z.array(z.string()).optional(),
});
router.get('/', async (req, res) => {
    try {
        const query = listConversationsSchema.parse(req.query);
        const tenantId = req.user.tenantId;
        const where = { tenantId };
        if (query.status) {
            where.status = query.status;
        }
        if (query.assignedTo) {
            where.assignedTo = query.assignedTo;
        }
        if (query.search) {
            where.OR = [
                { customerPhone: { contains: query.search, mode: 'insensitive' } },
                { customerName: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const skip = (query.page - 1) * query.limit;
        const [conversations, total] = await Promise.all([
            prisma.conversation.findMany({
                where,
                include: {
                    assignedAgent: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    _count: {
                        select: {
                            messages: {
                                where: {
                                    direction: 'INBOUND',
                                    status: { not: 'READ' },
                                },
                            },
                        },
                    },
                },
                orderBy: { lastMessageAt: 'desc' },
                skip,
                take: query.limit,
            }),
            prisma.conversation.count({ where }),
        ]);
        const conversationsWithUnread = conversations.map((conv) => ({
            ...conv,
            unreadCount: conv._count.messages,
            _count: undefined,
        }));
        res.json({
            conversations: conversationsWithUnread,
            pagination: {
                page: query.page,
                limit: query.limit,
                total,
                pages: Math.ceil(total / query.limit),
            },
        });
    }
    catch (error) {
        log.error('Error listing conversations', { error: error.message, userId: req.user?.userId });
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to list conversations' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const conversation = await prisma.conversation.findFirst({
            where: {
                id,
                tenantId,
            },
            include: {
                assignedAgent: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 100,
                },
            },
        });
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        await prisma.message.updateMany({
            where: {
                conversationId: id,
                direction: 'INBOUND',
                status: { not: 'READ' },
            },
            data: {
                status: 'READ',
            },
        });
        res.json(conversation);
    }
    catch (error) {
        log.error('Error fetching conversation', {
            error: error.message,
            conversationId: req.params.id,
        });
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const data = updateConversationSchema.parse(req.body);
        const conversation = await prisma.conversation.findFirst({
            where: { id, tenantId },
        });
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        if (data.assignedTo) {
            const agent = await prisma.agent.findFirst({
                where: {
                    id: data.assignedTo,
                    tenantId,
                },
            });
            if (!agent) {
                return res.status(400).json({ error: 'Agent not found' });
            }
        }
        const updated = await prisma.conversation.update({
            where: { id },
            data,
            include: {
                assignedAgent: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        res.json(updated);
    }
    catch (error) {
        log.error('Error updating conversation', {
            error: error.message,
            conversationId: req.params.id,
        });
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid request data', details: error.errors });
        }
        res.status(500).json({ error: 'Failed to update conversation' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const conversation = await prisma.conversation.findFirst({
            where: { id, tenantId },
        });
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        await prisma.conversation.update({
            where: { id },
            data: { status: 'ARCHIVED' },
        });
        res.json({ message: 'Conversation archived successfully' });
    }
    catch (error) {
        log.error('Error archiving conversation', {
            error: error.message,
            conversationId: req.params.id,
        });
        res.status(500).json({ error: 'Failed to archive conversation' });
    }
});
export default router;
//# sourceMappingURL=conversations.js.map