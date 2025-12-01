import * as cron from 'node-cron';
import prisma from '../config/prisma.js';
import { log } from '../utils/logger.js';
import { campaignQueue } from '../queues/campaignQueue.js';

/**
 * Campaign Scheduler Service
 * Checks every minute for scheduled campaigns that are ready to execute
 */
export class CampaignScheduler {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the scheduler
   */
  start() {
    if (this.cronJob) {
      log.warn('Campaign scheduler is already running');
      return;
    }

    // Run every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkScheduledCampaigns();
    });

    log.info('✅ Campaign scheduler started (checks every minute)');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      log.info('Campaign scheduler stopped');
    }
  }

  /**
   * Check for campaigns that are scheduled to run now
   */
  private async checkScheduledCampaigns() {
    try {
      const now = new Date();

      // Find campaigns that are scheduled and ready to execute
      const campaigns = await prisma.campaign.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: {
            lte: now,
          },
        },
      });

      if (campaigns.length === 0) {
        return;
      }

      log.info(`Found ${campaigns.length} scheduled campaign(s) ready to execute`);

      // Add each campaign to the queue
      for (const campaign of campaigns) {
        try {
          await campaignQueue.add('execute', {
            campaignId: campaign.id,
          }, {
            jobId: `campaign-${campaign.id}-${Date.now()}`,
          });

          log.info('Campaign added to queue', {
            campaignId: campaign.id,
            name: campaign.name,
            scheduledAt: campaign.scheduledAt,
          });

        } catch (error: any) {
          log.error('Failed to add campaign to queue', {
            campaignId: campaign.id,
            error: error.message,
          });
        }
      }

    } catch (error: any) {
      log.error('Error checking scheduled campaigns', { error: error.message });
    }
  }

  /**
   * Manually trigger a check (useful for testing)
   */
  async triggerCheck() {
    await this.checkScheduledCampaigns();
  }
}

// Create singleton instance
export const campaignScheduler = new CampaignScheduler();

export default campaignScheduler;
