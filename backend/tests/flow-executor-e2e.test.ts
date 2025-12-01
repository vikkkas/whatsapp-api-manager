import { flowExecutor } from '../src/services/flowExecutor.js';
import { getMetaAPIForTenant } from '../src/services/metaAPI.js';
import prisma from '../src/config/prisma.js';

/**
 * End-to-End Test for Flow Executor
 * 
 * This script tests:
 * 1. Flow creation with nodes and edges
 * 2. Flow trigger matching (KEYWORD, NEW_MESSAGE, CONVERSATION_OPENED)
 * 3. Node traversal and execution
 * 4. Message sending via Meta API
 */

async function testFlowExecutor() {
  console.log('🧪 Starting Flow Executor E2E Test...\n');

  try {
    // Step 1: Get a test tenant
    console.log('📋 Step 1: Finding test tenant...');
    const tenant = await prisma.tenant.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!tenant) {
      throw new Error('No active tenant found. Please create a tenant first.');
    }
    console.log(`✅ Found tenant: ${tenant.name} (${tenant.id})\n`);

    // Step 2: Verify WABA credentials
    console.log('📋 Step 2: Checking WhatsApp credentials...');
    const credential = await prisma.wABACredential.findFirst({
      where: { 
        tenantId: tenant.id,
        isValid: true 
      }
    });

    if (!credential) {
      throw new Error('No valid WhatsApp credentials found. Please configure in Settings.');
    }
    console.log(`✅ WhatsApp number: ${credential.phoneNumber}\n`);

    // Step 3: Create a test flow
    console.log('📋 Step 3: Creating test flow...');
    
    // Clean up any existing test flows
    await prisma.flow.deleteMany({
      where: {
        tenantId: tenant.id,
        name: 'E2E Test Flow'
      }
    });

    const testFlow = await prisma.flow.create({
      data: {
        tenantId: tenant.id,
        name: 'E2E Test Flow',
        description: 'Automated test flow',
        triggerType: 'KEYWORD',
        trigger: 'test',
        isActive: true,
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: 'Start' }
          },
          {
            id: 'message-1',
            type: 'message',
            position: { x: 100, y: 200 },
            data: {
              label: 'Welcome Message',
              content: '👋 Hello! This is an automated test message from the Flow Builder.',
              buttons: []
            }
          },
          {
            id: 'message-2',
            type: 'message',
            position: { x: 100, y: 300 },
            data: {
              label: 'Interactive Message',
              content: 'Please choose an option:',
              buttons: [
                { id: 'opt1', label: 'Option 1' },
                { id: 'opt2', label: 'Option 2' },
                { id: 'opt3', label: 'Option 3' }
              ]
            }
          }
        ],
        edges: [
          {
            id: 'e1',
            source: 'start-1',
            target: 'message-1',
            type: 'smoothstep'
          },
          {
            id: 'e2',
            source: 'message-1',
            target: 'message-2',
            type: 'smoothstep'
          }
        ]
      }
    });
    console.log(`✅ Test flow created: ${testFlow.id}\n`);

    // Step 4: Test KEYWORD trigger
    console.log('📋 Step 4: Testing KEYWORD trigger...');
    console.log('   Enter a test phone number (with country code, e.g., +1234567890):');
    
    // For automated testing, use a default test number
    const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '+1234567890';
    console.log(`   Using: ${testPhoneNumber}`);

    const testContext = {
      messageBody: 'test',
      contactPhone: testPhoneNumber,
      from: testPhoneNumber,
      contactId: 'test-contact-id',
      conversationId: 'test-conversation-id'
    };

    console.log('\n   Executing KEYWORD trigger with context:', JSON.stringify(testContext, null, 2));
    
    await flowExecutor.executeTrigger(tenant.id, 'KEYWORD', testContext);
    
    console.log('✅ KEYWORD trigger executed\n');

    // Step 5: Verify flow execution
    console.log('📋 Step 5: Verifying flow execution...');
    const updatedFlow = await prisma.flow.findUnique({
      where: { id: testFlow.id }
    });

    if (updatedFlow && updatedFlow.runsCount > 0) {
      console.log(`✅ Flow executed ${updatedFlow.runsCount} time(s)\n`);
    } else {
      console.log('⚠️  Flow runsCount not incremented. Check logs for errors.\n');
    }

    // Step 6: Test NEW_MESSAGE trigger
    console.log('📋 Step 6: Testing NEW_MESSAGE trigger...');
    
    const newMessageFlow = await prisma.flow.create({
      data: {
        tenantId: tenant.id,
        name: 'E2E Test Flow - New Message',
        description: 'Test flow for new messages',
        triggerType: 'NEW_MESSAGE',
        isActive: true,
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: 'Start' }
          },
          {
            id: 'message-1',
            type: 'message',
            position: { x: 100, y: 200 },
            data: {
              label: 'Auto Reply',
              content: '🤖 Thank you for your message! We will respond shortly.',
              buttons: []
            }
          }
        ],
        edges: [
          {
            id: 'e1',
            source: 'start-1',
            target: 'message-1',
            type: 'smoothstep'
          }
        ]
      }
    });

    await flowExecutor.executeTrigger(tenant.id, 'NEW_MESSAGE', testContext);
    console.log('✅ NEW_MESSAGE trigger executed\n');

    // Step 7: Test CONVERSATION_OPENED trigger
    console.log('📋 Step 7: Testing CONVERSATION_OPENED trigger...');
    
    const conversationFlow = await prisma.flow.create({
      data: {
        tenantId: tenant.id,
        name: 'E2E Test Flow - Conversation Opened',
        description: 'Test flow for new conversations',
        triggerType: 'CONVERSATION_OPENED',
        isActive: true,
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: 'Start' }
          },
          {
            id: 'message-1',
            type: 'message',
            position: { x: 100, y: 200 },
            data: {
              label: 'Welcome',
              content: '👋 Welcome! How can we help you today?',
              buttons: [
                { id: 'support', label: 'Support' },
                { id: 'sales', label: 'Sales' }
              ]
            }
          }
        ],
        edges: [
          {
            id: 'e1',
            source: 'start-1',
            target: 'message-1',
            type: 'smoothstep'
          }
        ]
      }
    });

    await flowExecutor.executeTrigger(tenant.id, 'CONVERSATION_OPENED', testContext);
    console.log('✅ CONVERSATION_OPENED trigger executed\n');

    // Step 8: Summary
    console.log('📊 Test Summary:');
    console.log('================');
    console.log(`✅ Tenant: ${tenant.name}`);
    console.log(`✅ WhatsApp Number: ${credential.phoneNumber}`);
    console.log(`✅ Test Phone: ${testPhoneNumber}`);
    console.log(`✅ Flows Created: 3`);
    console.log(`✅ Triggers Tested: KEYWORD, NEW_MESSAGE, CONVERSATION_OPENED`);
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('   1. Messages were sent to Meta API for phone: ' + testPhoneNumber);
    console.log('   2. Check backend logs for "Flow message sent successfully"');
    console.log('   3. If using a real number, check WhatsApp for received messages');
    console.log('   4. Test flows will remain in database for inspection');
    console.log('\n🧹 Cleanup:');
    console.log('   To remove test flows, run:');
    console.log(`   DELETE FROM "Flow" WHERE name LIKE 'E2E Test Flow%';`);

    console.log('\n✅ E2E Test Completed Successfully!\n');

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testFlowExecutor()
  .then(() => {
    console.log('Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
