import { Tenant } from '@prisma/client';
export declare class TokenBucket {
    private tenantId;
    private maxTokens;
    private refillRate;
    private key;
    constructor(tenantId: string, maxTokens: number, refillRate: number);
    consume(tokens?: number): Promise<{
        allowed: boolean;
        remainingTokens: number;
        retryAfter?: number;
    }>;
    getTokens(): Promise<number>;
    reset(): Promise<void>;
}
export declare function getTenantRateLimiter(tenant: Tenant): Promise<TokenBucket>;
export declare function checkGlobalRateLimit(identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
}>;
declare const _default: {
    TokenBucket: typeof TokenBucket;
    getTenantRateLimiter: typeof getTenantRateLimiter;
    checkGlobalRateLimit: typeof checkGlobalRateLimit;
};
export default _default;
//# sourceMappingURL=rateLimiter.d.ts.map