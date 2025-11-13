import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { enqueueWebhookProcessing } from '../config/queues.js';
import { resolveTenantFromPhoneNumberId } from '../utils/tenantHelpers.js';
import { log } from '../utils/logger.js';
const router = Router();
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    log.info('Webhook verification attempt', { mode });
    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        log.info('✅ Webhook verified successfully');
        res.status(200).send(challenge);
    }
    else {
        log.error('❌ Webhook verification failed - invalid token');
        res.sendStatus(403);
    }
});
router.post('/', async (req, res) => {
    try {
        const body = typeof req.body === 'string'
            ? JSON.parse(req.body)
            : req.body;
        log.info('📨 Webhook received', {
            object: body.object,
            entries: body.entry?.length
        });
        if (body.object !== 'whatsapp_business_account') {
            log.warn('Unknown webhook object type', { object: body.object });
            return res.sendStatus(400);
        }
        const promises = body.entry?.map(async (entry) => {
            for (const change of entry.changes || []) {
                const phoneNumberId = change.value?.metadata?.phone_number_id;
                if (!phoneNumberId) {
                    log.warn('No phone_number_id in webhook change');
                    continue;
                }
                const tenant = await resolveTenantFromPhoneNumberId(phoneNumberId);
                const rawEvent = await prisma.rawWebhookEvent.create({
                    data: {
                        phoneNumberId,
                        tenantId: tenant?.id || null,
                        payload: change,
                        status: 'PENDING',
                    },
                });
                log.info('💾 Raw webhook event saved', {
                    eventId: rawEvent.id,
                    phoneNumberId,
                    tenantId: tenant?.id
                });
                await enqueueWebhookProcessing(rawEvent.id, tenant ? 1 : 0);
                log.info('📬 Webhook processing job enqueued', {
                    eventId: rawEvent.id
                });
            }
        });
        await Promise.all(promises || []);
        res.sendStatus(200);
    }
    catch (error) {
        log.error('❌ Webhook handling error', {
            error: error.message,
            stack: error.stack
        });
        res.sendStatus(200);
    }
});
function verifySignature(payload, signature) {
    if (!signature || Array.isArray(signature)) {
        return false;
    }
    const APP_SECRET = process.env.META_APP_SECRET;
    if (!APP_SECRET) {
        log.warn('META_APP_SECRET not set, skipping signature verification');
        return true;
    }
    const signatureHash = signature.split('sha256=')[1];
    const expectedHash = crypto
        .createHmac('sha256', APP_SECRET)
        .update(payload)
        .digest('hex');
    return signatureHash === expectedHash;
}
export default router;
//# sourceMappingURL=webhook.js.map