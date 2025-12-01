import Redis from 'ioredis';
import winston from 'winston';
import type { RedisOptions } from 'ioredis';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// Parse Redis URL to check if it's Redis Cloud (rediss://)
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isRedisCloud = redisUrl.startsWith('rediss://');

const redisConfig: RedisOptions = {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  connectTimeout: 10000, // 10 seconds
  retryStrategy(times: number): number | null {
    if (times > 3) {
      logger.error('Redis connection failed after 3 attempts');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 1000, 3000);
    return delay;
  },
  // Redis Cloud requires TLS
  ...(isRedisCloud && {
    tls: {
      rejectUnauthorized: false, // Required for some Redis Cloud providers
    },
  }),
};

// Create Redis connection
const redis = new Redis(redisUrl, redisConfig);

redis.on('connect', () => {
  logger.info('Redis connected', { isRedisCloud });
});

redis.on('error', (err: Error) => {
  logger.error('Redis connection error', { error: err.message, url: redisUrl.replace(/:[^:@]+@/, ':****@') });
});

redis.on('ready', () => {
  logger.info('Redis ready');
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await redis.quit();
  logger.info('Redis disconnected');
});

export default redis;

// Create a duplicate connection for BullMQ (it requires separate connections)
export const createRedisConnection = (): Redis => {
  return new Redis(redisUrl, redisConfig);
};
