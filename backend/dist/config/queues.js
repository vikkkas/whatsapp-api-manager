import { Queue } from 'bullmq';
import { createRedisConnection } from './redis.js';
import { log } from '../utils/logger.js';
const connection = createRedisConnection();
const defaultQueueOptions = {
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: {
            age: 3600 * 24 * 7,
            count: 10000,
        },
        removeOnFail: {
            age: 3600 * 24 * 30,
        },
    },
};
export const webhookQueue = new Queue('webhook-processor', {
    connection,
    defaultJobOptions: defaultQueueOptions.defaultJobOptions
});
export const messageSendQueue = new Queue('message-send', {
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
export const campaignQueue = new Queue('campaign-processor', {
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
webhookQueue.on('error', (err) => {
    log.error('Webhook queue error', { error: err.message });
});
messageSendQueue.on('error', (err) => {
    log.error('Message send queue error', { error: err.message });
});
campaignQueue.on('error', (err) => {
    log.error('Campaign queue error', { error: err.message });
});
export async function enqueueWebhookProcessing(rawEventId, priority = 0) {
    return await webhookQueue.add('process-webhook', { rawEventId }, {
        priority,
        jobId: `webhook-${rawEventId}`,
    });
}
export async function enqueueMessageSend(messageId, tenantId, options = {}) {
    return await messageSendQueue.add('send-message', { messageId, tenantId }, {
        jobId: `message-${messageId}`,
        priority: options.priority || 0,
        delay: options.delay || 0,
    });
}
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
//# sourceMappingURL=queues.js.map