import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { authenticate } from '../middleware/auth.js';
import { enforceTenantIsolation } from '../middleware/tenant.js';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication and tenant isolation to all routes
router.use(authenticate);
router.use(enforceTenantIsolation);

// GET /api/settings - Get tenant settings (WABA credentials, webhook config)
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized - No tenant ID found' 
      });
    }

    // Get WABA credentials
    const wabaCredential = await prisma.wABACredential.findFirst({
      where: { tenantId },
      select: {
        id: true,
        phoneNumberId: true,
        phoneNumber: true,
        displayName: true,
        accessToken: true, // Frontend will mask this
        businessAccountId: true,
        isValid: true,
        lastValidatedAt: true,
        invalidReason: true,
        qualityRating: true,
        messagingLimit: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Get tenant info for webhook settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        webhookUrl: true,
        webhookVerifyToken: true,
        webhookVerifiedAt: true,
      }
    });

    // Construct webhook URL based on environment with tenant overrides
    const webhookUrl = tenant?.webhookUrl || (process.env.WEBHOOK_BASE_URL 
      ? `${process.env.WEBHOOK_BASE_URL}/api/webhook`
      : `http://localhost:3000/api/webhook`);

    const webhookVerifyToken = tenant?.webhookVerifyToken || process.env.WEBHOOK_VERIFY_TOKEN || 'your-verify-token';

    res.json({
      success: true,
      settings: {
        waba: wabaCredential ? {
          phoneNumberId: wabaCredential.phoneNumberId,
          phoneNumber: wabaCredential.phoneNumber,
          displayName: wabaCredential.displayName,
          accessToken: wabaCredential.accessToken,
          businessAccountId: wabaCredential.businessAccountId,
          isValid: wabaCredential.isValid,
          lastValidatedAt: wabaCredential.lastValidatedAt,
          invalidReason: wabaCredential.invalidReason,
          qualityRating: wabaCredential.qualityRating,
          messagingLimit: wabaCredential.messagingLimit,
        } : null,
        webhook: {
          url: webhookUrl,
          verifyToken: webhookVerifyToken,
          verifiedAt: tenant?.webhookVerifiedAt,
          subscribedEvents: [
            'messages',
            'message_status',
            'messaging_postbacks',
            'message_echoes',
            'standby',
            'message_reads'
          ]
        },
        tenant: {
          id: tenant?.id,
          name: tenant?.name,
          slug: tenant?.slug,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/settings - Update tenant settings (WABA credentials)
router.patch('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized - No tenant ID found' 
      });
    }

    const wabaPayload = req.body?.waba 
      ?? ((req.body?.phoneNumberId || req.body?.accessToken || req.body?.businessAccountId) ? req.body : null);
    const webhookPayload = req.body?.webhook ?? {};
    const incomingWebhookUrl = typeof webhookPayload.url === 'string' ? webhookPayload.url : req.body?.webhookUrl;
    const incomingWebhookVerifyToken = typeof webhookPayload.verifyToken === 'string'
      ? webhookPayload.verifyToken
      : req.body?.webhookVerifyToken;
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        webhookUrl: true,
        webhookVerifyToken: true,
        webhookVerifiedAt: true,
      },
    });

    const existingCredential = await prisma.wABACredential.findFirst({
      where: { tenantId }
    });

    let credential = existingCredential ?? null;

    if (wabaPayload) {
      const { phoneNumberId, accessToken, businessAccountId, phoneNumber, displayName } = wabaPayload;

      const resolvedPhoneNumberId = phoneNumberId || existingCredential?.phoneNumberId;
      const resolvedAccessToken = accessToken || existingCredential?.accessToken;
      const resolvedBusinessAccountId = businessAccountId ?? existingCredential?.businessAccountId ?? null;

      // Validate required fields when updating WABA credentials
      if (!resolvedPhoneNumberId || !resolvedAccessToken) {
        return res.status(400).json({
          success: false,
          message: 'Phone Number ID and Access Token are required'
        });
      }

      // Validate credentials by calling Meta Graph API
      let isValid = true;
      let qualityRating = null;
      let messagingLimit = null;
      let actualPhoneNumber = phoneNumber || existingCredential?.phoneNumber || null;
      let actualDisplayName = displayName || existingCredential?.displayName || null;
      let invalidReason = null;

      try {
        const response = await axios.get(
          `https://graph.facebook.com/v18.0/${resolvedPhoneNumberId}`,
          {
            headers: {
              'Authorization': `Bearer ${resolvedAccessToken}`
            },
            params: {
              fields: 'verified_name,display_phone_number,quality_rating,messaging_limit_tier'
            }
          }
        );

        if (response.data) {
          actualPhoneNumber = response.data.display_phone_number || phoneNumber || actualPhoneNumber;
          actualDisplayName = response.data.verified_name || displayName || actualDisplayName;
          qualityRating = response.data.quality_rating || 'UNKNOWN';
          messagingLimit = response.data.messaging_limit_tier || 'UNKNOWN';
        }
      } catch (error: any) {
        isValid = false;
        invalidReason = error.response?.data?.error?.message || 'Failed to validate credentials with Meta API';
        console.error('Meta API validation error:', error.response?.data || error.message);
        
        return res.status(400).json({
          success: false,
          message: 'Invalid WABA credentials',
          error: invalidReason
        });
      }

      if (existingCredential) {
        credential = await prisma.wABACredential.update({
          where: { id: existingCredential.id },
          data: {
            phoneNumberId: resolvedPhoneNumberId,
            phoneNumber: actualPhoneNumber,
            displayName: actualDisplayName,
            accessToken: resolvedAccessToken, // TODO: Encrypt in production
            businessAccountId: resolvedBusinessAccountId,
            isValid,
            lastValidatedAt: new Date(),
            invalidReason,
            qualityRating,
            messagingLimit,
          }
        });
      } else {
        credential = await prisma.wABACredential.create({
          data: {
            tenantId,
            phoneNumberId: resolvedPhoneNumberId,
            phoneNumber: actualPhoneNumber,
            displayName: actualDisplayName,
            accessToken: resolvedAccessToken, // TODO: Encrypt in production
            businessAccountId: resolvedBusinessAccountId,
            isValid,
            lastValidatedAt: new Date(),
            invalidReason,
            qualityRating,
            messagingLimit,
          }
        });
      }
    }

    const tenantUpdates: Record<string, string | Date | null> = {};
    if (typeof incomingWebhookUrl === 'string' && incomingWebhookUrl.trim().length > 0) {
      tenantUpdates.webhookUrl = incomingWebhookUrl.trim();
    }

    if (typeof incomingWebhookVerifyToken === 'string' && incomingWebhookVerifyToken.trim().length > 0) {
      tenantUpdates.webhookVerifyToken = incomingWebhookVerifyToken.trim();
      tenantUpdates.webhookVerifiedAt = null;
    }

    const tenant = Object.keys(tenantUpdates).length > 0
      ? await prisma.tenant.update({
          where: { id: tenantId },
          data: tenantUpdates,
          select: {
            id: true,
            name: true,
            slug: true,
            webhookUrl: true,
            webhookVerifyToken: true,
          }
        })
      : await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            name: true,
            slug: true,
            webhookUrl: true,
            webhookVerifyToken: true,
          }
        });

    const resolvedWebhookUrl = tenant?.webhookUrl || (process.env.WEBHOOK_BASE_URL 
      ? `${process.env.WEBHOOK_BASE_URL}/api/webhook`
      : `http://localhost:3000/api/webhook`);

    const resolvedWebhookVerifyToken = tenant?.webhookVerifyToken || process.env.WEBHOOK_VERIFY_TOKEN || 'your-verify-token';

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        waba: credential ? {
          phoneNumberId: credential.phoneNumberId,
          phoneNumber: credential.phoneNumber,
          displayName: credential.displayName,
          accessToken: credential.accessToken,
          businessAccountId: credential.businessAccountId,
          isValid: credential.isValid,
          lastValidatedAt: credential.lastValidatedAt,
          invalidReason: credential.invalidReason,
          qualityRating: credential.qualityRating,
          messagingLimit: credential.messagingLimit,
        } : null,
        webhook: {
          url: resolvedWebhookUrl,
          verifyToken: resolvedWebhookVerifyToken,
          verifiedAt: tenant?.webhookVerifiedAt || existingTenant?.webhookVerifiedAt || null,
        },
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        } : null,
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
