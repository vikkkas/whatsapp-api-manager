import { Queue } from 'bullmq';
import { WebhookProcessorJobData, MessageSendJobData, CampaignJobData } from '../types/index.js';
export declare const webhookQueue: Queue<WebhookProcessorJobData, any, string, WebhookProcessorJobData, any, string>;
export declare const messageSendQueue: Queue<MessageSendJobData, any, string, MessageSendJobData, any, string>;
export declare const campaignQueue: Queue<CampaignJobData, any, string, CampaignJobData, any, string>;
export declare function enqueueWebhookProcessing(rawEventId: string, priority?: number): Promise<import("bullmq").Job<WebhookProcessorJobData, any, string>>;
export declare function enqueueMessageSend(messageId: string, tenantId: string, options?: {
    priority?: number;
    delay?: number;
}): Promise<import("bullmq").Job<MessageSendJobData, any, string>>;
export declare function getQueueStats(): Promise<{
    webhook: {
        [index: string]: number;
    };
    messageSend: {
        [index: string]: number;
    };
    campaign: {
        [index: string]: number;
    };
}>;
declare const _default: {
    webhookQueue: Queue<WebhookProcessorJobData, any, string, WebhookProcessorJobData, any, string>;
    messageSendQueue: Queue<MessageSendJobData, any, string, MessageSendJobData, any, string>;
    campaignQueue: Queue<CampaignJobData, any, string, CampaignJobData, any, string>;
    enqueueWebhookProcessing: typeof enqueueWebhookProcessing;
    enqueueMessageSend: typeof enqueueMessageSend;
    getQueueStats: typeof getQueueStats;
};
export default _default;
//# sourceMappingURL=queues.d.ts.map