import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { authenticate } from '../middleware/auth.js';
import { enforceTenantIsolation } from '../middleware/tenant.js';
const router = Router();
const prisma = new PrismaClient();
router.use(authenticate);
router.use(enforceTenantIsolation);
router.get('/', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized - No tenant ID found'
            });
        }
        const wabaCredential = await prisma.wABACredential.findFirst({
            where: { tenantId },
            select: {
                id: true,
                phoneNumberId: true,
                phoneNumber: true,
                displayName: true,
                accessToken: true,
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
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                id: true,
                name: true,
                slug: true,
            }
        });
        const webhookUrl = process.env.WEBHOOK_BASE_URL
            ? `${process.env.WEBHOOK_BASE_URL}/api/webhook`
            : `http://localhost:3000/api/webhook`;
        const webhookVerifyToken = process.env.WEBHOOK_VERIFY_TOKEN || 'your-verify-token';
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
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.patch('/', async (req, res) => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized - No tenant ID found'
            });
        }
        const { phoneNumberId, accessToken, businessAccountId, phoneNumber, displayName } = req.body;
        if (!phoneNumberId || !accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Phone Number ID and Access Token are required'
            });
        }
        let isValid = true;
        let qualityRating = null;
        let messagingLimit = null;
        let actualPhoneNumber = phoneNumber;
        let actualDisplayName = displayName;
        let invalidReason = null;
        try {
            const response = await axios.get(`https://graph.facebook.com/v18.0/${phoneNumberId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                params: {
                    fields: 'verified_name,display_phone_number,quality_rating,messaging_limit_tier'
                }
            });
            if (response.data) {
                actualPhoneNumber = response.data.display_phone_number || phoneNumber;
                actualDisplayName = response.data.verified_name || displayName;
                qualityRating = response.data.quality_rating || 'UNKNOWN';
                messagingLimit = response.data.messaging_limit_tier || 'UNKNOWN';
            }
        }
        catch (error) {
            isValid = false;
            invalidReason = error.response?.data?.error?.message || 'Failed to validate credentials with Meta API';
            console.error('Meta API validation error:', error.response?.data || error.message);
            return res.status(400).json({
                success: false,
                message: 'Invalid WABA credentials',
                error: invalidReason
            });
        }
        const existingCredential = await prisma.wABACredential.findFirst({
            where: { tenantId }
        });
        let credential;
        if (existingCredential) {
            credential = await prisma.wABACredential.update({
                where: { id: existingCredential.id },
                data: {
                    phoneNumberId,
                    phoneNumber: actualPhoneNumber,
                    displayName: actualDisplayName,
                    accessToken,
                    businessAccountId,
                    isValid,
                    lastValidatedAt: new Date(),
                    invalidReason,
                    qualityRating,
                    messagingLimit,
                }
            });
        }
        else {
            credential = await prisma.wABACredential.create({
                data: {
                    tenantId,
                    phoneNumberId,
                    phoneNumber: actualPhoneNumber,
                    displayName: actualDisplayName,
                    accessToken,
                    businessAccountId,
                    isValid,
                    lastValidatedAt: new Date(),
                    invalidReason,
                    qualityRating,
                    messagingLimit,
                }
            });
        }
        res.json({
            success: true,
            message: 'Settings updated successfully',
            settings: {
                waba: {
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
                }
            }
        });
    }
    catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
export default router;
//# sourceMappingURL=settings.js.map