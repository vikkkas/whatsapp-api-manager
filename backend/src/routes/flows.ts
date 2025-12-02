import express, { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { enforceTenantIsolation } from '../middleware/tenant.js';
import { log } from '../utils/logger.js';

const router = express.Router();

router.use(authenticate);
router.use(enforceTenantIsolation);

const createFlowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.enum(['KEYWORD', 'NEW_MESSAGE', 'CONVERSATION_OPENED', 'MANUAL']),
  trigger: z.string().optional(),
});

const updateFlowSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  triggerType: z.enum(['KEYWORD', 'NEW_MESSAGE', 'CONVERSATION_OPENED', 'MANUAL']).optional(),
  trigger: z.string().optional(),
  nodes: z.array(z.any()).optional(),
  edges: z.array(z.any()).optional(),
  isActive: z.boolean().optional(),
});

// List flows
router.get('/', requirePermission('VIEW_FLOWS'), async (req: Request, res: Response) => {
  try {
    const flows = await prisma.flow.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ flows });
  } catch (error: any) {
    log.error('Error listing flows', { error: error.message });
    res.status(500).json({ error: 'Failed to list flows' });
  }
});

// Get flow
router.get('/:id', requirePermission('VIEW_FLOWS'), async (req: Request, res: Response) => {
  try {
    const flow = await prisma.flow.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!flow) return res.status(404).json({ error: 'Flow not found' });
    res.json(flow);
  } catch (error: any) {
    log.error('Error fetching flow', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch flow' });
  }
});

// Create flow
router.post('/', requirePermission('CREATE_FLOWS'), async (req: Request, res: Response) => {
  try {
    const data = createFlowSchema.parse(req.body);
    const flow = await prisma.flow.create({
      data: {
        name: data.name,
        description: data.description,
        triggerType: data.triggerType,
        trigger: data.trigger,
        tenantId: req.user!.tenantId,
        nodes: [],
        edges: [],
      },
    });
    res.status(201).json(flow);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update flow
router.patch('/:id', requirePermission('EDIT_FLOWS'), async (req: Request, res: Response) => {
  try {
    const data = updateFlowSchema.parse(req.body);
    
    const existing = await prisma.flow.findFirst({ 
      where: { id: req.params.id, tenantId: req.user!.tenantId } 
    });
    
    if (!existing) return res.status(404).json({ error: 'Flow not found' });

    const updated = await prisma.flow.update({
      where: { id: req.params.id },
      data,
    });
    res.json(updated);
  } catch (error: any) {
    log.error('Error updating flow', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Delete flow
router.delete('/:id', requirePermission('DELETE_FLOWS'), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.flow.findFirst({ 
      where: { id: req.params.id, tenantId: req.user!.tenantId } 
    });
    
    if (!existing) return res.status(404).json({ error: 'Flow not found' });

    await prisma.flow.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    log.error('Error deleting flow', { error: error.message });
    res.status(500).json({ error: 'Failed to delete flow' });
  }
});

export default router;
