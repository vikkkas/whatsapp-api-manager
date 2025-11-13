import { Worker } from 'bullmq';
interface MessageSendJob {
    messageId: string;
    tenantId: string;
}
export declare const messageSendWorker: Worker<MessageSendJob, any, string>;
export default messageSendWorker;
//# sourceMappingURL=message-sender.d.ts.map