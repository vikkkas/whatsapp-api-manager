import Queue from 'bull';
import { env } from '../config/env.js';
import prisma from '../config/prisma.js';
import { log } from '../utils/logger.js';
import { getMetaAPIForTenant } from '../services/metaAPI.js';
import { normalizePhoneNumber } from '../utils/phone.js';

// Create Bull queue for campaign execution
export const campaignQueue = new Queue('campaign-execution', {
  redis: {
    host: env.REDIS_HOST || 'localhost',
    port: parseInt(env.REDIS_PORT || '6379'),
    password: env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
  },
});

// Process campaign execution jobs
campaignQueue.process('execute', async (job) => {
  const { campaignId } = job.data;
  
  log.info('Processing campaign execution', { campaignId, jobId: job.id });

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        contacts: true,
      },
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    if (campaign.contacts.length === 0) {
      throw new Error('No contacts assigned to this campaign');
    }

    // Update campaign status to IN_PROGRESS
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    // Get WABA credentials
    const credential = await prisma.wABACredential.findFirst({
      where: {
        tenantId: campaign.tenantId,
        isValid: true,
      },
    });

    if (!credential) {
      throw new Error('No valid WhatsApp credentials found');
    }

    const metaAPI = await getMetaAPIForTenant(campaign.tenantId);

    let sent = 0;
    let failed = 0;
    const totalContacts = campaign.contacts.length;

    // Process contacts in batches
    for (let i = 0; i < campaign.contacts.length; i++) {
      const contact = campaign.contacts[i];
      
      // Update job progress
      const progress = Math.round(((i + 1) / totalContacts) * 100);
      await job.progress(progress);

      try {
        const normalizedPhone = normalizePhoneNumber(contact.phoneNumber);
        if (!normalizedPhone) {
          failed++;
          continue;
        }

        const metaRecipient = normalizedPhone.startsWith('+')
          ? normalizedPhone.slice(1)
          : normalizedPhone;

        let waMessageId: string;

        // Send based on message type
        if (campaign.messageType === 'TEXT' && campaign.messageText) {
          const result = await metaAPI.sendTextMessage(metaRecipient, campaign.messageText, { preview_url: true });
          waMessageId = result.messageId;
        } else if (campaign.messageType === 'TEMPLATE' && campaign.templateId) {
          const template = await prisma.template.findFirst({
            where: { id: campaign.templateId, tenantId: campaign.tenantId },
          });

          if (!template) {
            failed++;
            continue;
          }

          const result = await metaAPI.sendTemplate(
            metaRecipient,
            template.name,
            template.language
          );
          waMessageId = result.messageId;
        } else if (campaign.messageType === 'INTERACTIVE' && campaign.interactiveData) {
          const result = await metaAPI.sendInteractiveMessage(
            metaRecipient,
            campaign.interactiveData as any
          );
          waMessageId = result.messageId;
        } else {
          failed++;
          continue;
        }

        // Create or get conversation
        let conversation = await prisma.conversation.findFirst({
          where: {
            tenantId: campaign.tenantId,
            contactPhone: normalizedPhone,
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              tenantId: campaign.tenantId,
              contactId: contact.id,
              contactPhone: normalizedPhone,
              contactName: contact.name,
              campaignId: campaign.id,
              status: 'OPEN',
            },
          });
        } else if (!conversation.campaignId) {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { campaignId: campaign.id },
          });
        }

        // Save message
        await prisma.message.create({
          data: {
            tenantId: campaign.tenantId,
            conversationId: conversation.id,
            waMessageId,
            direction: 'OUTBOUND',
            from: credential.phoneNumber,
            to: normalizedPhone,
            type: campaign.messageType as any,
            text: campaign.messageText,
            status: 'SENT',
          },
        });

        sent++;

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        log.error('Error sending campaign message', { error: error.message, contactId: contact.id });
        failed++;
      }
    }

    // Update campaign statistics
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        messagesSent: sent,
        messagesFailed: failed,
      },
    });

    log.info('Campaign execution completed', { campaignId, sent, failed });

    return { sent, failed, total: totalContacts };

  } catch (error: any) {
    log.error('Campaign execution failed', { campaignId, error: error.message });
    
    // Update campaign status to FAILED
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'CANCELLED',
      },
    }).catch(() => {});

    throw error;
  }
});

// Queue event handlers
campaignQueue.on('completed', (job, result) => {
  log.info('Campaign job completed', { jobId: job.id, result });
});

campaignQueue.on('failed', (job, error) => {
  log.error('Campaign job failed', { jobId: job?.id, error: error.message });
});

campaignQueue.on('stalled', (job) => {
  log.warn('Campaign job stalled', { jobId: job.id });
});

export default campaignQueue;
