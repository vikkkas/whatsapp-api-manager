# Meta WhatsApp Business API Setup Guide

Complete guide to setting up Meta WhatsApp Business API for your SaaS platform.

## 📋 Prerequisites

- Facebook Business Manager account
- Phone number not currently on WhatsApp
- Valid business documentation (may be required)

---

## Step 1: Create Meta Developer Account

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click "Get Started" or "My Apps"
3. Log in with your Facebook account
4. Complete developer registration if needed

---

## Step 2: Create a New App

1. Click **"Create App"**
2. Select **"Business"** as app type
3. Fill in details:
   - **App Name**: Your Business Name
   - **App Contact Email**: your-email@company.com
   - **Business Account**: Select or create one
4. Click **"Create App"**

---

## Step 3: Add WhatsApp Product

1. In your app dashboard, find **"WhatsApp"**
2. Click **"Set Up"**
3. Choose **"Business Solution Provider"** (for SaaS)

---

## Step 4: Set Up WhatsApp Business Account (WABA)

### Option A: Create New WABA

1. In WhatsApp setup, click **"Create Business Account"**
2. Enter:
   - Business name
   - Business category
   - Business description
3. Click **"Continue"**

### Option B: Use Existing WABA

1. Click **"Use existing WhatsApp Business Account"**
2. Select your account from the list

---

## Step 5: Add Phone Number

1. Go to **WhatsApp → Getting Started**
2. Click **"Add Phone Number"**
3. Select method:
   - **New Number**: Meta provides a test number
   - **Migrate**: Use existing WhatsApp Business number
   - **Phone Number**: Add your own number

### For Your Own Number:

\`\`\`
⚠️ IMPORTANT: 
- Number must NOT be registered on WhatsApp
- Cannot be a landline
- Must be able to receive SMS/voice calls
- Will be PERMANENTLY linked to this WABA
\`\`\`

4. Enter phone number with country code: `+1234567890`
5. Verify via SMS or voice call
6. Enter verification code

---

## Step 6: Get API Credentials

### 6.1 Get Phone Number ID

1. Go to **WhatsApp → API Setup**
2. Find **"Phone Number ID"** - Copy this!
   - Example: `123456789012345`
   - This is your `phoneNumberId`

### 6.2 Get Access Token

**Option A: Temporary Token (Testing)**

1. In API Setup, find **"Temporary access token"**
2. Click **"Copy"**
3. Valid for 24 hours only
4. ⚠️ Do NOT use in production!

**Option B: Permanent Token (Production)**

1. Go to **Business Settings** in Facebook
2. Navigate to **System Users**
3. Click **"Add"** to create system user:
   - Name: `WhatsApp API System User`
   - Role: Admin
4. Click **"Add Assets"**
5. Select **"Apps"** → Choose your app → Full Control
6. Select **"WhatsApp Accounts"** → Choose WABA → Full Control
7. Click **"Generate New Token"**
8. Select permissions:
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_messaging`
9. Copy the token - **SAVE IT SECURELY!**
10. You won't see it again!

### 6.3 Get Business Account ID

1. In **WhatsApp → API Setup**
2. Find **"WhatsApp Business Account ID"**
3. Copy this (optional but recommended)

---

## Step 7: Configure Webhook

### 7.1 Prepare Your Webhook Endpoint

Your webhook URL format:
\`\`\`
https://your-domain.com/api/webhook
\`\`\`

For local development, use ngrok:
\`\`\`bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000

# Copy the HTTPS URL: https://abc123.ngrok.io
# Your webhook: https://abc123.ngrok.io/api/webhook
\`\`\`

### 7.2 Set Verify Token

In your backend `.env`:
\`\`\`bash
WEBHOOK_VERIFY_TOKEN="your-secure-random-token-123"
\`\`\`

Generate a secure token:
\`\`\`bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
\`\`\`

### 7.3 Configure in Meta

1. Go to **WhatsApp → Configuration**
2. In **Webhook** section, click **"Edit"**
3. Enter:
   - **Callback URL**: `https://your-domain.com/api/webhook`
   - **Verify Token**: (from your `.env` file)
4. Click **"Verify and Save"**

Meta will send a GET request to verify your endpoint.

### 7.4 Subscribe to Webhook Fields

1. In **Webhook Fields**, enable:
   - ✅ **messages** (Incoming messages)
   - ✅ **message_status** (Delivery status updates)
2. Click **"Save"**

---

## Step 8: Add Credentials to Your Platform

### Via API

\`\`\`bash
curl -X POST https://your-domain.com/api/waba/credentials \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumberId": "123456789012345",
    "phoneNumber": "+1234567890",
    "accessToken": "EAAxxxxxxxxx",
    "displayName": "My Business",
    "businessAccountId": "234567890123456"
  }'
\`\`\`

### Via Dashboard

1. Log in to your platform
2. Go to **Settings → WhatsApp Accounts**
3. Click **"Add Account"**
4. Fill in:
   - Phone Number ID
   - Phone Number (with + and country code)
   - Access Token
   - Display Name
   - Business Account ID (optional)
5. Click **"Connect"**

---

## Step 9: Test Your Setup

### 9.1 Send Test Message

\`\`\`bash
curl -X POST https://your-domain.com/api/messages/send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "Hello from WhatsApp Business API!"
  }'
\`\`\`

### 9.2 Test Webhook

1. Send a message TO your WhatsApp Business number
2. Check your logs:
   \`\`\`bash
   # Should see:
   [WEBHOOK] Webhook payload received
   [WEBHOOK] Message processed successfully
   \`\`\`

### 9.3 Verify in Dashboard

1. Go to **Inbox** in your dashboard
2. You should see the conversation
3. Reply from dashboard to test outbound

---

## Step 10: Configure Message Templates

WhatsApp requires pre-approved templates for initiating conversations.

### Create Template in Meta

1. Go to **WhatsApp → Manager**
2. Click **"Message Templates"**
3. Click **"Create Template"**
4. Fill in:
   - **Name**: `welcome_message` (lowercase, underscores only)
   - **Category**: Choose one:
     - MARKETING - Promotional content
     - UTILITY - Account updates, transactions
     - AUTHENTICATION - OTP, verification
   - **Language**: en_US (or your language)
5. Design template:
   - **Header** (optional): Text, image, video, or document
   - **Body**: Your message with {{1}} placeholders for variables
   - **Footer** (optional): Small print text
   - **Buttons** (optional): Call to action, quick replies, URLs
6. Click **"Submit"**

**Approval Time:** Usually 24-48 hours

### Example Template

\`\`\`
Name: order_confirmation
Category: UTILITY
Language: en_US

Header: Order Confirmed ✅

Body: 
Hi {{1}}, 

Your order {{2}} has been confirmed! 

Total: {{3}}
Estimated delivery: {{4}}

Thank you for your purchase!

Footer: Reply STOP to unsubscribe

Buttons:
[View Order] → https://example.com/orders/{{5}}
[Contact Support]
\`\`\`

### Use Template in Your Platform

Once approved, add to your database:

\`\`\`bash
POST /api/templates
{
  "name": "order_confirmation",
  "language": "en_US",
  "category": "UTILITY",
  "bodyText": "Hi {{1}}, Your order {{2}} has been confirmed! Total: {{3}}...",
  "headerType": "TEXT",
  "headerText": "Order Confirmed ✅"
}
\`\`\`

Send template message:

\`\`\`bash
POST /api/messages/send-template
{
  "to": "+1234567890",
  "templateName": "order_confirmation",
  "languageCode": "en_US",
  "parameters": ["John", "ORD-12345", "$99.99", "Nov 15", "12345"]
}
\`\`\`

---

## Important Limits & Guidelines

### Message Limits (Tiers)

Your number has a messaging limit based on quality rating:

| Tier | Messages/Day |
|------|--------------|
| Tier 1 | 1,000 |
| Tier 2 | 10,000 |
| Tier 3 | 100,000 |
| Tier 4 | Unlimited (approved businesses) |

### Quality Rating

- **Green**: Good quality, maintain or increase tier
- **Yellow**: Warning, may be limited
- **Red**: Poor quality, severe limits or ban

**Maintain Quality:**
- Don't spam
- Get explicit opt-in
- Respond to customer messages
- Provide opt-out mechanism
- Use approved templates

### 24-Hour Window

- After customer messages you, you have 24 hours to respond freely
- After 24 hours, you must use approved templates
- Customer message reopens the 24-hour window

---

## Troubleshooting

### "Webhook verification failed"

- ✅ Check `WEBHOOK_VERIFY_TOKEN` matches Meta configuration
- ✅ Ensure endpoint returns challenge string exactly
- ✅ Use HTTPS (ngrok for local dev)
- ✅ Check server logs for errors

### "Invalid access token"

- ✅ Token expired (temporary tokens last 24h)
- ✅ Generate permanent token from System User
- ✅ Check token has correct permissions
- ✅ Verify WABA wasn't deleted/changed

### "Phone number not found"

- ✅ Use correct Phone Number ID (not actual phone number)
- ✅ Verify number is registered in WABA
- ✅ Check number status in WhatsApp Manager

### "Message template rejected"

- ✅ No promotional language in UTILITY category
- ✅ No illegal content
- ✅ Grammar and spelling correct
- ✅ Variables properly formatted {{1}}, {{2}}

---

## Production Checklist

- [ ] Permanent access token generated
- [ ] Token stored encrypted in database
- [ ] Webhook URL is HTTPS (SSL certificate)
- [ ] Webhook verify token is strong and random
- [ ] Message templates approved
- [ ] Quality rating is GREEN
- [ ] Business verification completed (if required)
- [ ] Privacy policy URL added
- [ ] Terms of service URL added
- [ ] Customer support contact set
- [ ] Opt-out mechanism implemented
- [ ] Rate limiting configured
- [ ] Monitoring and alerts set up

---

## Resources

- [Meta WhatsApp Business Platform Docs](https://developers.facebook.com/docs/whatsapp)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/api)
- [Message Templates Guide](https://developers.facebook.com/docs/whatsapp/message-templates)
- [Webhook Reference](https://developers.facebook.com/docs/whatsapp/webhooks)
- [Business Manager](https://business.facebook.com/)

---

## Support

Need help? 
- Meta Support: [developers.facebook.com/support](https://developers.facebook.com/support)
- Our Discord: [Join Community](#)
- GitHub Issues: [Report Issue](https://github.com/vikkkas/whatsapp-number-api-manager/issues)
