#!/usr/bin/env node

/**
 * Quick Flow Executor Test
 * Run: cd backend && node tests/quick-flow-test.js
 */

import { flowExecutor } from '../dist/services/flowExecutor.js';
import prisma from '../dist/config/prisma.js';

async function quickTest() {
  console.log('🚀 Quick Flow Executor Test\n');

  try {
    // Get first active tenant
    const tenant = await prisma.tenant.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!tenant) {
      console.error('❌ No active tenant found');
      process.exit(1);
    }

    console.log(`✅ Testing with tenant: ${tenant.name}\n`);

    // Get active flows
    const flows = await prisma.flow.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true
      }
    });

    console.log(`📋 Found ${flows.length} active flow(s):\n`);
    flows.forEach((flow, i) => {
      console.log(`   ${i + 1}. ${flow.name}`);
      console.log(`      Trigger: ${flow.triggerType} ${flow.trigger ? `(${flow.trigger})` : ''}`);
      console.log(`      Runs: ${flow.runsCount}`);
      console.log(`      Nodes: ${Array.isArray(flow.nodes) ? flow.nodes.length : 0}`);
      console.log('');
    });

    if (flows.length === 0) {
      console.log('⚠️  No active flows found. Create a flow in the UI first.\n');
      process.exit(0);
    }

    // Test with a sample context
    const testPhone = process.argv[2] || '+1234567890';
    console.log(`📱 Test phone number: ${testPhone}\n`);

    const testContext = {
      messageBody: 'test hello',
      contactPhone: testPhone,
      from: testPhone,
      contactId: 'test-contact',
      conversationId: 'test-conversation'
    };

    // Test each trigger type
    console.log('🧪 Testing triggers...\n');

    console.log('1️⃣  Testing KEYWORD trigger...');
    await flowExecutor.executeTrigger(tenant.id, 'KEYWORD', testContext);
    console.log('   ✅ Done\n');

    console.log('2️⃣  Testing NEW_MESSAGE trigger...');
    await flowExecutor.executeTrigger(tenant.id, 'NEW_MESSAGE', testContext);
    console.log('   ✅ Done\n');

    console.log('3️⃣  Testing CONVERSATION_OPENED trigger...');
    await flowExecutor.executeTrigger(tenant.id, 'CONVERSATION_OPENED', testContext);
    console.log('   ✅ Done\n');

    // Check updated run counts
    const updatedFlows = await prisma.flow.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true
      }
    });

    console.log('📊 Updated flow statistics:\n');
    updatedFlows.forEach((flow, i) => {
      console.log(`   ${i + 1}. ${flow.name}: ${flow.runsCount} runs`);
    });

    console.log('\n✅ Test completed!');
    console.log('\n💡 Tips:');
    console.log('   - Check backend logs for "Flow message sent successfully"');
    console.log('   - If messages were sent, check WhatsApp on the test number');
    console.log('   - Run with custom phone: node backend/tests/quick-flow-test.js +1234567890\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

quickTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
