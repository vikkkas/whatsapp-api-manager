import prisma from '../config/prisma.js';
import { log } from '../utils/logger.js';
import { getMetaAPIForTenant } from '../services/metaAPI.js';
import type { FlowTriggerType, FlowExecutionStatus } from '@prisma/client';

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
 * Outbox Pattern Flow Executor
 * 
 * This service runs in an infinite loop, polling the database for pending
 * flow executions and processing them. This ensures:
 * - Every execution is tracked in the database
 * - No executions are lost
 * - Easy debugging and monitoring
 * - No dependency on external queue systems
 */
class FlowExecutorService {
  private isRunning = false;
  private pollInterval = 1000; // Poll every 1 second
  private batchSize = 10; // Process up to 10 executions at a time

  /**
   * Start the executor service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      log.warn('Flow executor already running');
      return;
    }

    this.isRunning = true;
    log.info('🔄 Flow executor service started (Outbox Pattern)');

    // Start the infinite polling loop
    this.poll();
  }

  /**
   * Stop the executor service
   */
  stop(): void {
    this.isRunning = false;
    log.info('Flow executor service stopped');
  }

  /**
   * Infinite polling loop
   */
  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processPendingExecutions();
      } catch (error) {
        log.error('Error in flow executor poll loop', { error });
      }

      // Wait before next poll
      await this.sleep(this.pollInterval);
    }
  }

  /**
   * Process pending flow executions
   */
  private async processPendingExecutions(): Promise<void> {
    // Fetch pending executions (oldest first)
    const executions = await prisma.flowExecution.findMany({
      where: {
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: this.batchSize,
      include: {
        flow: true,
      },
    });

    if (executions.length === 0) {
      return; // Nothing to process
    }

    log.info(`Processing ${executions.length} pending flow execution(s)`);

    // Process each execution
    for (const execution of executions) {
      try {
        await this.executeFlow(execution);
      } catch (error) {
        log.error('Failed to execute flow', {
          executionId: execution.id,
          flowId: execution.flowId,
          error,
        });

        // Update execution with error
        await this.handleExecutionError(execution.id, error);
      }
    }
  }

  /**
   * Execute a single flow
   */
  private async executeFlow(execution: any): Promise<void> {
    const { id, flow, tenantId, contactPhone, currentNodeId, executionState } = execution;

    // Mark as processing
    await prisma.flowExecution.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    log.info('Executing flow', {
      executionId: id,
      flowId: flow.id,
      flowName: flow.name,
      tenantId,
    });

    try {
      // Check if flow is still active
      if (!flow.isActive) {
        throw new Error('Flow is not active');
      }

      const nodes = (flow.nodes as any[]) || [];
      const edges = (flow.edges as any[]) || [];

      // Find starting node
      let startNode: FlowNode | undefined;

      if (currentNodeId) {
        // Resume from specific node
        startNode = nodes.find((n: FlowNode) => n.id === currentNodeId);
      } else {
        // Start from beginning
        startNode = nodes.find((n: FlowNode) => n.type === 'start');
      }

      if (!startNode) {
        throw new Error('No start node found');
      }

      // Get Meta API instance
      const metaAPI = await getMetaAPIForTenant(tenantId);

      // Execute flow
      await this.executeNode(
        startNode,
        nodes,
        edges,
        {
          executionId: id,
          flowId: flow.id,
          tenantId,
          contactPhone,
          executionState: (executionState as any) || {},
          metaAPI,
        }
      );

      // Mark as completed
      await prisma.flowExecution.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Increment flow run count
      await prisma.flow.update({
        where: { id: flow.id },
        data: {
          runsCount: { increment: 1 },
        },
      });

      log.info('Flow execution completed', {
        executionId: id,
        flowId: flow.id,
      });
    } catch (error: any) {
      throw error; // Will be handled by handleExecutionError
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: FlowNode,
    allNodes: FlowNode[],
    allEdges: FlowEdge[],
    context: {
      executionId: string;
      flowId: string;
      tenantId: string;
      contactPhone: string;
      executionState: Record<string, any>;
      metaAPI: any;
    }
  ): Promise<void> {
    log.debug('Executing node', {
      nodeId: node.id,
      nodeType: node.type,
      executionId: context.executionId,
    });

    // Execute node action
    switch (node.type) {
      case 'start':
        // Just pass through
        break;

      case 'message':
        await this.executeMessageNode(node, context);
        break;

      case 'condition':
        const conditionResult = this.evaluateCondition(node, context.executionState);
        const conditionEdges = allEdges.filter(e => e.source === node.id);
        const nextEdge = conditionEdges.find(e =>
          (conditionResult && e.sourceHandle === 'true') ||
          (!conditionResult && e.sourceHandle === 'false')
        );

        if (nextEdge) {
          const nextNode = allNodes.find(n => n.id === nextEdge.target);
          if (nextNode) {
            await this.executeNode(nextNode, allNodes, allEdges, context);
          }
        }
        return; // Don't continue to default traversal

      case 'delay':
        const delayMs = node.data.delayMs || 1000;
        await this.sleep(delayMs);
        break;
    }

    // Default traversal: follow outgoing edges
    const outgoingEdges = allEdges.filter(e => e.source === node.id);

    for (const edge of outgoingEdges) {
      const nextNode = allNodes.find(n => n.id === edge.target);
      if (nextNode) {
        await this.sleep(500); // Small delay between nodes
        await this.executeNode(nextNode, allNodes, allEdges, context);
      }
    }
  }

  /**
   * Execute a message node
   */
  private async executeMessageNode(
    node: FlowNode,
    context: {
      executionId: string;
      flowId: string;
      contactPhone: string;
      metaAPI: any;
    }
  ): Promise<void> {
    const { content, buttons } = node.data;
    const { contactPhone, metaAPI, flowId } = context;

    // Remove '+' prefix for Meta API
    const metaRecipient = contactPhone.startsWith('+')
      ? contactPhone.slice(1)
      : contactPhone;

    try {
      if (buttons && buttons.length > 0) {
        // Send interactive message
        const formattedButtons = buttons.map((btn, index) => ({
          type: 'reply',
          reply: {
            id: `flow-${flowId}-node-${node.id}-btn-${btn.id}`,
            title: btn.label.substring(0, 20),
          },
        }));

        await metaAPI.sendInteractiveMessage(metaRecipient, {
          type: 'button',
          body: {
            text: content || 'Please select an option:',
          },
          action: {
            buttons: formattedButtons.slice(0, 3),
          },
        });

        log.info('Interactive message sent', {
          to: metaRecipient,
          nodeId: node.id,
          buttonCount: formattedButtons.length,
        });
      } else {
        // Send text message
        if (content) {
          await metaAPI.sendTextMessage(metaRecipient, content);
          log.info('Text message sent', {
            to: metaRecipient,
            nodeId: node.id,
          });
        }
      }
    } catch (error) {
      log.error('Failed to send message', {
        error,
        nodeId: node.id,
        to: metaRecipient,
      });
      throw error;
    }
  }

  /**
   * Evaluate condition node
   */
  private evaluateCondition(
    node: FlowNode,
    executionState: Record<string, any>
  ): boolean {
    const { field, operator, value } = node.data;

    if (!field || !operator || value === undefined) {
      return false;
    }

    const fieldValue = executionState[field] || '';

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
        return false;
    }
  }

  /**
   * Handle execution error
   */
  private async handleExecutionError(executionId: string, error: any): Promise<void> {
    const execution = await prisma.flowExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) return;

    const newRetryCount = execution.retryCount + 1;
    const shouldRetry = newRetryCount < execution.maxRetries;

    if (shouldRetry) {
      // Retry: reset to PENDING
      await prisma.flowExecution.update({
        where: { id: executionId },
        data: {
          status: 'PENDING',
          retryCount: newRetryCount,
          error: error.message || String(error),
        },
      });

      log.warn('Flow execution will be retried', {
        executionId,
        retryCount: newRetryCount,
        maxRetries: execution.maxRetries,
      });
    } else {
      // Max retries reached: mark as FAILED
      await prisma.flowExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          error: error.message || String(error),
        },
      });

      log.error('Flow execution failed after max retries', {
        executionId,
        retryCount: newRetryCount,
      });
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const flowExecutor = new FlowExecutorService();

// Auto-start on import
flowExecutor.start();

export default flowExecutor;
