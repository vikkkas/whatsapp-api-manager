import { Tenant } from '@prisma/client';
export declare function resolveTenantFromPhoneNumberId(phoneNumberId: string): Promise<Tenant | null>;
export declare function getTenantWABACredentials(tenantId: string): Promise<{
    tenantId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    phoneNumberId: string;
    phoneNumber: string;
    displayName: string | null;
    accessToken: string;
    businessAccountId: string | null;
    isValid: boolean;
    lastValidatedAt: Date;
    invalidReason: string | null;
    qualityRating: string | null;
    messagingLimit: string | null;
}[]>;
export declare function getWABACredential(phoneNumberId: string): Promise<{
    tenantId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    phoneNumberId: string;
    phoneNumber: string;
    displayName: string | null;
    accessToken: string;
    businessAccountId: string | null;
    isValid: boolean;
    lastValidatedAt: Date;
    invalidReason: string | null;
    qualityRating: string | null;
    messagingLimit: string | null;
}>;
export declare function invalidateWABACredential(phoneNumberId: string, reason: string): Promise<void>;
export declare function validateTenantStatus(tenant: Tenant): boolean;
export declare function checkTenantLimits(tenant: Tenant): Promise<{
    messagesExceeded: boolean;
    phoneNumbersExceeded: boolean;
    agentsExceeded: boolean;
}>;
declare const _default: {
    resolveTenantFromPhoneNumberId: typeof resolveTenantFromPhoneNumberId;
    getTenantWABACredentials: typeof getTenantWABACredentials;
    getWABACredential: typeof getWABACredential;
    invalidateWABACredential: typeof invalidateWABACredential;
    validateTenantStatus: typeof validateTenantStatus;
    checkTenantLimits: typeof checkTenantLimits;
};
export default _default;
//# sourceMappingURL=tenantHelpers.d.ts.map