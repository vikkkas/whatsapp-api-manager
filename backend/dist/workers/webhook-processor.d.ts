import { Worker } from 'bullmq';
interface WebhookJob {
    rawEventId: string;
}
export declare const webhookWorker: Worker<WebhookJob, any, string>;
export default webhookWorker;
//# sourceMappingURL=webhook-processor.d.ts.map