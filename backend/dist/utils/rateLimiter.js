import redis from '../config/redis.js';
import { log } from './logger.js';
export class TokenBucket {
    tenantId;
    maxTokens;
    refillRate;
    key;
    constructor(tenantId, maxTokens, refillRate) {
        this.tenantId = tenantId;
        this.maxTokens = maxTokens;
        this.refillRate = refillRate;
        this.key = `rate-limit:tenant:${tenantId}`;
    }
    async consume(tokens = 1) {
        if (!redis) {
            log.warn('Redis not available, rate limiting disabled', { tenantId: this.tenantId });
            return { allowed: true, remainingTokens: this.maxTokens };
        }
        const now = Date.now();
        try {
            const data = await redis.get(this.key);
            let bucket;
            if (data) {
                bucket = JSON.parse(data);
            }
            else {
                bucket = {
                    tokens: this.maxTokens,
                    lastRefill: now,
                };
            }
            const timePassed = (now - bucket.lastRefill) / 1000;
            const tokensToAdd = timePassed * this.refillRate;
            bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
            bucket.lastRefill = now;
            if (bucket.tokens >= tokens) {
                bucket.tokens -= tokens;
                await redis.setex(this.key, 300, JSON.stringify(bucket));
                return { allowed: true, remainingTokens: Math.floor(bucket.tokens) };
            }
            else {
                const waitTime = Math.ceil((tokens - bucket.tokens) / this.refillRate);
                return {
                    allowed: false,
                    remainingTokens: Math.floor(bucket.tokens),
                    retryAfter: waitTime
                };
            }
        }
        catch (error) {
            log.error('Rate limiter error', { error: error.message, tenantId: this.tenantId });
            return { allowed: true, remainingTokens: this.maxTokens };
        }
    }
    async getTokens() {
        if (!redis) {
            return this.maxTokens;
        }
        try {
            const data = await redis.get(this.key);
            if (!data) {
                return this.maxTokens;
            }
            const bucket = JSON.parse(data);
            const now = Date.now();
            const timePassed = (now - bucket.lastRefill) / 1000;
            const tokensToAdd = timePassed * this.refillRate;
            return Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
        }
        catch (error) {
            log.error('Error getting tokens', { error: error.message });
            return this.maxTokens;
        }
    }
    async reset() {
        if (redis) {
            await redis.del(this.key);
        }
    }
}
export async function getTenantRateLimiter(tenant) {
    const maxTokens = tenant.messagesPerMinute || 60;
    const refillRate = maxTokens / 60;
    return new TokenBucket(tenant.id, maxTokens, refillRate);
}
export async function checkGlobalRateLimit(identifier) {
    if (!redis) {
        return { allowed: true, remaining: 100, resetAt: 60 };
    }
    const key = `global-rate-limit:${identifier}`;
    const limit = 100;
    const window = 60;
    try {
        const current = await redis.incr(key);
        if (current === 1) {
            await redis.expire(key, window);
        }
        return {
            allowed: current <= limit,
            remaining: Math.max(0, limit - current),
            resetAt: await redis.ttl(key),
        };
    }
    catch (error) {
        log.error('Global rate limit error', { error: error.message });
        return { allowed: true, remaining: limit, resetAt: window };
    }
}
export default {
    TokenBucket,
    getTenantRateLimiter,
    checkGlobalRateLimit,
};
//# sourceMappingURL=rateLimiter.js.map