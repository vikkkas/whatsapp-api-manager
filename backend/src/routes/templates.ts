import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { enforceTenantIsolation } from '../middleware/tenant.js';
import { log } from '../utils/logger.js';
import {
  createTemplateForTenant,
  deleteTemplateForTenant,
  formatTemplateResponse,
  syncTemplatesWithMeta,
  updateTemplateForTenant,
} from '../services/templateService.js';

const router = Router();

router.use(authenticate);
router.use(enforceTenantIsolation);

const buttonSchema = z.object({
  type: z.string(),
  text: z.string(),
  url: z.string().optional(),
  phone_number: z.string().optional(),
});

const componentSchema = z.object({
  type: z.enum(['HEADER', 'BODY', 'FOOTER', 'BUTTONS']),
  format: z.string().optional(),
  text: z.string().optional(),
  buttons: z.array(buttonSchema).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(3),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']),
  language: z.string().min(2),
  components: z.array(componentSchema).min(1),
});

const updateTemplateSchema = createTemplateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required for update' }
);

const listQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'DISABLED']).optional(),
  category: z.enum(['MARKETING', 'UTILITY', 'AUTHENTICATION']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sync: z.enum(['true', 'false', '1', '0']).optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const tenantId = req.user!.tenantId;

    if (query.sync === 'true' || query.sync === '1') {
      await syncTemplatesWithMeta(tenantId);
    }

    const where: any = { tenantId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: query.limit,
      }),
      prisma.template.count({ where }),
    ]);

    res.json({
      success: true,
      templates: templates.map(formatTemplateResponse),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  } catch (error: any) {
    log.error('Failed to list templates', { error: error.message, tenantId: req.user?.tenantId });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Invalid query parameters', errors: error.errors });
    }
    res.status(500).json({ success: false, message: 'Failed to list templates' });
  }
});

router.post('/sync', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const result = await syncTemplatesWithMeta(tenantId);
    res.json({
      success: true,
      message: 'Templates synchronized with Meta',
      ...result,
    });
  } catch (error: any) {
    log.error('Template sync failed', { error: error.message, tenantId: req.user?.tenantId });
    res.status(500).json({ success: false, message: 'Failed to sync templates', error: error.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const template = await prisma.template.findFirst({
      where: { id: req.params.id, tenantId },
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({
      success: true,
      template: formatTemplateResponse(template),
    });
  } catch (error: any) {
    log.error('Failed to fetch template', { error: error.message, id: req.params.id });
    res.status(500).json({ success: false, message: 'Failed to fetch template' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const payload = createTemplateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    const template = await createTemplateForTenant(tenantId, payload);

    res.status(201).json({
      success: true,
      message: 'Template submitted to Meta for approval',
      template: formatTemplateResponse(template),
    });
  } catch (error: any) {
    log.error('Failed to create template', { error: error.message, tenantId: req.user?.tenantId });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Invalid template payload', errors: error.errors });
    }
    res.status(400).json({ success: false, message: error.message || 'Failed to create template' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const payload = updateTemplateSchema.parse(req.body);
    const tenantId = req.user!.tenantId;
    const template = await updateTemplateForTenant(tenantId, req.params.id, payload);

    res.json({
      success: true,
      message: 'Template resubmitted to Meta',
      template: formatTemplateResponse(template),
    });
  } catch (error: any) {
    log.error('Failed to update template', { error: error.message, id: req.params.id });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Invalid template payload', errors: error.errors });
    }
    res.status(400).json({ success: false, message: error.message || 'Failed to update template' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    await deleteTemplateForTenant(tenantId, req.params.id);

    res.json({
      success: true,
      message: 'Template deleted from Meta and local records',
    });
  } catch (error: any) {
    log.error('Failed to delete template', { error: error.message, id: req.params.id });
    res.status(400).json({ success: false, message: error.message || 'Failed to delete template' });
  }
});

export default router;
