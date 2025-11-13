import Redis from 'ioredis';
import winston from 'winston';
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
});
const redisConfig = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10000,
    retryStrategy(times) {
        if (times > 3) {
            logger.error('Redis connection failed after 3 attempts');
            return null;
        }
        const delay = Math.min(times * 1000, 3000);
        return delay;
    },
};
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', redisConfig);
redis.on('connect', () => {
    logger.info('Redis connected');
});
redis.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
});
redis.on('ready', () => {
    logger.info('Redis ready');
});
process.on('beforeExit', async () => {
    await redis.quit();
    logger.info('Redis disconnected');
});
export default redis;
export const createRedisConnection = () => {
    return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', redisConfig);
};
//# sourceMappingURL=redis.js.map