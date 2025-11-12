import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { enqueueWebhookProcessing } from '../config/queues.js';
import { resolveTenantFromPhoneNumberId } from '../utils/tenantHelpers.js';
import { log } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/webhook
 * Webhook verification endpoint for Meta
 */
router.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  log.info('Webhook verification attempt', { mode });

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    log.info('✅ Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    log.error('❌ Webhook verification failed - invalid token');
    res.sendStatus(403);
  }
});

/**
 * POST /api/webhook
 * Receive webhook events from Meta
 * Implements persist-first pattern: save raw event → queue → process
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Parse body (it's raw from middleware)
    const body = typeof req.body === 'string' 
      ? JSON.parse(req.body) 
      : req.body;

    log.info('📨 Webhook received', { 
      object: body.object,
      entries: body.entry?.length 
    });

    // Verify webhook signature (optional but recommended)
    // const signature = req.headers['x-hub-signature-256'];
    // if (!verifySignature(req.body, signature)) {
    //   return res.sendStatus(403);
    // }

    // Quick validation
    if (body.object !== 'whatsapp_business_account') {
      log.warn('Unknown webhook object type', { object: body.object });
      return res.sendStatus(400);
    }

    // PERSIST-FIRST: Save raw webhook event immediately
    // This ensures we never lose data even if processing fails
    const promises = body.entry?.map(async (entry: any) => {
      for (const change of entry.changes || []) {
        // Extract phone number ID from the webhook
        const phoneNumberId = change.value?.metadata?.phone_number_id;
        
        if (!phoneNumberId) {
          log.warn('No phone_number_id in webhook change');
          continue;
        }

        // Resolve tenant (optional at this stage)
        const tenant = await resolveTenantFromPhoneNumberId(phoneNumberId);
        
        // Save raw webhook event
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

        // Enqueue for processing
        await enqueueWebhookProcessing(rawEvent.id, tenant ? 1 : 0);
        
        log.info('📬 Webhook processing job enqueued', { 
          eventId: rawEvent.id 
        });
      }
    });

    await Promise.all(promises || []);

    // Respond quickly to Meta (within 20 seconds)
    res.sendStatus(200);

  } catch (error: any) {
    log.error('❌ Webhook handling error', { 
      error: error.message,
      stack: error.stack 
    });

    // Still respond 200 to Meta to avoid retries for bad data
    res.sendStatus(200);
  }
});

/**
 * Verify webhook signature from Meta
 * (Optional but recommended for production)
 */
function verifySignature(payload: Buffer | string, signature: string | string[] | undefined): boolean {
  if (!signature || Array.isArray(signature)) {
    return false;
  }

  const APP_SECRET = process.env.META_APP_SECRET;
  if (!APP_SECRET) {
    log.warn('META_APP_SECRET not set, skipping signature verification');
    return true; // Skip verification if not configured
  }

  const signatureHash = signature.split('sha256=')[1];
  const expectedHash = crypto
    .createHmac('sha256', APP_SECRET)
    .update(payload)
    .digest('hex');

  return signatureHash === expectedHash;
}

export default router;
