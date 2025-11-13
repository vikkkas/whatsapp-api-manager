import { Router } from 'express';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenantIsolation } from '../middleware/tenant.js';
const router = Router();
router.use(authenticate);
router.use(enforceTenantIsolation);
router.get('/overview', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const messagesByStatus = await prisma.message.groupBy({
            by: ['status'],
            where: {
                tenantId,
                createdAt: { gte: startDate },
            },
            _count: true,
        });
        const messagesByType = await prisma.message.groupBy({
            by: ['type'],
            where: {
                tenantId,
                createdAt: { gte: startDate },
            },
            _count: true,
        });
        const conversationsByStatus = await prisma.conversation.groupBy({
            by: ['status'],
            where: {
                tenantId,
            },
            _count: true,
        });
        const totalMessages = await prisma.message.count({
            where: {
                tenantId,
                createdAt: { gte: startDate },
            },
        });
        const totalConversations = await prisma.conversation.count({
            where: { tenantId },
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sentToday = await prisma.message.count({
            where: {
                tenantId,
                direction: 'OUTBOUND',
                createdAt: { gte: today },
            },
        });
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const sentThisWeek = await prisma.message.count({
            where: {
                tenantId,
                direction: 'OUTBOUND',
                createdAt: { gte: weekAgo },
            },
        });
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        const sentThisMonth = await prisma.message.count({
            where: {
                tenantId,
                direction: 'OUTBOUND',
                createdAt: { gte: monthAgo },
            },
        });
        const deliveredMessages = messagesByStatus.find(m => m.status === 'DELIVERED')?._count || 0;
        const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;
        const dailyActivity = await prisma.$queryRaw `
      SELECT 
        DATE("createdAt") as date,
        COUNT(CASE WHEN direction = 'OUTBOUND' THEN 1 END) as sent,
        COUNT(CASE WHEN direction = 'INBOUND' THEN 1 END) as received
      FROM "Message"
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ${weekAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `;
        const response = {
            success: true,
            data: {
                overview: {
                    totalMessages,
                    totalConversations,
                    deliveryRate: Math.round(deliveryRate * 10) / 10,
                    averageResponseTime: 45,
                    sentToday,
                    sentThisWeek,
                    sentThisMonth,
                },
                messagesByStatus: messagesByStatus.reduce((acc, item) => {
                    acc[item.status.toLowerCase()] = item._count;
                    return acc;
                }, {}),
                messagesByType: messagesByType.reduce((acc, item) => {
                    acc[item.type.toLowerCase()] = item._count;
                    return acc;
                }, {}),
                conversationsByStatus: conversationsByStatus.reduce((acc, item) => {
                    acc[item.status.toLowerCase()] = item._count;
                    return acc;
                }, {}),
                dailyActivity: dailyActivity.map(day => ({
                    date: day.date.toISOString().split('T')[0],
                    sent: Number(day.sent),
                    received: Number(day.received),
                })),
            },
        };
        res.json(response);
    }
    catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
router.get('/messages', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        const days = parseInt(req.query.days) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const hourlyActivity = await prisma.$queryRaw `
      SELECT 
        EXTRACT(HOUR FROM "createdAt")::integer as hour,
        COUNT(*) as count
      FROM "Message"
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ${startDate}
      GROUP BY hour
      ORDER BY hour
    `;
        res.json({
            success: true,
            data: {
                hourlyActivity: hourlyActivity.map(item => ({
                    hour: item.hour,
                    count: Number(item.count),
                })),
            },
        });
    }
    catch (error) {
        console.error('Message analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch message analytics',
        });
    }
});
export default router;
//# sourceMappingURL=analytics.js.map