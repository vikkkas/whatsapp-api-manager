import { Router, Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { getQueueStats } from '../config/queues.js';
import redis from '../config/redis.js';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint for monitoring
 */
router.get('/', async (_req: Request, res: Response) => {
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
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'healthy';
  } catch (error) {
    health.status = 'degraded';
    health.services.database = 'unhealthy';
  }

  try {
    // Check Redis
    await redis.ping();
    health.services.redis = 'healthy';
  } catch (error) {
    health.status = 'degraded';
    health.services.redis = 'unhealthy';
  }

  try {
    // Check queues
    const queueStats = await getQueueStats();
    health.services.queues = 'healthy';
    (health as any).queueStats = queueStats;
  } catch (error) {
    health.status = 'degraded';
    health.services.queues = 'unhealthy';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /api/health/ready
 * Readiness probe for Kubernetes
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});

/**
 * GET /api/health/live
 * Liveness probe for Kubernetes
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ alive: true });
});

export default router;
