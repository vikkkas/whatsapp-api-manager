import prisma from '../src/config/prisma.js';
import { normalizePhoneNumber } from '../src/utils/phone.js';
import { log } from '../src/utils/logger.js';


/**
 * Deduplication Script for Conversations
 * 
 * This script finds and merges duplicate conversations that were created
 * due to inconsistent phone number normalization.
 * 
 * Example: +918160283098 and 8160283098 should be the same conversation
 * 
 * Usage: npx tsx scripts/deduplicate-conversations.ts
 */

interface DuplicateGroup {
  normalizedPhone: string;
  tenantId: string;
  conversations: Array<{
    id: string;
    contactPhone: string;
    contactName: string | null;
    createdAt: Date;
    messageCount: number;
  }>;
}

async function deduplicateConversations() {
  log.info('Starting conversation deduplication...');

  try {
    // Get all conversations
    const allConversations = await prisma.conversation.findMany({
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    log.info(`Found ${allConversations.length} total conversations`);

    // Group conversations by normalized phone and tenant
    const groups = new Map<string, DuplicateGroup>();

    for (const conv of allConversations) {
      const normalized = normalizePhoneNumber(conv.contactPhone);
      const key = `${conv.tenantId}:${normalized}`;

      if (!groups.has(key)) {
        groups.set(key, {
          normalizedPhone: normalized,
          tenantId: conv.tenantId,
          conversations: [],
        });
      }

      groups.get(key)!.conversations.push({
        id: conv.id,
        contactPhone: conv.contactPhone,
        contactName: conv.contactName,
        createdAt: conv.createdAt,
        messageCount: conv._count.messages,
      });
    }

    // Find groups with duplicates
    const duplicateGroups = Array.from(groups.values()).filter(
      (group) => group.conversations.length > 1
    );

    log.info(`Found ${duplicateGroups.length} groups with duplicates`);

    if (duplicateGroups.length === 0) {
      log.info('No duplicates found. Exiting.');
      return;
    }

    // Process each duplicate group
    let totalMerged = 0;
    for (const group of duplicateGroups) {
      log.info(`Processing duplicate group for ${group.normalizedPhone}`, {
        count: group.conversations.length,
        conversations: group.conversations.map((c) => ({
          id: c.id,
          phone: c.contactPhone,
          messages: c.messageCount,
        })),
      });

      // Sort by: 1) message count (desc), 2) created date (asc - oldest first)
      const sorted = group.conversations.sort((a, b) => {
        if (b.messageCount !== a.messageCount) {
          return b.messageCount - a.messageCount;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      // Keep the conversation with most messages (or oldest if tie)
      const keepConversation = sorted[0];
      const duplicates = sorted.slice(1);

      log.info(`Keeping conversation ${keepConversation.id}, merging ${duplicates.length} duplicates`);

      // Merge each duplicate into the kept conversation
      for (const duplicate of duplicates) {
        try {
          // Move all messages to the kept conversation
          const updateResult = await prisma.message.updateMany({
            where: { conversationId: duplicate.id },
            data: { conversationId: keepConversation.id },
          });

          log.info(`Moved ${updateResult.count} messages from ${duplicate.id} to ${keepConversation.id}`);

          // Delete the duplicate conversation
          await prisma.conversation.delete({
            where: { id: duplicate.id },
          });

          log.info(`Deleted duplicate conversation ${duplicate.id}`);
          totalMerged++;
        } catch (error: any) {
          log.error(`Failed to merge conversation ${duplicate.id}`, {
            error: error.message,
          });
        }
      }

      // Update the kept conversation with normalized phone
      await prisma.conversation.update({
        where: { id: keepConversation.id },
        data: {
          contactPhone: group.normalizedPhone,
          contactName: keepConversation.contactName || group.normalizedPhone,
        },
      });

      // Update the contact as well
      await prisma.contact.updateMany({
        where: {
          tenantId: group.tenantId,
          phoneNumber: keepConversation.contactPhone,
        },
        data: {
          phoneNumber: group.normalizedPhone,
        },
      });
    }

    log.info(`Deduplication complete. Merged ${totalMerged} duplicate conversations.`);
  } catch (error: any) {
    log.error('Deduplication failed', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deduplicateConversations()
  .then(() => {
    console.log('✅ Deduplication completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deduplication failed:', error);
    process.exit(1);
  });
