import { Router, Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { enforceTenantIsolation } from '../middleware/tenant.js';

const router = Router();

// Apply authentication and tenant isolation
router.use(authenticate);
router.use(enforceTenantIsolation);

/**
 * GET /api/analytics/overview
 * Get analytics overview for a tenant
 */
router.get('/overview', requirePermission('VIEW_ANALYTICS'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const days = parseInt(req.query.days as string) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get message counts by status
    const messagesByStatus = await prisma.message.groupBy({
      by: ['status'],
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Get message counts by type
    const messagesByType = await prisma.message.groupBy({
      by: ['type'],
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Get conversation counts by status
    const conversationsByStatus = await prisma.conversation.groupBy({
      by: ['status'],
      where: {
        tenantId,
      },
      _count: true,
    });

    // Get total counts
    const totalMessages = await prisma.message.count({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
    });

    const totalConversations = await prisma.conversation.count({
      where: { tenantId },
    });

    // Get messages sent today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sentToday = await prisma.message.count({
      where: {
        tenantId,
        direction: 'OUTBOUND',
        createdAt: { gte: today },
      },
    });

    // Get messages sent this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const sentThisWeek = await prisma.message.count({
      where: {
        tenantId,
        direction: 'OUTBOUND',
        createdAt: { gte: weekAgo },
      },
    });

    // Get messages sent this month
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    const sentThisMonth = await prisma.message.count({
      where: {
        tenantId,
        direction: 'OUTBOUND',
        createdAt: { gte: monthAgo },
      },
    });

    // Calculate delivery rate
    const deliveredMessages = messagesByStatus.find(m => m.status === 'DELIVERED')?._count || 0;
    const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;

    // Get daily activity for the past 7 days
    const dailyActivity = await prisma.$queryRaw<Array<{
      date: Date;
      sent: bigint;
      received: bigint;
    }>>`
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

    // Format response
    const response = {
      success: true,
      data: {
        overview: {
          totalMessages,
          totalConversations,
          deliveryRate: Math.round(deliveryRate * 10) / 10,
          averageResponseTime: 45, // TODO: Calculate actual avg response time
          sentToday,
          sentThisWeek,
          sentThisMonth,
        },
        messagesByStatus: messagesByStatus.reduce((acc, item) => {
          acc[item.status.toLowerCase()] = item._count;
          return acc;
        }, {} as Record<string, number>),
        messagesByType: messagesByType.reduce((acc, item) => {
          acc[item.type.toLowerCase()] = item._count;
          return acc;
        }, {} as Record<string, number>),
        conversationsByStatus: conversationsByStatus.reduce((acc, item) => {
          acc[item.status.toLowerCase()] = item._count;
          return acc;
        }, {} as Record<string, number>),
        dailyActivity: dailyActivity.map(day => ({
          date: day.date.toISOString().split('T')[0],
          sent: Number(day.sent),
          received: Number(day.received),
        })),
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/analytics/messages
 * Get message analytics
 */
router.get('/messages', requirePermission('VIEW_ANALYTICS'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const days = parseInt(req.query.days as string) || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get hourly message distribution
    const hourlyActivity = await prisma.$queryRaw<Array<{
      hour: number;
      count: bigint;
    }>>`
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
  } catch (error) {
    console.error('Message analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch message analytics',
    });
  }
});

export default router;
