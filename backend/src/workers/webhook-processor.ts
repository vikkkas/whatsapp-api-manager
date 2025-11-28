import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import prisma from '../config/prisma.js';
import { resolveTenantFromPhoneNumberId } from '../utils/tenantHelpers.js';
import { log } from '../utils/logger.js';
import { normalizePhoneNumber } from '../utils/phone.js';
import { publishWebSocketEvent } from '../services/pubsub.js';

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
      const isTemplateUpdate =
        payload.field === 'message_template_status_update' ||
        payload.value?.event === 'template_status_update' ||
        !!payload.value?.message_template_id;

      if (isTemplateUpdate) {
        const tenantId = await processTemplateStatusUpdate(payload.value);
        await prisma.rawWebhookEvent.update({
          where: { id: rawEventId },
          data: {
            tenantId: tenantId || rawEvent.tenantId,
            status: 'PROCESSED',
            processedAt: new Date(),
          },
        });
        log.info('Template status update processed', { rawEventId });
        return;
      }

      const phoneNumberId = payload.value?.metadata?.phone_number_id;
      const accountPhoneNumber = normalizePhoneNumber(
        payload.value?.metadata?.display_phone_number
      );

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
        await processInboundMessage(
          message,
          tenantId,
          accountPhoneNumber || normalizePhoneNumber(phoneNumberId) || phoneNumberId
        );
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
  accountPhone: string
) {
  const waMessageId = messageData.id;
  const normalizedFrom = normalizePhoneNumber(messageData.from);
  if (!normalizedFrom) {
    log.warn('Unable to normalize sender number', { from: messageData.from });
    return;
  }
  const timestamp = new Date(parseInt(messageData.timestamp) * 1000);

  log.info('Processing inbound message', { waMessageId, from: normalizedFrom });

  // Check for duplicate (idempotency)
  const existing = await prisma.message.findUnique({
    where: { waMessageId },
  });

  if (existing) {
    log.warn('Duplicate message, skipping', { waMessageId });
    return;
  }

  // Get or create conversation
  const profileName = messageData.profile?.name?.trim();

  const contact = await prisma.contact.upsert({
    where: {
      tenantId_phoneNumber: {
        tenantId,
        phoneNumber: normalizedFrom,
      },
    },
    create: {
      tenantId,
      phoneNumber: normalizedFrom,
      name: profileName || normalizedFrom,
    },
    update: profileName ? { name: profileName } : {},
  });

  // Check if conversation exists
  const existingConversation = await prisma.conversation.findUnique({
    where: {
      tenantId_contactPhone: {
        tenantId,
        contactPhone: normalizedFrom,
      },
    },
  });

  const isNewConversation = !existingConversation;

  let conversation = await prisma.conversation.upsert({
    where: {
      tenantId_contactPhone: {
        tenantId,
        contactPhone: normalizedFrom,
      },
    },
    create: {
      tenantId,
      contactId: contact.id,
      contactPhone: normalizedFrom,
      contactName: profileName || contact.name,
      status: 'OPEN',
      lastMessageAt: timestamp,
    },
    update: {
      contactId: contact.id,
      ...(profileName ? { contactName: profileName } : {}),
      lastMessageAt: timestamp,
      unreadCount: { increment: 1 },
    },
  });

  // Publish new conversation event to Redis
  if (isNewConversation) {
    await publishWebSocketEvent({
      type: 'conversation:new',
      data: { conversation },
    });
  }

  if (profileName && conversation.contactName !== profileName) {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { contactName: profileName },
    });
    await prisma.contact.update({
      where: { id: contact.id },
      data: { name: profileName },
    });
    await publishWebSocketEvent({
      type: 'conversation:updated',
      data: { conversationId: conversation.id, conversation },
    });
  }


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
  const savedMessage = await prisma.message.create({
    data: {
      tenantId,
      conversationId: conversation.id,
      waMessageId,
      direction: 'INBOUND',
      status: 'DELIVERED',
      from: normalizedFrom,
      to: accountPhone || '',
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

  // Publish notification event (includes message data)
  await publishWebSocketEvent({
    type: 'notification:new',
    data: { type: 'message', conversationId: conversation.id, message: savedMessage },
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

async function processTemplateStatusUpdate(value: any) {
  const templateId = value?.message_template_id;
  const templateName = value?.message_template_name;
  const language = value?.language;
  const status = (value?.status || value?.event || '').toString().toUpperCase();
  const reason = value?.reason || value?.rejection_reason || null;

  let template = null;

  if (templateId) {
    template = await prisma.template.findFirst({
      where: { metaTemplateId: templateId },
    });
  }

  if (!template && templateName && language) {
    template = await prisma.template.findFirst({
      where: {
        name: templateName,
        language,
      },
    });
  }

  if (!template) {
    log.warn('Template status update received for unknown template', {
      templateId,
      templateName,
    });
    return null;
  }

  const statusMap: Record<string, any> = {
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    DISABLED: 'DISABLED',
    PENDING: 'PENDING',
  };

  await prisma.template.update({
    where: { id: template.id },
    data: {
      status: statusMap[status] || template.status,
      rejectionReason: reason,
      metaTemplateId: templateId || template.metaTemplateId,
    },
  });

  log.info('Template status updated from webhook', {
    templateId: template.id,
    status: statusMap[status] || template.status,
  });

  return template.tenantId;
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
