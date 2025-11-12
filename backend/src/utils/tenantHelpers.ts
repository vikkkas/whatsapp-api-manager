import { Tenant } from '@prisma/client';
import prisma from '../config/prisma.js';
import { log } from './logger.js';

/**
 * Resolve tenant from phone number ID (from Meta webhook)
 */
export async function resolveTenantFromPhoneNumberId(phoneNumberId: string): Promise<Tenant | null> {
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
  } catch (error: any) {
    log.error('Error resolving tenant', { error: error.message, phoneNumberId });
    return null;
  }
}

/**
 * Get WABA credentials for a tenant
 */
export async function getTenantWABACredentials(tenantId: string) {
  try {
    const credentials = await prisma.wABACredential.findMany({
      where: { 
        tenantId,
        isValid: true,
      },
    });

    return credentials;
  } catch (error: any) {
    log.error('Error getting WABA credentials', { error: error.message, tenantId });
    return [];
  }
}

/**
 * Get active WABA credential by phone number ID
 */
export async function getWABACredential(phoneNumberId: string) {
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
  } catch (error: any) {
    log.error('Error getting WABA credential', { error: error.message, phoneNumberId });
    throw error;
  }
}

/**
 * Mark WABA credential as invalid (e.g., token expired)
 */
export async function invalidateWABACredential(phoneNumberId: string, reason: string): Promise<void> {
  try {
    await prisma.wABACredential.update({
      where: { phoneNumberId },
      data: {
        isValid: false,
        invalidReason: reason,
      },
    });

    log.warn('WABA credential invalidated', { phoneNumberId, reason });
  } catch (error: any) {
    log.error('Error invalidating WABA credential', { error: error.message, phoneNumberId });
  }
}

/**
 * Validate tenant status (active, not suspended)
 */
export function validateTenantStatus(tenant: Tenant): boolean {
  if (tenant.status === 'SUSPENDED') {
    throw new Error('Tenant account is suspended');
  }

  if (tenant.status === 'CANCELLED') {
    throw new Error('Tenant account is cancelled');
  }

  return true;
}

/**
 * Check if tenant has exceeded plan limits
 */
export async function checkTenantLimits(tenant: Tenant) {
  const limits = {
    messagesExceeded: false,
    phoneNumbersExceeded: false,
    agentsExceeded: false,
  };

  // Check messages sent this month
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

  // Get plan limits (you can make this more sophisticated)
  const planLimits: Record<string, any> = {
    free: { messages: 1000, phoneNumbers: 1, agents: 2 },
    starter: { messages: 10000, phoneNumbers: 3, agents: 5 },
    pro: { messages: 100000, phoneNumbers: 10, agents: 20 },
    enterprise: { messages: Infinity, phoneNumbers: Infinity, agents: Infinity },
  };

  const limit = planLimits[tenant.plan] || planLimits.free;

  limits.messagesExceeded = messageCount >= limit.messages;

  // Check phone numbers
  const phoneCount = await prisma.wABACredential.count({
    where: { tenantId: tenant.id, isValid: true },
  });
  limits.phoneNumbersExceeded = phoneCount >= limit.phoneNumbers;

  // Check agents
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
