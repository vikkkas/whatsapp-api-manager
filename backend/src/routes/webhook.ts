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
router.get('/', async (req: Request, res: Response) => {
  const mode = Array.isArray(req.query['hub.mode']) ? req.query['hub.mode'][0] : req.query['hub.mode'];
  const token = Array.isArray(req.query['hub.verify_token']) ? req.query['hub.verify_token'][0] : req.query['hub.verify_token'];
  const challenge = Array.isArray(req.query['hub.challenge']) ? req.query['hub.challenge'][0] : req.query['hub.challenge'];

  log.info('Webhook verification attempt', { mode });

  if (mode !== 'subscribe' || typeof token !== 'string' || !challenge) {
    log.error('❌ Webhook verification failed - invalid params');
    return res.sendStatus(403);
  }

  try {
    const tenant = await prisma.tenant.findFirst({
      where: {
        webhookVerifyToken: token,
      },
      select: { id: true },
    });

    if (tenant) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { webhookVerifiedAt: new Date() },
      });
      log.info('✅ Webhook verified successfully for tenant', { tenantId: tenant.id });
      return res.status(200).send(challenge);
    }

    if (process.env.WEBHOOK_VERIFY_TOKEN && token === process.env.WEBHOOK_VERIFY_TOKEN) {
      log.info('✅ Webhook verified using default token');
      return res.status(200).send(challenge);
    }

    log.error('❌ Webhook verification failed - token mismatch');
    return res.sendStatus(403);
  } catch (error) {
    log.error('❌ Webhook verification error', { error });
    return res.sendStatus(500);
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
    let body: any = req.body;

    if (Buffer.isBuffer(req.body)) {
      try {
        body = JSON.parse(req.body.toString('utf8'));
      } catch (error) {
        log.error('Invalid webhook payload buffer', { error });
        return res.sendStatus(400);
      }
    } else if (typeof req.body === 'string') {
      try {
        body = JSON.parse(req.body);
      } catch (error) {
        log.error('Invalid webhook payload string', { error });
        return res.sendStatus(400);
      }
    }

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
        const isTemplateUpdate =
          change.field === 'message_template_status_update' ||
          !!change.value?.message_template_id;

        const phoneNumberId = change.value?.metadata?.phone_number_id;

        if (!phoneNumberId && !isTemplateUpdate) {
          log.warn('No phone_number_id in webhook change');
          continue;
        }

        // Resolve tenant (optional at this stage)
        let tenant = null;
        if (phoneNumberId) {
          tenant = await resolveTenantFromPhoneNumberId(phoneNumberId);
        }
        
        // Save raw webhook event
        const rawEvent = await prisma.rawWebhookEvent.create({
          data: {
            phoneNumberId: phoneNumberId || null,
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
