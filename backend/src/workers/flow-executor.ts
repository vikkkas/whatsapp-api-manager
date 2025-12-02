import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import prisma from '../config/prisma.js';
import { log } from '../utils/logger.js';
import { getMetaAPIForTenant } from '../services/metaAPI.js';
import type { FlowExecutionJob } from '../queues/flowExecutionQueue.js';

const connection = createRedisConnection();

interface FlowNode {
  id: string;
  type: 'start' | 'message' | 'condition' | 'delay' | 'action';
  data: {
    label?: string;
    content?: string;
    mediaUrl?: string;
    buttons?: Array<{
      id: string;
      label: string;
      action?: 'next' | 'goto' | 'end';
      targetNodeId?: string;
    }>;
    // Condition node
    field?: string;
    operator?: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than';
    value?: string;
    // Delay node
    delayMs?: number;
  };
  position: { x: number; y: number };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  type?: string;
}

/**
 * Production-Ready Flow Executor Worker
 * Handles async execution of automation flows with:
 * - Multi-step flows
 * - Conditional logic
 * - Button interactions
 * - Delays
 * - Error recovery
 */
export const flowExecutorWorker = new Worker<FlowExecutionJob>(
  'flow-execution',
  async (job: Job<FlowExecutionJob>) => {
    const { flowId, tenantId, context, currentNodeId, executionState = {} } = job.data;

    log.info('Executing flow', {
      jobId: job.id,
      flowId,
      tenantId,
      triggeredBy: context.triggeredBy,
      currentNodeId,
    });

    try {
      // Get flow
      const flow = await prisma.flow.findUnique({
        where: { id: flowId },
      });

      if (!flow) {
        throw new Error(`Flow not found: ${flowId}`);
      }

      if (!flow.isActive) {
        log.warn('Flow is not active, skipping execution', { flowId });
        return;
      }

      // Increment run count
      await prisma.flow.update({
        where: { id: flowId },
        data: { runsCount: { increment: 1 } },
      });

      const nodes = (flow.nodes as any[]) || [];
      const edges = (flow.edges as any[]) || [];

      // Find starting node
      let startNode: FlowNode | undefined;
      
      if (currentNodeId) {
        // Resume from specific node (e.g., after button click)
        startNode = nodes.find((n: FlowNode) => n.id === currentNodeId);
      } else {
        // Start from beginning
        startNode = nodes.find((n: FlowNode) => n.type === 'start');
      }

      if (!startNode) {
        throw new Error('No start node found in flow');
      }

      // Execute flow from start node
      await executeNode(
        startNode,
        nodes,
        edges,
        {
          flowId,
          tenantId,
          context,
          executionState,
          metaAPI: await getMetaAPIForTenant(tenantId),
        }
      );

      log.info('Flow execution completed', { flowId, jobId: job.id });
    } catch (error) {
      log.error('Flow execution failed', {
        error,
        flowId,
        jobId: job.id,
        tenantId,
      });
      throw error;
    }
  },
  {
    connection,
    concurrency: 10, // Process up to 10 flows concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 60000, // per minute
    },
  }
);

/**
 * Execute a single node in the flow
 */
async function executeNode(
  node: FlowNode,
  allNodes: FlowNode[],
  allEdges: FlowEdge[],
  executionContext: {
    flowId: string;
    tenantId: string;
    context: FlowExecutionJob['context'];
    executionState: Record<string, any>;
    metaAPI: any;
  }
): Promise<void> {
  const { context, executionState, metaAPI } = executionContext;

  log.debug('Executing node', {
    nodeId: node.id,
    nodeType: node.type,
    flowId: executionContext.flowId,
  });

  // Execute node action based on type
  switch (node.type) {
    case 'start':
      // Start node - just pass through
      break;

    case 'message':
      await executeMessageNode(node, executionContext);
      break;

    case 'condition':
      // Evaluate condition and choose path
      const conditionResult = evaluateCondition(node, context, executionState);
      
      // Find the appropriate edge based on condition result
      const conditionEdges = allEdges.filter(e => e.source === node.id);
      const nextEdge = conditionEdges.find(e => 
        (conditionResult && e.sourceHandle === 'true') ||
        (!conditionResult && e.sourceHandle === 'false')
      );

      if (nextEdge) {
        const nextNode = allNodes.find(n => n.id === nextEdge.target);
        if (nextNode) {
          await executeNode(nextNode, allNodes, allEdges, executionContext);
        }
      }
      return; // Don't continue to default edge traversal

    case 'delay':
      const delayMs = node.data.delayMs || 1000;
      log.debug('Delaying execution', { delayMs, nodeId: node.id });
      await new Promise(resolve => setTimeout(resolve, delayMs));
      break;

    case 'action':
      // Custom actions (future: update contact, tag, etc.)
      log.debug('Action node not yet implemented', { nodeId: node.id });
      break;
  }

  // Find next nodes (default traversal)
  const outgoingEdges = allEdges.filter(e => e.source === node.id);
  
  for (const edge of outgoingEdges) {
    const nextNode = allNodes.find(n => n.id === edge.target);
    if (nextNode) {
      // Small delay between nodes to ensure order
      await new Promise(resolve => setTimeout(resolve, 500));
      await executeNode(nextNode, allNodes, allEdges, executionContext);
    }
  }
}

/**
 * Execute a message node - send message via WhatsApp
 */
async function executeMessageNode(
  node: FlowNode,
  executionContext: {
    flowId: string;
    tenantId: string;
    context: FlowExecutionJob['context'];
    executionState: Record<string, any>;
    metaAPI: any;
  }
): Promise<void> {
  const { flowId, tenantId, context, metaAPI } = executionContext;
  const { content, buttons } = node.data;
  const contactPhone = context.contactPhone;

  if (!contactPhone) {
    log.error('No contact phone in context', { nodeId: node.id });
    return;
  }

  // Remove '+' prefix for Meta API
  const metaRecipient = contactPhone.startsWith('+')
    ? contactPhone.slice(1)
    : contactPhone;

  try {
    let messageResponse: any;
    let messageType = 'TEXT';
    let messageText = content || '';

    if (buttons && buttons.length > 0) {
      // Send interactive message with buttons
      const actualMessageText = content || 'Please select an option:';
      
      const formattedButtons = buttons.map((btn, index) => ({
        type: 'reply',
        reply: {
          // Include flow and node info in button ID for routing
          // Use index as fallback if btn.id is missing or duplicate
          id: `flow-${flowId}-node-${node.id}-btn-${btn.id || index}`,
          title: btn.label.substring(0, 20), // Meta limit: 20 chars
        },
      }));

      const payload = {
        type: 'button',
        body: {
          text: actualMessageText,
        },
        action: {
          buttons: formattedButtons.slice(0, 3), // Meta limit: 3 buttons
        },
      };

      log.info('Sending interactive message payload', { 
        to: metaRecipient, 
        payload: JSON.stringify(payload) 
      });

      try {
        messageResponse = await metaAPI.sendInteractiveMessage(metaRecipient, payload);
      } catch (err: any) {
        log.error('Meta API Error Details', {
          status: err.response?.status,
          data: JSON.stringify(err.response?.data || {}),
          payload: JSON.stringify(payload)
        });
        throw err;
      }

      messageType = 'INTERACTIVE';
      messageText = actualMessageText; // Save the actual text that was sent

      log.info('Interactive message sent', {
        to: metaRecipient,
        nodeId: node.id,
        buttonCount: formattedButtons.length,
      });
    } else {
      // Send text message
      if (content) {
        messageResponse = await metaAPI.sendTextMessage(metaRecipient, content);
        log.info('Text message sent', {
          to: metaRecipient,
          nodeId: node.id,
        });
      }
    }

    // Save message to database so it appears in inbox
    if (messageResponse && context.conversationId) {
      const waMessageId = messageResponse.messageId || messageResponse.messages?.[0]?.id || `flow-${Date.now()}`;
      
      const savedMessage = await prisma.message.create({
        data: {
          tenantId,
          conversationId: context.conversationId,
          waMessageId,
          direction: 'OUTBOUND',
          status: 'SENT',
          from: metaAPI.phoneNumberId || '',
          to: contactPhone,
          type: messageType as any,
          text: messageText,
          interactiveData: buttons && buttons.length > 0 ? {
            type: 'button',
            body: { text: messageText },
            action: {
              buttons: buttons.map((btn: any, index: number) => ({
                type: 'reply',
                reply: {
                  id: `flow-${flowId}-node-${node.id}-btn-${btn.id || index}`,
                  title: btn.label
                }
              }))
            }
          } : undefined,
          timestamp: new Date(),
        },
      });

      // Publish WebSocket event so message appears in real-time
      const { publishWebSocketEvent } = await import('../services/pubsub.js');
      await publishWebSocketEvent({
        type: 'message:new',
        data: { 
          conversationId: context.conversationId, 
          message: savedMessage 
        },
      });

      log.info('Flow message saved to database', {
        messageId: savedMessage.id,
        waMessageId,
        conversationId: context.conversationId,
      });
    }
  } catch (error) {
    log.error('Failed to send message in flow', {
      error,
      nodeId: node.id,
      to: metaRecipient,
    });
    throw error;
  }
}

/**
 * Evaluate a condition node
 */
function evaluateCondition(
  node: FlowNode,
  context: FlowExecutionJob['context'],
  executionState: Record<string, any>
): boolean {
  const { field, operator, value } = node.data;

  if (!field || !operator || value === undefined) {
    log.warn('Incomplete condition node', { nodeId: node.id });
    return false;
  }

  // Get field value from context or execution state
  let fieldValue: any;
  
  if (field === 'messageBody') {
    fieldValue = context.messageBody || '';
  } else if (field === 'buttonClick') {
    fieldValue = executionState.lastButtonClick || '';
  } else {
    fieldValue = executionState[field];
  }

  // Evaluate based on operator
  switch (operator) {
    case 'equals':
      return String(fieldValue).toLowerCase() === String(value).toLowerCase();
    
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    
    case 'starts_with':
      return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());
    
    case 'ends_with':
      return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());
    
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    
    case 'less_than':
      return Number(fieldValue) < Number(value);
    
    default:
      log.warn('Unknown operator', { operator, nodeId: node.id });
      return false;
  }
}

// Handle worker events
flowExecutorWorker.on('completed', (job) => {
  log.info('Flow execution job completed', {
    jobId: job.id,
    flowId: job.data.flowId,
  });
});

flowExecutorWorker.on('failed', (job, err) => {
  log.error('Flow execution job failed', {
    jobId: job?.id,
    flowId: job?.data.flowId,
    error: err.message,
    attempts: job?.attemptsMade,
  });
});

flowExecutorWorker.on('error', (err) => {
  log.error('Flow executor worker error', { error: err });
});

log.info('Flow executor worker started');

export default flowExecutorWorker;
