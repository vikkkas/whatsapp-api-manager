import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import prisma from '../config/prisma.js';
import { resolveTenantFromPhoneNumberId } from '../utils/tenantHelpers.js';
import { log } from '../utils/logger.js';

const connection = createRedisConnection();

interface WebhookJob {
  rawEventId: string;
}

/**
 * Webhook Processor Worker
 * Processes raw webhook events from Meta
 */
export const webhookWorker = new Worker<WebhookJob>(
  'webhook-processor',
  async (job: Job<WebhookJob>) => {
    const { rawEventId } = job.data;

    log.info('Processing webhook event', { jobId: job.id, rawEventId });

    try {
      // Get raw event
      const rawEvent = await prisma.rawWebhookEvent.findUnique({
        where: { id: rawEventId },
      });

      if (!rawEvent) {
        throw new Error(`Raw webhook event not found: ${rawEventId}`);
      }

      // Mark as processing
      await prisma.rawWebhookEvent.update({
        where: { id: rawEventId },
        data: { status: 'PROCESSING' },
      });

      const payload = rawEvent.payload as any;
      const phoneNumberId = payload.value?.metadata?.phone_number_id;

      if (!phoneNumberId) {
        throw new Error('No phone_number_id in webhook payload');
      }

      // Resolve tenant if not already resolved
      let tenantId = rawEvent.tenantId;
      if (!tenantId) {
        const tenant = await resolveTenantFromPhoneNumberId(phoneNumberId);
        if (!tenant) {
          throw new Error(`No tenant found for phone number ID: ${phoneNumberId}`);
        }
        tenantId = tenant.id;

        // Update raw event with tenant
        await prisma.rawWebhookEvent.update({
          where: { id: rawEventId },
          data: { tenantId: tenant.id },
        });
      }

      // Process messages
      const messages = payload.value?.messages || [];
      const statuses = payload.value?.statuses || [];

      for (const message of messages) {
        await processInboundMessage(message, tenantId, phoneNumberId);
      }

      for (const status of statuses) {
        await processMessageStatus(status, tenantId);
      }

      // Mark as processed
      await prisma.rawWebhookEvent.update({
        where: { id: rawEventId },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      log.info('Webhook event processed successfully', { rawEventId });

    } catch (error: any) {
      log.error('Webhook processing error', {
        error: error.message,
        rawEventId,
        stack: error.stack,
      });

      // Update event as failed
      await prisma.rawWebhookEvent.update({
        where: { id: rawEventId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          retryCount: { increment: 1 },
        },
      });

      throw error; // Re-throw for BullMQ retry
    }
  },
  {
    connection,
    concurrency: 10, // Process 10 jobs concurrently
    limiter: {
      max: 100,
      duration: 1000, // 100 jobs per second
    },
  }
);

/**
 * Process inbound message from WhatsApp
 */
async function processInboundMessage(
  messageData: any,
  tenantId: string,
  phoneNumberId: string
) {
  const waMessageId = messageData.id;
  const from = messageData.from;
  const timestamp = new Date(parseInt(messageData.timestamp) * 1000);

  log.info('Processing inbound message', { waMessageId, from });

  // Check for duplicate (idempotency)
  const existing = await prisma.message.findUnique({
    where: { waMessageId },
  });

  if (existing) {
    log.warn('Duplicate message, skipping', { waMessageId });
    return;
  }

  // Get or create conversation
  const conversation = await prisma.conversation.upsert({
    where: {
      tenantId_contactPhone: {
        tenantId,
        contactPhone: from,
      },
    },
    create: {
      tenantId,
      contactPhone: from,
      contactName: messageData.profile?.name || from,
      status: 'OPEN',
      lastMessageAt: timestamp,
    },
    update: {
      lastMessageAt: timestamp,
      unreadCount: { increment: 1 },
    },
  });

  // Determine message type and content
  let messageType: string = 'TEXT';
  let text: string | null = null;
  let mediaType: string | null = null;
  let mediaId: string | null = null;
  let mediaMimeType: string | null = null;
  let mediaCaption: string | null = null;

  if (messageData.text) {
    messageType = 'TEXT';
    text = messageData.text.body;
  } else if (messageData.image) {
    messageType = 'IMAGE';
    text = messageData.image.caption || null;
    mediaType = 'image';
    mediaId = messageData.image.id;
    mediaMimeType = messageData.image.mime_type;
    mediaCaption = messageData.image.caption;
  } else if (messageData.video) {
    messageType = 'VIDEO';
    text = messageData.video.caption || null;
    mediaType = 'video';
    mediaId = messageData.video.id;
    mediaMimeType = messageData.video.mime_type;
    mediaCaption = messageData.video.caption;
  } else if (messageData.audio) {
    messageType = 'AUDIO';
    mediaType = 'audio';
    mediaId = messageData.audio.id;
    mediaMimeType = messageData.audio.mime_type;
  } else if (messageData.document) {
    messageType = 'DOCUMENT';
    text = messageData.document.filename || null;
    mediaType = 'document';
    mediaId = messageData.document.id;
    mediaMimeType = messageData.document.mime_type;
    mediaCaption = messageData.document.caption;
  } else if (messageData.location) {
    messageType = 'LOCATION';
    text = `Location: ${messageData.location.latitude},${messageData.location.longitude}`;
  } else if (messageData.contacts) {
    messageType = 'CONTACT';
    text = 'Contact shared';
  }

  // Create message
  await prisma.message.create({
    data: {
      tenantId,
      conversationId: conversation.id,
      waMessageId,
      direction: 'INBOUND',
      status: 'DELIVERED',
      from,
      to: phoneNumberId,
      type: messageType as any,
      text,
      mediaType,
      mediaId,
      mediaMimeType,
      mediaCaption,
      timestamp,
      deliveredAt: timestamp,
    },
  });

  log.info('Inbound message saved', { waMessageId, conversationId: conversation.id });
}

/**
 * Process message status update from WhatsApp
 */
async function processMessageStatus(statusData: any, tenantId: string) {
  const waMessageId = statusData.id;
  const status = statusData.status; // sent, delivered, read, failed

  log.info('Processing message status', { waMessageId, status });

  // Find message by waMessageId
  const message = await prisma.message.findUnique({
    where: { waMessageId },
  });

  if (!message) {
    log.warn('Message not found for status update', { waMessageId });
    return;
  }

  // Map WhatsApp status to our status
  const statusMap: Record<string, any> = {
    sent: 'SENT',
    delivered: 'DELIVERED',
    read: 'READ',
    failed: 'FAILED',
  };

  const updateData: any = {
    status: statusMap[status] || 'SENT',
  };

  if (status === 'delivered') {
    updateData.deliveredAt = new Date(parseInt(statusData.timestamp) * 1000);
  } else if (status === 'read') {
    updateData.readAt = new Date(parseInt(statusData.timestamp) * 1000);
  } else if (status === 'failed') {
    updateData.failedAt = new Date(parseInt(statusData.timestamp) * 1000);
    updateData.errorMessage = statusData.errors?.[0]?.title || 'Unknown error';
  }

  await prisma.message.update({
    where: { id: message.id },
    data: updateData,
  });

  log.info('Message status updated', { waMessageId, status: updateData.status });
}

// Worker event listeners
webhookWorker.on('completed', (job) => {
  log.info('Webhook job completed', { jobId: job.id });
});

webhookWorker.on('failed', (job, err) => {
  log.error('Webhook job failed', {
    jobId: job?.id,
    error: err.message,
    attempts: job?.attemptsMade,
  });
});

webhookWorker.on('error', (err) => {
  log.error('Webhook worker error', { error: err.message });
});

export default webhookWorker;
