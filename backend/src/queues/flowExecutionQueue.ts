import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { log } from '../utils/logger.js';

const connection = createRedisConnection();

export interface FlowExecutionJob {
  flowId: string;
  tenantId: string;
  context: {
    contactPhone: string;
    messageBody?: string;
    messageType?: string;
    contactId?: string;
    conversationId?: string;
    triggeredBy: 'KEYWORD' | 'NEW_MESSAGE' | 'CONVERSATION_OPENED' | 'BUTTON_CLICK';
    buttonPayload?: string;
  };
  currentNodeId?: string;
  executionState?: Record<string, any>;
}

/**
 * Flow Execution Queue
 * Handles async execution of automation flows
 */
export const flowExecutionQueue = new Queue<FlowExecutionJob>('flow-execution', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging
    },
  },
});

/**
 * Add flow execution job to queue
 */
export async function queueFlowExecution(job: FlowExecutionJob): Promise<void> {
  try {
    await flowExecutionQueue.add(
      'execute-flow',
      job,
      {
        jobId: `flow-${job.flowId}-${Date.now()}`,
        priority: job.context.triggeredBy === 'BUTTON_CLICK' ? 1 : 10, // Button clicks get higher priority
      }
    );

    log.info('Flow execution queued', {
      flowId: job.flowId,
      tenantId: job.tenantId,
      triggeredBy: job.context.triggeredBy,
    });
  } catch (error) {
    log.error('Failed to queue flow execution', { error, job });
    throw error;
  }
}

/**
 * Trigger flows based on incoming message
 */
export async function triggerFlows(
  tenantId: string,
  triggerType: 'KEYWORD' | 'NEW_MESSAGE' | 'CONVERSATION_OPENED',
  context: {
    contactPhone: string;
    messageBody?: string;
    messageType?: string;
    contactId?: string;
    conversationId?: string;
  }
): Promise<void> {
  try {
    const prisma = (await import('../config/prisma.js')).default;

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
      
      // Split keywords by comma and trim each - FIXED for multiple keywords
      const keywords = flow.trigger.split(',').map(k => k.toLowerCase().trim());
      const message = context.messageBody.toLowerCase().trim();
      
      // Check if message contains ANY of the keywords
      return keywords.some(keyword => message.includes(keyword));
    });

    // Queue each matching flow
    for (const flow of matchingFlows) {
      await queueFlowExecution({
        flowId: flow.id,
        tenantId,
        context: {
          ...context,
          triggeredBy: triggerType,
        },
      });
    }

    if (matchingFlows.length > 0) {
      log.info('Flows triggered', {
        count: matchingFlows.length,
        triggerType,
        tenantId,
      });
    }
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
    log.info('Button click received', { buttonPayload, contactPhone });
    
    // Try to parse flow button format: "flow-{flowId}-node-{nodeId}-btn-{buttonId}"
    const flowMatch = buttonPayload.match(/^flow-(.+)-node-(.+)-btn-(.+)$/);
    
    if (flowMatch) {
      // This is a flow button - resume the flow
      const [, flowId, currentNodeId, buttonId] = flowMatch;
      
      log.info('Flow button detected', { flowId, currentNodeId, buttonId });

      await queueFlowExecution({
        flowId,
        tenantId,
        context: {
          contactPhone,
          triggeredBy: 'BUTTON_CLICK',
          buttonPayload: buttonId,
          ...context,
        },
        currentNodeId,
        executionState: {
          lastButtonClick: buttonId,
        },
      });

      log.info('Flow button click queued', { flowId, buttonId, contactPhone });
    } else {
      // This is a non-flow button (sent manually from inbox or other source)
      log.info('Non-flow button clicked', { 
        buttonPayload, 
        contactPhone,
        note: 'Button does not match flow format, no flow will be resumed'
      });
      
      // Could potentially trigger a new flow based on button text/ID
      // For now, just log it
    }
  } catch (error) {
    log.error('Error handling button click', { error, buttonPayload });
  }
}
