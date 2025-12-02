import prisma from '../config/prisma.js';
import { log } from '../utils/logger.js';
import { getMetaAPIForTenant } from './metaAPI.js';

import { broadcastNewMessage } from './websocket.js';

export class FlowExecutor {
  async executeTrigger(tenantId: string, triggerType: 'KEYWORD' | 'NEW_MESSAGE' | 'CONVERSATION_OPENED', data: any) {
    try {
      // Find active flows matching the trigger
      const flows = await prisma.flow.findMany({
        where: {
          tenantId,
          isActive: true,
          triggerType,
        }
      });

      // Filter for keywords if needed
      const matchingFlows = flows.filter(flow => {
        if (triggerType !== 'KEYWORD') return true;
        if (!flow.trigger || !data.messageBody) return false;
        
        // Split keywords by comma and trim each - FIXED for multiple keywords
        const keywords = flow.trigger.split(',').map(k => k.toLowerCase().trim());
        const message = data.messageBody.toLowerCase().trim();
        
        // Check if message contains ANY of the keywords
        return keywords.some(keyword => message.includes(keyword));
      });

      for (const flow of matchingFlows) {
        await this.executeFlow(flow, data);
      }
    } catch (error) {
      log.error('Error executing flow trigger', { error });
    }
  }

  async executeFlow(flow: any, context: any) {
    log.info(`Executing flow ${flow.name} (${flow.id})`);
    
    // Increment run count
    await prisma.flow.update({
      where: { id: flow.id },
      data: { runsCount: { increment: 1 } }
    });

    // Find Start Node
    const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
    const edges = Array.isArray(flow.edges) ? flow.edges : [];
    const startNode = nodes.find((n: any) => n.type === 'start');

    if (!startNode) {
      log.warn(`Flow ${flow.id} has no start node`);
      return;
    }

    // Traverse
    await this.processNode(startNode, nodes, edges, context, flow.tenantId);
  }

  async processNode(node: any, nodes: any[], edges: any[], context: any, tenantId: string) {
    // Process current node action
    if (node.type === 'message') {
       await this.sendMessage(node, context, tenantId);
    }

    // Find next nodes
    const outgoingEdges = edges.filter((e: any) => e.source === node.id);
    
    for (const edge of outgoingEdges) {
      const nextNode = nodes.find((n: any) => n.id === edge.target);
      if (nextNode) {
        // Add small delay to ensure order
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.processNode(nextNode, nodes, edges, context, tenantId);
      }
    }
  }

  async sendMessage(node: any, context: any, tenantId: string) {
    const { content, mediaUrl, buttons } = node.data;
    const contactPhone = context.contactPhone || context.from; 

    if (!contactPhone) {
      log.error('No contact phone in context for flow execution');
      return;
    }

    // Remove '+' prefix for Meta API
    const metaRecipient = contactPhone.startsWith('+') 
      ? contactPhone.slice(1) 
      : contactPhone;

    try {
      const metaAPI = await getMetaAPIForTenant(tenantId);
      let result;
      let interactiveData = undefined;

      if (buttons && buttons.length > 0) {
        // Send interactive message
        result = await metaAPI.sendQuickReplyButtons(
          metaRecipient,
          content || 'Please select an option:',
          buttons.map((b: any, i: number) => ({ id: b.id || `btn-${i}`, title: b.label })),
        );

        // Construct interactiveData for DB
        interactiveData = {
          type: 'button',
          body: { text: content || 'Please select an option:' },
          action: {
            buttons: buttons.map((b: any, i: number) => ({
              type: 'reply',
              reply: { id: b.id || `btn-${i}`, title: b.label }
            }))
          }
        };
      } else {
        // Send text
        if (content) {
          result = await metaAPI.sendTextMessage(metaRecipient, content);
        }
      }
      
      log.info('Flow message sent successfully', { to: metaRecipient, tenantId });

      // Save to Database and Broadcast
      if (result) {
        let conversationId = context.conversationId;

        // If conversationId is missing, try to find it
        if (!conversationId) {
          const conversation = await prisma.conversation.findFirst({
            where: {
              tenantId,
              contactPhone: metaRecipient // Assuming DB stores normalized phone
            }
          });
          conversationId = conversation?.id;
        }

        if (conversationId) {
          const savedMessage = await prisma.message.create({
            data: {
              tenantId,
              conversationId,
              direction: 'OUTBOUND',
              status: 'SENT',
              type: interactiveData ? 'INTERACTIVE' : 'TEXT',
              text: content || (interactiveData ? 'Interactive Message' : ''),
              interactiveData: interactiveData || undefined,
              waMessageId: result.messageId,
              from: 'system',
              to: metaRecipient,
              createdAt: new Date(),
            }
          });

          // Broadcast to UI
          broadcastNewMessage(conversationId, savedMessage);
          log.info('Flow message saved and broadcasted', { messageId: savedMessage.id });
        } else {
          log.warn('Could not save flow message: Conversation not found', { metaRecipient, tenantId });
        }
      }

    } catch (error) {
      log.error('Failed to send flow message', { error, to: metaRecipient });
    }
  }
}

export const flowExecutor = new FlowExecutor();
