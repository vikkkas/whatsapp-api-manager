import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { enforceTenantIsolation } from '../middleware/tenant.js';
import prisma from '../config/prisma.js';
import { log } from '../utils/logger.js';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(enforceTenantIsolation);

// Validation schemas
const createCannedResponseSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  shortcut: z.string().min(1).regex(/^\/[a-z0-9-]+$/, 'Shortcut must start with / and contain only lowercase letters, numbers, and hyphens'),
  category: z.string().optional(),
  isPublic: z.boolean().default(true),
});

const updateCannedResponseSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  shortcut: z.string().regex(/^\/[a-z0-9-]+$/).optional(),
  category: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// List canned responses
router.get('/', requirePermission('VIEW_CANNED_RESPONSES'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const category = req.query.category as string;
    const search = req.query.search as string;

    const where: any = { tenantId };
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { shortcut: { contains: search, mode: 'insensitive' } },
      ];
    }

    const responses = await prisma.cannedResponse.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      responses,
    });
  } catch (error: unknown) {
    log.error('Error fetching canned responses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch canned responses',
    });
  }
});

// Get single canned response
router.get('/:id', requirePermission('VIEW_CANNED_RESPONSES'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const response = await prisma.cannedResponse.findFirst({
      where: { id, tenantId },
    });

    if (!response) {
      return res.status(404).json({
        success: false,
        error: 'Canned response not found',
      });
    }

    res.json({
      success: true,
      response,
    });
  } catch (error: unknown) {
    log.error('Error fetching canned response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch canned response',
    });
  }
});

// Create canned response
router.post('/', requirePermission('CREATE_CANNED_RESPONSE'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const data = createCannedResponseSchema.parse(req.body);

    // Check if shortcut already exists
    const existing = await prisma.cannedResponse.findFirst({
      where: {
        tenantId,
        shortcut: data.shortcut,
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'A canned response with this shortcut already exists',
      });
    }

    const response = await prisma.cannedResponse.create({
      data: {
        tenantId,
        createdById: userId,
        title: data.title,
        content: data.content,
        shortcut: data.shortcut,
        category: data.category,
        isPublic: data.isPublic,
      },
    });

    log.info('Canned response created', { responseId: response.id, tenantId });

    res.status(201).json({
      success: true,
      response,
    });
  } catch (error: unknown) {
    log.error('Error creating canned response:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create canned response',
    });
  }
});

// Update canned response
router.patch('/:id', requirePermission('EDIT_CANNED_RESPONSE'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const data = updateCannedResponseSchema.parse(req.body);

    const existing = await prisma.cannedResponse.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Canned response not found',
      });
    }

    // Check if new shortcut conflicts
    if (data.shortcut && data.shortcut !== existing.shortcut) {
      const conflict = await prisma.cannedResponse.findFirst({
        where: {
          tenantId,
          shortcut: data.shortcut,
          id: { not: id },
        },
      });

      if (conflict) {
        return res.status(400).json({
          success: false,
          error: 'A canned response with this shortcut already exists',
        });
      }
    }

    const response = await prisma.cannedResponse.update({
      where: { id },
      data,
    });

    log.info('Canned response updated', { responseId: id, tenantId });

    res.json({
      success: true,
      response,
    });
  } catch (error: unknown) {
    log.error('Error updating canned response:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update canned response',
    });
  }
});

// Delete canned response
router.delete('/:id', requirePermission('DELETE_CANNED_RESPONSE'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const existing = await prisma.cannedResponse.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Canned response not found',
      });
    }

    await prisma.cannedResponse.delete({
      where: { id },
    });

    log.info('Canned response deleted', { responseId: id, tenantId });

    res.json({
      success: true,
      message: 'Canned response deleted successfully',
    });
  } catch (error: unknown) {
    log.error('Error deleting canned response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete canned response',
    });
  }
});

// Get categories
router.get('/meta/categories', requirePermission('VIEW_CANNED_RESPONSES'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const categories = await prisma.cannedResponse.findMany({
      where: { tenantId, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    });

    const uniqueCategories = categories
      .map(c => c.category)
      .filter((c): c is string => c !== null);

    res.json({
      success: true,
      categories: uniqueCategories,
    });
  } catch (error: unknown) {
    log.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
    });
  }
});

export default router;
