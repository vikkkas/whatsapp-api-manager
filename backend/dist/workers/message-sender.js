import { Worker } from 'bullmq';
import axios from 'axios';
import { createRedisConnection } from '../config/redis.js';
import prisma from '../config/prisma.js';
import { getWABACredential, invalidateWABACredential } from '../utils/tenantHelpers.js';
import { getTenantRateLimiter } from '../utils/rateLimiter.js';
import { decrypt } from '../utils/encryption.js';
import { log } from '../utils/logger.js';
const connection = createRedisConnection();
export const messageSendWorker = new Worker('message-send', async (job) => {
    const { messageId, tenantId } = job.data;
    log.info('Sending message', { jobId: job.id, messageId, tenantId });
    try {
        const message = await prisma.message.findUnique({
            where: { id: messageId },
            include: { tenant: true },
        });
        if (!message) {
            throw new Error(`Message not found: ${messageId}`);
        }
        if (message.status !== 'PENDING') {
            log.warn('Message already processed', { messageId, status: message.status });
            return;
        }
        const rateLimiter = await getTenantRateLimiter(message.tenant);
        const rateLimitResult = await rateLimiter.consume(1);
        if (!rateLimitResult.allowed) {
            log.warn('Rate limit exceeded, delaying message', {
                messageId,
                tenantId,
                retryAfter: rateLimitResult.retryAfter,
            });
            throw new Error(`Rate limit exceeded. Retry after ${rateLimitResult.retryAfter}s`);
        }
        const credential = await getWABACredential(message.to);
        const accessToken = decrypt(credential.accessToken);
        const payload = await buildMessagePayload(message);
        const apiUrl = `${process.env.META_API_BASE_URL}/${process.env.META_API_VERSION}/${message.to}/messages`;
        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        const waMessageId = response.data.messages[0].id;
        await prisma.message.update({
            where: { id: messageId },
            data: {
                status: 'SENT',
                waMessageId,
            },
        });
        log.info('Message sent successfully', {
            messageId,
            waMessageId,
            to: message.from,
        });
    }
    catch (error) {
        log.error('Message send error', {
            error: error.message,
            messageId,
            tenantId,
            stack: error.stack,
        });
        if (error.response?.status === 401 || error.response?.status === 403) {
            log.error('WABA token invalid, marking credential as invalid', {
                phoneNumberId: error.response?.config?.url,
            });
            const phoneNumberId = error.response?.config?.url?.match(/\/(\d+)\//)?.[1];
            if (phoneNumberId) {
                await invalidateWABACredential(phoneNumberId, `Token invalid: ${error.response?.data?.error?.message || 'Unauthorized'}`);
            }
        }
        await prisma.message.update({
            where: { id: messageId },
            data: {
                status: 'FAILED',
                failedAt: new Date(),
                errorMessage: error.response?.data?.error?.message || error.message,
            },
        });
        throw error;
    }
}, {
    connection,
    concurrency: 5,
    limiter: {
        max: 80,
        duration: 1000,
    },
});
async function buildMessagePayload(message) {
    const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.from,
    };
    switch (message.type) {
        case 'TEXT':
            payload.type = 'text';
            payload.text = { body: message.text };
            break;
        case 'IMAGE':
            payload.type = 'image';
            payload.image = {
                link: message.mediaUrl,
                caption: message.mediaCaption,
            };
            break;
        case 'VIDEO':
            payload.type = 'video';
            payload.video = {
                link: message.mediaUrl,
                caption: message.mediaCaption,
            };
            break;
        case 'AUDIO':
            payload.type = 'audio';
            payload.audio = {
                link: message.mediaUrl,
            };
            break;
        case 'DOCUMENT':
            payload.type = 'document';
            payload.document = {
                link: message.mediaUrl,
                filename: message.mediaFilename,
                caption: message.mediaCaption,
            };
            break;
        case 'TEMPLATE':
            payload.type = 'template';
            payload.template = {
                name: message.templateName,
                language: { code: 'en_US' },
                components: message.templateParams
                    ? [
                        {
                            type: 'body',
                            parameters: message.templateParams.map((param) => ({
                                type: 'text',
                                text: param,
                            })),
                        },
                    ]
                    : [],
            };
            break;
        default:
            throw new Error(`Unsupported message type: ${message.type}`);
    }
    return payload;
}
messageSendWorker.on('completed', (job) => {
    log.info('Message send job completed', { jobId: job.id });
});
messageSendWorker.on('failed', (job, err) => {
    log.error('Message send job failed', {
        jobId: job?.id,
        error: err.message,
        attempts: job?.attemptsMade,
    });
});
messageSendWorker.on('error', (err) => {
    log.error('Message send worker error', { error: err.message });
});
export default messageSendWorker;
//# sourceMappingURL=message-sender.js.map