import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { enforceTenantIsolation } from '../middleware/tenant.js';
import prisma from '../config/prisma.js';
import { log } from '../utils/logger.js';
import { getMetaAPIForTenant } from '../services/metaAPI.js';
import { normalizePhoneNumber } from '../utils/phone.js';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(enforceTenantIsolation);

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  messageType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'TEMPLATE', 'INTERACTIVE']),
  templateId: z.string().optional(),
  messageText: z.string().optional(),
  mediaUrl: z.string().optional(),
  interactiveType: z.enum(['button', 'list', 'product', 'product_list']).optional(),
  interactiveData: z.any().optional(),
  scheduledAt: z.string().datetime().optional(),
  contactIds: z.array(z.string()).optional(),
});

const updateCampaignSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'CANCELLED']).optional(),
  messageType: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'TEMPLATE', 'INTERACTIVE']).optional(),
  templateId: z.string().optional(),
  messageText: z.string().optional(),
  mediaUrl: z.string().optional(),
  interactiveType: z.enum(['button', 'list', 'product', 'product_list']).optional(),
  interactiveData: z.any().optional(),
  scheduledAt: z.string().datetime().optional(),
});

// List campaigns
router.get('/', requirePermission('VIEW_CAMPAIGNS'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (status) {
      where.status = status;
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { contacts: true, conversations: true },
          },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    res.json({
      success: true,
      campaigns,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    log.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns',
    });
  }
});

// Get single campaign
router.get('/:id', requirePermission('VIEW_CAMPAIGNS'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        contacts: {
          select: {
            id: true,
            phoneNumber: true,
            name: true,
            email: true,
          },
        },
        conversations: {
          select: {
            id: true,
            contactPhone: true,
            contactName: true,
            status: true,
            lastMessageAt: true,
          },
          orderBy: { lastMessageAt: 'desc' },
        },
        _count: {
          select: { contacts: true, conversations: true },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    res.json({
      success: true,
      campaign,
    });
  } catch (error: unknown) {
    log.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign',
    });
  }
});

// Create campaign
router.post('/', requirePermission('CREATE_CAMPAIGN'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const data = createCampaignSchema.parse(req.body);

    const campaign = await prisma.campaign.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        messageType: data.messageType,
        templateId: data.templateId,
        messageText: data.messageText,
        mediaUrl: data.mediaUrl,
        interactiveType: data.interactiveType,
        interactiveData: data.interactiveData,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      },
    });

    // If contact IDs provided, assign them to the campaign
    if (data.contactIds && data.contactIds.length > 0) {
      await prisma.contact.updateMany({
        where: {
          id: { in: data.contactIds },
          tenantId,
        },
        data: {
          campaignId: campaign.id,
        },
      });

      // Update total contacts count
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { totalContacts: data.contactIds.length },
      });
    }

    log.info('Campaign created', { campaignId: campaign.id, tenantId });

    res.status(201).json({
      success: true,
      campaign,
    });
  } catch (error: unknown) {
    log.error('Error creating campaign:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
    });
  }
});

// Update campaign
router.patch('/:id', requirePermission('EDIT_CAMPAIGN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const data = updateCampaignSchema.parse(req.body);

    const existing = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        status: data.status,
        messageType: data.messageType,
        templateId: data.templateId,
        messageText: data.messageText,
        mediaUrl: data.mediaUrl,
        interactiveType: data.interactiveType,
        interactiveData: data.interactiveData,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
    });

    log.info('Campaign updated', { campaignId: id, tenantId });

    res.json({
      success: true,
      campaign,
    });
  } catch (error: unknown) {
    log.error('Error updating campaign:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign',
    });
  }
});

// Delete campaign
router.delete('/:id', requirePermission('DELETE_CAMPAIGN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const existing = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    // Remove campaign assignment from contacts
    await prisma.contact.updateMany({
      where: { campaignId: id },
      data: { campaignId: null },
    });

    await prisma.campaign.delete({
      where: { id },
    });

    log.info('Campaign deleted', { campaignId: id, tenantId });

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error: unknown) {
    log.error('Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign',
    });
  }
});

// Add contacts to campaign
router.post('/:id/contacts', requirePermission('EDIT_CAMPAIGN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { contactIds } = req.body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Contact IDs array is required',
      });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    // Update contacts
    await prisma.contact.updateMany({
      where: {
        id: { in: contactIds },
        tenantId,
      },
      data: {
        campaignId: id,
      },
    });

    // Update campaign total contacts count
    const totalContacts = await prisma.contact.count({
      where: { campaignId: id, tenantId },
    });

    await prisma.campaign.update({
      where: { id },
      data: { totalContacts },
    });

    log.info('Contacts added to campaign', { campaignId: id, count: contactIds.length, tenantId });

    res.json({
      success: true,
      message: `${contactIds.length} contacts added to campaign`,
      totalContacts,
    });
  } catch (error: unknown) {
    log.error('Error adding contacts to campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add contacts to campaign',
    });
  }
});

// Remove contacts from campaign
router.delete('/:id/contacts', requirePermission('EDIT_CAMPAIGN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const { contactIds } = req.body;

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Contact IDs array is required',
      });
    }

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    // Remove campaign assignment
    await prisma.contact.updateMany({
      where: {
        id: { in: contactIds },
        campaignId: id,
        tenantId,
      },
      data: {
        campaignId: null,
      },
    });

    // Update campaign total contacts count
    const totalContacts = await prisma.contact.count({
      where: { campaignId: id, tenantId },
    });

    await prisma.campaign.update({
      where: { id },
      data: { totalContacts },
    });

    log.info('Contacts removed from campaign', { campaignId: id, count: contactIds.length, tenantId });

    res.json({
      success: true,
      message: `${contactIds.length} contacts removed from campaign`,
      totalContacts,
    });
  } catch (error: unknown) {
    log.error('Error removing contacts from campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove contacts from campaign',
    });
  }
});

// Execute campaign (send bulk messages via queue)
router.post('/:id/execute', requirePermission('EDIT_CAMPAIGN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        contacts: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    if (campaign.contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No contacts assigned to this campaign',
      });
    }

    // Check if campaign is already in progress
    if (campaign.status === 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        error: 'Campaign is already in progress',
      });
    }

    // Import queue dynamically
    const { campaignQueue } = await import('../queues/campaignQueue.js');

    // Add campaign to queue
    const job = await campaignQueue.add('execute', {
      campaignId: id,
    }, {
      jobId: `campaign-${id}-${Date.now()}`,
    });

    log.info('Campaign added to execution queue', { 
      campaignId: id, 
      jobId: job.id,
      tenantId 
    });

    res.json({
      success: true,
      message: 'Campaign queued for execution',
      jobId: job.id,
      totalContacts: campaign.contacts.length,
    });
  } catch (error: unknown) {
    log.error('Error queueing campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue campaign for execution',
    });
  }
});

// Pause campaign
router.post('/:id/pause', requirePermission('EDIT_CAMPAIGN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    if (campaign.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        error: 'Only in-progress campaigns can be paused',
      });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    log.info('Campaign paused', { campaignId: id, tenantId });

    res.json({
      success: true,
      message: 'Campaign paused',
    });
  } catch (error: unknown) {
    log.error('Error pausing campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause campaign',
    });
  }
});

// Resume campaign
router.post('/:id/resume', requirePermission('EDIT_CAMPAIGN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    if (campaign.status !== 'PAUSED') {
      return res.status(400).json({
        success: false,
        error: 'Only paused campaigns can be resumed',
      });
    }

    await prisma.campaign.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    });

    log.info('Campaign resumed', { campaignId: id, tenantId });

    res.json({
      success: true,
      message: 'Campaign resumed',
    });
  } catch (error: unknown) {
    log.error('Error resuming campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume campaign',
    });
  }
});

// Get campaign analytics
router.get('/:id/analytics', requirePermission('VIEW_CAMPAIGNS'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { contacts: true, conversations: true },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
      });
    }

    // Get message statistics
    const messages = await prisma.message.findMany({
      where: {
        tenantId,
        conversation: {
          campaignId: id,
        },
      },
      select: {
        status: true,
      },
    });

    const delivered = messages.filter(m => m.status === 'DELIVERED').length;
    const read = messages.filter(m => m.status === 'READ').length;

    res.json({
      success: true,
      analytics: {
        totalContacts: campaign.totalContacts,
        messagesSent: campaign.messagesSent,
        messagesDelivered: delivered,
        messagesFailed: campaign.messagesFailed,
        messagesRead: read,
        deliveryRate: campaign.messagesSent > 0 ? (delivered / campaign.messagesSent) * 100 : 0,
        readRate: campaign.messagesSent > 0 ? (read / campaign.messagesSent) * 100 : 0,
        conversations: campaign._count.conversations,
      },
    });
  } catch (error: unknown) {
    log.error('Error fetching campaign analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign analytics',
    });
  }
});

export default router;
