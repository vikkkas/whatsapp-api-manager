import { Router } from 'express';
import prisma from '../config/prisma.js';
import { getQueueStats } from '../config/queues.js';
import redis from '../config/redis.js';
const router = Router();
router.get('/', async (_req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        services: {
            database: 'unknown',
            redis: 'unknown',
            queues: 'unknown'
        }
    };
    try {
        await prisma.$queryRaw `SELECT 1`;
        health.services.database = 'healthy';
    }
    catch (error) {
        health.status = 'degraded';
        health.services.database = 'unhealthy';
    }
    try {
        await redis.ping();
        health.services.redis = 'healthy';
    }
    catch (error) {
        health.status = 'degraded';
        health.services.redis = 'unhealthy';
    }
    try {
        const queueStats = await getQueueStats();
        health.services.queues = 'healthy';
        health.queueStats = queueStats;
    }
    catch (error) {
        health.status = 'degraded';
        health.services.queues = 'unhealthy';
    }
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});
router.get('/ready', async (_req, res) => {
    try {
        await prisma.$queryRaw `SELECT 1`;
        res.status(200).json({ ready: true });
    }
    catch (error) {
        res.status(503).json({ ready: false });
    }
});
router.get('/live', (_req, res) => {
    res.status(200).json({ alive: true });
});
export default router;
//# sourceMappingURL=health.js.map