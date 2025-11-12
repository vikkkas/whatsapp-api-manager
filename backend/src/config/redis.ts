import Redis from 'ioredis';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

const redisConfig: Redis.RedisOptions = {
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
};

// Create Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', redisConfig);

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err: Error) => {
  logger.error('Redis connection error', { error: err.message });
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
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', redisConfig);
};
