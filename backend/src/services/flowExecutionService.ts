import prisma from '../config/prisma.js';
import { log } from '../utils/logger.js';
import type { FlowTriggerType } from '@prisma/client';

interface FlowExecutionContext {
  contactPhone: string;
  messageBody?: string;
  messageType?: string;
  contactId?: string;
  conversationId?: string;
}

/**
 * Create a flow execution record (Outbox Pattern)
 * 
 * This function creates a PENDING execution record in the database.
 * The flow executor service will pick it up and process it asynchronously.
 */
export async function createFlowExecution(
  flowId: string,
  tenantId: string,
  triggeredBy: FlowTriggerType,
  context: FlowExecutionContext,
  options?: {
    currentNodeId?: string;
    executionState?: Record<string, any>;
    triggerData?: any;
  }
): Promise<string> {
  try {
    const execution = await prisma.flowExecution.create({
      data: {
        flowId,
        tenantId,
        contactPhone: context.contactPhone,
        contactId: context.contactId,
        conversationId: context.conversationId,
        messageBody: context.messageBody,
        messageType: context.messageType,
        triggeredBy,
        triggerData: options?.triggerData,
        currentNodeId: options?.currentNodeId,
        executionState: options?.executionState,
        status: 'PENDING',
      },
    });

    log.info('Flow execution created', {
      executionId: execution.id,
      flowId,
      tenantId,
      triggeredBy,
    });

    return execution.id;
  } catch (error) {
    log.error('Failed to create flow execution', {
      error,
      flowId,
      tenantId,
    });
    throw error;
  }
}

/**
 * Trigger flows based on incoming message
 */
export async function triggerFlows(
  tenantId: string,
  triggerType: FlowTriggerType,
  context: FlowExecutionContext
): Promise<void> {
  try {
    // Find matching flows
    const flows = await prisma.flow.findMany({
      where: {
        tenantId,
        isActive: true,
        triggerType,
      },
    });

    // Filter for keyword matches
    const matchingFlows = flows.filter(flow => {
      if (triggerType !== 'KEYWORD') return true;
      if (!flow.trigger || !context.messageBody) return false;

      // Split keywords by comma and trim each
      const keywords = flow.trigger.split(',').map(k => k.toLowerCase().trim());
      const message = context.messageBody.toLowerCase().trim();

      // Check if message contains ANY of the keywords
      return keywords.some(keyword => message.includes(keyword));
    });

    if (matchingFlows.length === 0) {
      log.debug('No matching flows found', { triggerType, tenantId });
      return;
    }

    // Create execution records for each matching flow
    for (const flow of matchingFlows) {
      await createFlowExecution(flow.id, tenantId, triggerType, context);
    }

    log.info('Flow executions created', {
      count: matchingFlows.length,
      triggerType,
      tenantId,
    });
  } catch (error) {
    log.error('Error triggering flows', { error, tenantId, triggerType });
  }
}

/**
 * Handle button click from interactive message
 */
export async function handleButtonClick(
  tenantId: string,
  contactPhone: string,
  buttonPayload: string,
  context: {
    contactId?: string;
    conversationId?: string;
  }
): Promise<void> {
  try {
    // Parse button payload: format is "flow-{flowId}-node-{nodeId}-btn-{buttonId}"
    const match = buttonPayload.match(/^flow-(.+)-node-(.+)-btn-(.+)$/);

    if (!match) {
      log.warn('Invalid button payload format', { buttonPayload });
      return;
    }

    const [, flowId, currentNodeId, buttonId] = match;

    // Create execution to resume from button node
    await createFlowExecution(
      flowId,
      tenantId,
      'BUTTON_CLICK',
      {
        contactPhone,
        ...context,
      },
      {
        currentNodeId,
        executionState: {
          lastButtonClick: buttonId,
        },
        triggerData: {
          buttonId,
          buttonPayload,
        },
      }
    );

    log.info('Button click execution created', {
      flowId,
      buttonId,
      contactPhone,
    });
  } catch (error) {
    log.error('Error handling button click', { error, buttonPayload });
  }
}

/**
 * Get execution statistics
 */
export async function getExecutionStats(flowId: string) {
  const stats = await prisma.flowExecution.groupBy({
    by: ['status'],
    where: { flowId },
    _count: true,
  });

  return {
    total: stats.reduce((sum, s) => sum + s._count, 0),
    byStatus: stats.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {} as Record<string, number>),
  };
}

/**
 * Get recent executions for a flow
 */
export async function getRecentExecutions(flowId: string, limit = 10) {
  return prisma.flowExecution.findMany({
    where: { flowId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      status: true,
      triggeredBy: true,
      contactPhone: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
      error: true,
      retryCount: true,
    },
  });
}
