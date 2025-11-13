import { Queue, QueueOptions } from 'bullmq';
import { createRedisConnection } from './redis.js';
import { log } from '../utils/logger.js';
import { WebhookProcessorJobData, MessageSendJobData, CampaignJobData } from '../types/index.js';

// Create Redis connection for BullMQ
const connection = createRedisConnection();

// ============================================
// QUEUE DEFINITIONS
// ============================================

const defaultQueueOptions: Partial<QueueOptions> = {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600 * 24 * 7, // 7 days
      count: 10000,
    },
    removeOnFail: {
      age: 3600 * 24 * 30, // 30 days
    },
  },
};

/**
 * Webhook Processor Queue
 * Processes raw webhook events from Meta
 */
export const webhookQueue = new Queue<WebhookProcessorJobData>(
  'webhook-processor',
  {
    connection,
    defaultJobOptions: defaultQueueOptions.defaultJobOptions
  } as any
);

/**
 * Message Send Queue
 * Sends outbound messages to Meta API
 */
export const messageSendQueue = new Queue<MessageSendJobData>('message-send', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600 * 24 * 7,
      count: 10000,
    },
    removeOnFail: {
      age: 3600 * 24 * 30,
    },
  },
});

/**
 * Campaign Queue
 * Processes campaign batches (future feature)
 */
export const campaignQueue = new Queue<CampaignJobData>('campaign-processor', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: {
      age: 3600 * 24 * 30,
      count: 5000,
    },
  },
});

// ============================================
// QUEUE EVENTS LOGGING
// ============================================

webhookQueue.on('error', (err: Error) => {
  log.error('Webhook queue error', { error: err.message });
});

messageSendQueue.on('error', (err: Error) => {
  log.error('Message send queue error', { error: err.message });
});

campaignQueue.on('error', (err: Error) => {
  log.error('Campaign queue error', { error: err.message });
});

// ============================================
// QUEUE HELPERS
// ============================================

/**
 * Add webhook processing job
 */
export async function enqueueWebhookProcessing(
  rawEventId: string,
  priority: number = 0
) {
  return await webhookQueue.add(
    'process-webhook' as any,
    { rawEventId },
    {
      priority,
      jobId: `webhook-${rawEventId}`, // Prevent duplicates
    }
  );
}

/**
 * Add message send job with tenant-aware rate limiting
 */
export async function enqueueMessageSend(
  messageId: string,
  tenantId: string,
  options: { priority?: number; delay?: number } = {}
) {
  return await messageSendQueue.add(
    'send-message',
    { messageId, tenantId },
    {
      jobId: `message-${messageId}`,
      priority: options.priority || 0,
      delay: options.delay || 0,
    }
  );
}

/**
 * Get queue stats for monitoring
 */
export async function getQueueStats() {
  const [webhookCounts, messageCounts, campaignCounts] = await Promise.all([
    webhookQueue.getJobCounts(),
    messageSendQueue.getJobCounts(),
    campaignQueue.getJobCounts(),
  ]);

  return {
    webhook: webhookCounts,
    messageSend: messageCounts,
    campaign: campaignCounts,
  };
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await webhookQueue.close();
  await messageSendQueue.close();
  await campaignQueue.close();
  log.info('Queues closed');
});

export default {
  webhookQueue,
  messageSendQueue,
  campaignQueue,
  enqueueWebhookProcessing,
  enqueueMessageSend,
  getQueueStats,
};
