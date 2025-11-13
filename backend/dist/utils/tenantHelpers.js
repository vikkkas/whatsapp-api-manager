import prisma from '../config/prisma.js';
import { log } from './logger.js';
export async function resolveTenantFromPhoneNumberId(phoneNumberId) {
    try {
        const credential = await prisma.wABACredential.findUnique({
            where: { phoneNumberId },
            include: { tenant: true },
        });
        if (!credential) {
            log.warn('No tenant found for phone number ID', { phoneNumberId });
            return null;
        }
        if (!credential.isValid) {
            log.warn('WABA credential is invalid', {
                phoneNumberId,
                tenantId: credential.tenantId,
                reason: credential.invalidReason
            });
        }
        return credential.tenant;
    }
    catch (error) {
        log.error('Error resolving tenant', { error: error.message, phoneNumberId });
        return null;
    }
}
export async function getTenantWABACredentials(tenantId) {
    try {
        const credentials = await prisma.wABACredential.findMany({
            where: {
                tenantId,
                isValid: true,
            },
        });
        return credentials;
    }
    catch (error) {
        log.error('Error getting WABA credentials', { error: error.message, tenantId });
        return [];
    }
}
export async function getWABACredential(phoneNumberId) {
    try {
        const credential = await prisma.wABACredential.findUnique({
            where: { phoneNumberId },
        });
        if (!credential) {
            throw new Error(`WABA credential not found for phone number ID: ${phoneNumberId}`);
        }
        if (!credential.isValid) {
            throw new Error(`WABA credential is invalid: ${credential.invalidReason || 'Unknown reason'}`);
        }
        return credential;
    }
    catch (error) {
        log.error('Error getting WABA credential', { error: error.message, phoneNumberId });
        throw error;
    }
}
export async function invalidateWABACredential(phoneNumberId, reason) {
    try {
        await prisma.wABACredential.update({
            where: { phoneNumberId },
            data: {
                isValid: false,
                invalidReason: reason,
            },
        });
        log.warn('WABA credential invalidated', { phoneNumberId, reason });
    }
    catch (error) {
        log.error('Error invalidating WABA credential', { error: error.message, phoneNumberId });
    }
}
export function validateTenantStatus(tenant) {
    if (tenant.status === 'SUSPENDED') {
        throw new Error('Tenant account is suspended');
    }
    if (tenant.status === 'CANCELLED') {
        throw new Error('Tenant account is cancelled');
    }
    return true;
}
export async function checkTenantLimits(tenant) {
    const limits = {
        messagesExceeded: false,
        phoneNumbersExceeded: false,
        agentsExceeded: false,
    };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const messageCount = await prisma.message.count({
        where: {
            tenantId: tenant.id,
            direction: 'OUTBOUND',
            createdAt: {
                gte: startOfMonth,
            },
        },
    });
    const planLimits = {
        free: { messages: 1000, phoneNumbers: 1, agents: 2 },
        starter: { messages: 10000, phoneNumbers: 3, agents: 5 },
        pro: { messages: 100000, phoneNumbers: 10, agents: 20 },
        enterprise: { messages: Infinity, phoneNumbers: Infinity, agents: Infinity },
    };
    const limit = planLimits[tenant.plan] || planLimits.free;
    limits.messagesExceeded = messageCount >= limit.messages;
    const phoneCount = await prisma.wABACredential.count({
        where: { tenantId: tenant.id, isValid: true },
    });
    limits.phoneNumbersExceeded = phoneCount >= limit.phoneNumbers;
    const agentCount = await prisma.agent.count({
        where: { tenantId: tenant.id },
    });
    limits.agentsExceeded = agentCount >= limit.agents;
    return limits;
}
export default {
    resolveTenantFromPhoneNumberId,
    getTenantWABACredentials,
    getWABACredential,
    invalidateWABACredential,
    validateTenantStatus,
    checkTenantLimits,
};
//# sourceMappingURL=tenantHelpers.js.map