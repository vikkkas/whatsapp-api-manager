#!/usr/bin/env node

const API_BASE = 'http://localhost:3001';

async function testSendMessage() {
    console.log('🧪 Testing WhatsApp Business API...\n');
    
    const testPayload = {
        to: '+1234567890', // Test with a dummy number first
        message: '🤖 Hello! This is a test message from your WhatsApp Business API chatbot!'
    };
    
    try {
        console.log('📤 Sending message to:', testPayload.to);
        console.log('💬 Message:', testPayload.message);
        console.log('\n⏳ Making API request...');
        
        const response = await fetch(`${API_BASE}/api/messages/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testPayload)
        });
        
        const result = await response.json();
        
        console.log('\n📊 Response Status:', response.status);
        console.log('📋 Response Data:', JSON.stringify(result, null, 2));
        
        if (response.ok) {
            console.log('\n✅ SUCCESS: Message sent successfully!');
            
            // Check if message was saved to database
            console.log('\n🔍 Checking database...');
            const messagesResponse = await fetch(`${API_BASE}/api/messages`);
            const messages = await messagesResponse.json();
            
            console.log('💾 Total messages in DB:', messages.data?.length || 0);
            
            // Find our test message
            const testMessage = messages.data?.find(m => 
                m.phoneNumber === testPayload.to && 
                m.content === testPayload.message
            );
            
            if (testMessage) {
                console.log('✅ Message saved to database:', testMessage._id);
            } else {
                console.log('⚠️  Message not found in database');
            }
            
        } else {
            console.log('\n❌ FAILED: Message sending failed');
            console.log('🔍 Error details:', result.error || result.message);
        }
        
    } catch (error) {
        console.log('\n💥 ERROR: Failed to connect to API');
        console.log('🔍 Error:', error.message);
        
        // Check if server is running
        try {
            const healthResponse = await fetch(`${API_BASE}/health`);
            if (healthResponse.ok) {
                console.log('✅ Server is running - API endpoint might have an issue');
            }
        } catch {
            console.log('❌ Server is not running - start with: npm run dev');
        }
    }
}

// Run the test
testSendMessage();