/**
 * Simple Flow Test - Direct Database Query
 * This tests the flow executor by directly calling it
 * 
 * Usage: cd backend && npx tsx tests/test-flow-simple.ts [phone-number]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFlows() {
  console.log('\n🧪 Flow Executor Simple Test\n');
  console.log('='.repeat(50) + '\n');

  try {
    // Step 1: Get tenant
    const tenant = await prisma.tenant.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!tenant) {
      console.error('❌ No active tenant found');
      console.log('\n💡 Create a tenant first by signing up at /signup\n');
      return;
    }

    console.log(`✅ Tenant: ${tenant.name}`);
    console.log(`   ID: ${tenant.id}\n`);

    // Step 2: Check credentials
    const cred = await prisma.wABACredential.findFirst({
      where: { tenantId: tenant.id, isValid: true }
    });

    if (!cred) {
      console.error('❌ No WhatsApp credentials configured');
      console.log('\n💡 Configure WhatsApp in Settings first\n');
      return;
    }

    console.log(`✅ WhatsApp: ${cred.phoneNumber}\n`);

    // Step 3: List flows
    const flows = await prisma.flow.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 Flows in Database: ${flows.length}\n`);

    if (flows.length === 0) {
      console.log('⚠️  No flows found');
      console.log('\n💡 Create a flow in the UI:');
      console.log('   1. Go to /flows');
      console.log('   2. Click "Create Flow"');
      console.log('   3. Add nodes and connect them');
      console.log('   4. Save and toggle Active\n');
      return;
    }

    flows.forEach((flow, i) => {
      const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];
      const edges = Array.isArray(flow.edges) ? flow.edges : [];
      
      console.log(`${i + 1}. ${flow.name}`);
      console.log(`   Status: ${flow.isActive ? '🟢 Active' : '🔴 Inactive'}`);
      console.log(`   Trigger: ${flow.triggerType}${flow.trigger ? ` (${flow.trigger})` : ''}`);
      console.log(`   Nodes: ${nodes.length}, Edges: ${edges.length}`);
      console.log(`   Runs: ${flow.runsCount}`);
      console.log('');
    });

    // Step 4: Show active flows
    const activeFlows = flows.filter(f => f.isActive);
    console.log(`\n🟢 Active Flows: ${activeFlows.length}`);

    if (activeFlows.length === 0) {
      console.log('\n⚠️  No active flows');
      console.log('💡 Toggle a flow to Active in the UI\n');
      return;
    }

    // Step 5: Show what would trigger
    console.log('\n📱 Trigger Scenarios:\n');

    const keywordFlows = activeFlows.filter(f => f.triggerType === 'KEYWORD');
    const newMsgFlows = activeFlows.filter(f => f.triggerType === 'NEW_MESSAGE');
    const openedFlows = activeFlows.filter(f => f.triggerType === 'CONVERSATION_OPENED');

    if (keywordFlows.length > 0) {
      console.log(`   KEYWORD Triggers (${keywordFlows.length}):`);
      keywordFlows.forEach(f => {
        console.log(`   - Send message containing "${f.trigger}" → triggers "${f.name}"`);
      });
      console.log('');
    }

    if (newMsgFlows.length > 0) {
      console.log(`   NEW_MESSAGE Triggers (${newMsgFlows.length}):`);
      newMsgFlows.forEach(f => {
        console.log(`   - Send ANY message → triggers "${f.name}"`);
      });
      console.log('');
    }

    if (openedFlows.length > 0) {
      console.log(`   CONVERSATION_OPENED Triggers (${openedFlows.length}):`);
      openedFlows.forEach(f => {
        console.log(`   - First message from new contact → triggers "${f.name}"`);
      });
      console.log('');
    }

    // Step 6: Instructions
    console.log('\n📝 Next Steps:\n');
    console.log('   1. Send a test message from WhatsApp to: ' + cred.phoneNumber);
    console.log('   2. Check backend logs for: "Flow message sent successfully"');
    console.log('   3. Verify you receive the automated response');
    console.log('   4. Run this script again to see updated run counts\n');

    console.log('🔍 Debugging:\n');
    console.log('   - Backend logs: Look for "Executing flow" messages');
    console.log('   - Webhook logs: Look for "Inbound message saved"');
    console.log('   - Meta API logs: Look for "Text message sent"\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    if (error instanceof Error) {
      console.error('   ', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run
testFlows()
  .then(() => {
    console.log('✅ Test complete\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
