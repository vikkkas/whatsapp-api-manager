import prisma from '../src/config/prisma.js';
import { hashPassword } from '../src/utils/encryption.js';
async function seed() {
    console.log('🌱 Starting database seed...');
    try {
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Demo Company',
                slug: 'demo-company',
                plan: 'pro',
                status: 'ACTIVE',
                messagesPerMinute: 60,
                maxPhoneNumbers: 5,
                maxAgents: 10,
            },
        });
        console.log('✅ Created tenant:', tenant.name);
        const hashedPassword = await hashPassword('admin123');
        const adminUser = await prisma.adminUser.create({
            data: {
                tenantId: tenant.id,
                email: 'admin@demo.com',
                password: hashedPassword,
                name: 'Demo Admin',
                role: 'TENANT_ADMIN',
            },
        });
        console.log('✅ Created admin user:', adminUser.email);
        const agent = await prisma.agent.create({
            data: {
                tenantId: tenant.id,
                email: 'agent@demo.com',
                name: 'Demo Agent',
                isOnline: true,
            },
        });
        console.log('✅ Created agent:', agent.email);
        const accessToken = 'DUMMY_ACCESS_TOKEN_FOR_TESTING';
        const credential = await prisma.wABACredential.create({
            data: {
                tenantId: tenant.id,
                phoneNumberId: '1234567890',
                phoneNumber: '+1234567890',
                displayName: 'Demo Business',
                businessAccountId: 'business_demo_123',
                accessToken: accessToken,
                isValid: true,
            },
        });
        console.log('✅ Created WABA credential:', credential.phoneNumber);
        const conversations = [];
        for (let i = 1; i <= 5; i++) {
            const conversation = await prisma.conversation.create({
                data: {
                    tenantId: tenant.id,
                    contactPhone: `+155512340${i}`,
                    contactName: `Customer ${i}`,
                    status: i <= 3 ? 'OPEN' : 'RESOLVED',
                    assignedAgentId: i % 2 === 0 ? agent.id : null,
                    lastMessageAt: new Date(),
                    unreadCount: i <= 3 ? 1 : 0,
                },
            });
            conversations.push(conversation);
        }
        console.log(`✅ Created ${conversations.length} conversations`);
        let messageCount = 0;
        for (const conversation of conversations) {
            await prisma.message.create({
                data: {
                    tenantId: tenant.id,
                    conversationId: conversation.id,
                    waMessageId: `wamid_inbound_${conversation.id}_1`,
                    direction: 'INBOUND',
                    from: conversation.contactPhone,
                    to: credential.phoneNumber,
                    type: 'TEXT',
                    text: `Hello! This is a test message from ${conversation.contactName}`,
                    status: 'READ',
                    createdAt: new Date(Date.now() - 3600000),
                },
            });
            messageCount++;
            await prisma.message.create({
                data: {
                    tenantId: tenant.id,
                    conversationId: conversation.id,
                    waMessageId: `wamid_outbound_${conversation.id}_1`,
                    direction: 'OUTBOUND',
                    from: credential.phoneNumber,
                    to: conversation.contactPhone,
                    type: 'TEXT',
                    text: `Thank you for your message! How can we help you today?`,
                    status: 'DELIVERED',
                    createdAt: new Date(Date.now() - 1800000),
                },
            });
            messageCount++;
        }
        console.log(`✅ Created ${messageCount} messages`);
        const templates = await prisma.template.createMany({
            data: [
                {
                    tenantId: tenant.id,
                    name: 'greeting',
                    category: 'MARKETING',
                    language: 'en',
                    bodyText: 'Hello {{1}}! Welcome to our service.',
                    status: 'APPROVED',
                },
                {
                    tenantId: tenant.id,
                    name: 'order_confirmation',
                    category: 'UTILITY',
                    language: 'en',
                    bodyText: 'Your order {{1}} has been confirmed. Thank you!',
                    status: 'APPROVED',
                },
                {
                    tenantId: tenant.id,
                    name: 'support_followup',
                    category: 'MARKETING',
                    language: 'en',
                    bodyText: 'Hi {{1}}, we wanted to follow up on your recent inquiry.',
                    status: 'APPROVED',
                },
            ],
        });
        console.log(`✅ Created ${templates.count} templates`);
        console.log('\n🎉 Seed completed successfully!');
        console.log('\n📝 Test credentials:');
        console.log('   Admin: admin@demo.com / admin123');
        console.log('   Agent: agent@demo.com / agent123');
        console.log('\n🚀 You can now start the server with: npm run dev');
    }
    catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
seed();
//# sourceMappingURL=seed.js.map