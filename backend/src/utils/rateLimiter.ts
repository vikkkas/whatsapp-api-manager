import { Tenant } from '@prisma/client';
import redis from '../config/redis.js';
import { log } from './logger.js';

/**
 * Token Bucket Rate Limiter
 * Implements per-tenant rate limiting for WhatsApp messages
 */
export class TokenBucket {
  private tenantId: string;
  private maxTokens: number;
  private refillRate: number;
  private key: string;

  constructor(tenantId: string, maxTokens: number, refillRate: number) {
    this.tenantId = tenantId;
    this.maxTokens = maxTokens; // Maximum messages per minute
    this.refillRate = refillRate; // Tokens added per second
    this.key = `rate-limit:tenant:${tenantId}`;
  }

  /**
   * Try to consume a token (send a message)
   * Returns true if allowed, false if rate limit exceeded
   */
  async consume(tokens: number = 1): Promise<{ allowed: boolean; remainingTokens: number; retryAfter?: number }> {
    // If Redis is not available, allow all requests (fail open)
    if (!redis) {
      log.warn('Redis not available, rate limiting disabled', { tenantId: this.tenantId });
      return { allowed: true, remainingTokens: this.maxTokens };
    }

    const now = Date.now();
    
    try {
      // Get current bucket state
      const data = await redis.get(this.key);
      
      let bucket: { tokens: number; lastRefill: number };
      if (data) {
        bucket = JSON.parse(data);
      } else {
        bucket = {
          tokens: this.maxTokens,
          lastRefill: now,
        };
      }

      // Calculate tokens to add based on time passed
      const timePassed = (now - bucket.lastRefill) / 1000; // in seconds
      const tokensToAdd = timePassed * this.refillRate;
      
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;

      // Check if we have enough tokens
      if (bucket.tokens >= tokens) {
        bucket.tokens -= tokens;
        
        // Save updated bucket with 5-minute expiry
        await redis.setex(this.key, 300, JSON.stringify(bucket));
        
        return { allowed: true, remainingTokens: Math.floor(bucket.tokens) };
      } else {
        // Not enough tokens, calculate wait time
        const waitTime = Math.ceil((tokens - bucket.tokens) / this.refillRate);
        
        return { 
          allowed: false, 
          remainingTokens: Math.floor(bucket.tokens),
          retryAfter: waitTime 
        };
      }
    } catch (error: any) {
      log.error('Rate limiter error', { error: error.message, tenantId: this.tenantId });
      
      // Fail open - allow the request if Redis is down
      return { allowed: true, remainingTokens: this.maxTokens };
    }
  }

  /**
   * Get current tokens available
   */
  async getTokens(): Promise<number> {
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
    } catch (error: any) {
      log.error('Error getting tokens', { error: error.message });
      return this.maxTokens;
    }
  }

  /**
   * Reset the bucket (for testing or admin override)
   */
  async reset(): Promise<void> {
    if (redis) {
      await redis.del(this.key);
    }
  }
}

/**
 * Create rate limiter for a tenant
 */
export async function getTenantRateLimiter(tenant: Tenant): Promise<TokenBucket> {
  // Default: 60 messages per minute = 1 message per second
  const maxTokens = tenant.messagesPerMinute || 60;
  const refillRate = maxTokens / 60; // tokens per second

  return new TokenBucket(tenant.id, maxTokens, refillRate);
}

/**
 * Global rate limiter (across all tenants)
 * Prevents abuse of the API gateway itself
 */
export async function checkGlobalRateLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (!redis) {
    return { allowed: true, remaining: 100, resetAt: 60 };
  }

  const key = `global-rate-limit:${identifier}`;
  const limit = 100; // requests per minute
  const window = 60; // seconds

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
  } catch (error: any) {
    log.error('Global rate limit error', { error: error.message });
    return { allowed: true, remaining: limit, resetAt: window };
  }
}

export default {
  TokenBucket,
  getTenantRateLimiter,
  checkGlobalRateLimit,
};
