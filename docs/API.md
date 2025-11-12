# API Documentation

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All endpoints (except `/auth/*` and `/webhook`) require authentication via JWT.

### Headers

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## 🔐 Authentication

### Register New Tenant

Create a new tenant account with admin user.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe",
  "tenantName": "Acme Corporation",
  "tenantSlug": "acme" // Unique identifier for tenant
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clxxx...",
      "email": "admin@example.com",
      "name": "John Doe",
      "role": "TENANT_ADMIN"
    },
    "tenant": {
      "id": "clyyy...",
      "name": "Acme Corporation",
      "slug": "acme",
      "plan": "free"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

### Login

Authenticate and receive access tokens.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "SecurePassword123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "tenant": { ... },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

### Refresh Token

Get new access token using refresh token.

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

---

## 📱 WABA Management

### Add WABA Credentials

Connect a WhatsApp Business Account to your tenant.

**Endpoint:** `POST /waba/credentials`

**Headers:** Requires authentication

**Request Body:**
```json
{
  "phoneNumberId": "123456789012345",
  "phoneNumber": "+1234567890",
  "accessToken": "EAAxxxxxxxxxxxx",
  "displayName": "My Business",
  "businessAccountId": "234567890123456" // Optional
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "clzzz...",
    "phoneNumberId": "123456789012345",
    "phoneNumber": "+1234567890",
    "displayName": "My Business",
    "isValid": true,
    "qualityRating": "GREEN",
    "messagingLimit": "TIER_1K"
  }
}
```

---

### List WABA Credentials

Get all WABA accounts for your tenant.

**Endpoint:** `GET /waba/credentials`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clzzz...",
      "phoneNumberId": "123456789012345",
      "phoneNumber": "+1234567890",
      "displayName": "My Business",
      "isValid": true,
      "lastValidatedAt": "2025-11-12T10:30:00Z"
    }
  ]
}
```

---

### Delete WABA Credential

Remove a WABA connection.

**Endpoint:** `DELETE /waba/credentials/:id`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "WABA credential deleted successfully"
}
```

---

## 💬 Messages

### Send Text Message

Send a simple text message.

**Endpoint:** `POST /messages/send`

**Request Body:**
```json
{
  "to": "+1234567890",
  "message": "Hello! How can I help you today?",
  "phoneNumberId": "123456789012345" // Optional: specify which number to send from
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "messageId": "clmsg...",
    "status": "PENDING",
    "queuedAt": "2025-11-12T10:30:00Z"
  }
}
```

---

### Send Media Message

Send image, video, audio, or document.

**Endpoint:** `POST /messages/send-media`

**Request Body:**
```json
{
  "to": "+1234567890",
  "mediaType": "image",
  "mediaUrl": "https://example.com/image.jpg",
  // OR
  "mediaId": "media-id-from-meta",
  "caption": "Check out this image!",
  "phoneNumberId": "123456789012345"
}
```

**Media Types:**
- `image` - JPEG, PNG
- `video` - MP4, 3GP
- `audio` - AAC, MP3, OGG
- `document` - PDF, DOC, XLSX, etc.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "messageId": "clmsg...",
    "status": "PENDING",
    "mediaType": "image"
  }
}
```

---

### Send Template Message

Send pre-approved template message.

**Endpoint:** `POST /messages/send-template`

**Request Body:**
```json
{
  "to": "+1234567890",
  "templateName": "order_confirmation",
  "languageCode": "en_US",
  "parameters": ["John", "ORD-12345", "$99.99"],
  "phoneNumberId": "123456789012345"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "messageId": "clmsg...",
    "status": "PENDING",
    "templateName": "order_confirmation"
  }
}
```

---

### List Messages

Get paginated message list for a conversation.

**Endpoint:** `GET /messages?conversationId={id}&page=1&limit=50`

**Query Parameters:**
- `conversationId` (required) - Conversation ID
- `page` (optional, default: 1)
- `limit` (optional, default: 50, max: 100)
- `direction` (optional) - Filter by INBOUND or OUTBOUND

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clmsg...",
      "direction": "INBOUND",
      "type": "TEXT",
      "text": "Hello!",
      "from": "+1234567890",
      "to": "+0987654321",
      "timestamp": "2025-11-12T10:30:00Z",
      "status": "DELIVERED"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

---

## 💬 Conversations

### List Conversations

Get all conversations for your tenant.

**Endpoint:** `GET /conversations?status=OPEN&page=1&limit=20`

**Query Parameters:**
- `status` (optional) - OPEN, PENDING, RESOLVED, ARCHIVED
- `assignedAgentId` (optional) - Filter by assigned agent
- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `search` (optional) - Search by contact name or phone

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clconv...",
      "contactPhone": "+1234567890",
      "contactName": "John Doe",
      "status": "OPEN",
      "unreadCount": 3,
      "lastMessageAt": "2025-11-12T10:30:00Z",
      "assignedAgent": {
        "id": "clagent...",
        "name": "Support Agent"
      },
      "lastMessage": {
        "text": "Thank you!",
        "direction": "INBOUND"
      }
    }
  ],
  "pagination": { ... }
}
```

---

### Get Conversation Details

Get full conversation with messages.

**Endpoint:** `GET /conversations/:id`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "clconv...",
    "contactPhone": "+1234567890",
    "contactName": "John Doe",
    "status": "OPEN",
    "messages": [ ... ],
    "assignedAgent": { ... },
    "tags": ["support", "urgent"],
    "notes": "VIP customer"
  }
}
```

---

### Update Conversation

Update conversation status, assignment, or notes.

**Endpoint:** `PATCH /conversations/:id`

**Request Body:**
```json
{
  "status": "RESOLVED",
  "assignedAgentId": "clagent...",
  "tags": ["resolved", "billing"],
  "notes": "Issue resolved via refund"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { ... }
}
```

---

## 📊 Analytics

### Dashboard Stats

Get overview statistics.

**Endpoint:** `GET /analytics/dashboard`

**Query Parameters:**
- `period` (optional) - today, week, month (default: month)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "today": {
      "messagesSent": 125,
      "messagesReceived": 89,
      "messagesDelivered": 120,
      "messagesFailed": 2
    },
    "thisWeek": {
      "messagesSent": 1250,
      "messagesReceived": 890,
      "activeConversations": 45
    },
    "thisMonth": {
      "messagesSent": 4500,
      "messagesReceived": 3200,
      "conversationsStarted": 125,
      "conversationsResolved": 98
    }
  }
}
```

---

### Message Charts

Get message data for charting.

**Endpoint:** `GET /analytics/messages?period=week`

**Query Parameters:**
- `period` - week, month, year
- `groupBy` - day, week, month

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-11-12",
      "sent": 150,
      "received": 120,
      "delivered": 145,
      "failed": 2
    }
  ]
}
```

---

## 🔧 Webhooks

### Webhook Verification (Meta)

Meta calls this to verify your webhook endpoint.

**Endpoint:** `GET /webhook?hub.mode=subscribe&hub.challenge=xxx&hub.verify_token=yyy`

**Response:** Returns the challenge string if verify token matches.

---

### Receive Webhook Events (Meta)

Meta sends webhook events here.

**Endpoint:** `POST /webhook`

**Note:** This endpoint is public but validates Meta's signature.

**Response:** `200 OK` (always respond quickly to Meta)

---

## 🎨 Templates

### List Templates

Get all approved message templates.

**Endpoint:** `GET /templates?status=APPROVED`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "cltmpl...",
      "name": "order_confirmation",
      "language": "en_US",
      "category": "UTILITY",
      "status": "APPROVED",
      "bodyText": "Hi {{1}}, your order {{2}} has been confirmed. Total: {{3}}",
      "headerType": "TEXT",
      "headerText": "Order Confirmation"
    }
  ]
}
```

---

### Create Template

Submit a new template to Meta for approval.

**Endpoint:** `POST /templates`

**Request Body:**
```json
{
  "name": "order_confirmation",
  "language": "en_US",
  "category": "UTILITY",
  "bodyText": "Hi {{1}}, your order {{2}} has been confirmed.",
  "headerType": "TEXT",
  "headerText": "Order Confirmation",
  "footerText": "Thank you for your order!",
  "buttons": [
    {
      "type": "URL",
      "text": "View Order",
      "url": "https://example.com/orders/{{1}}"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "cltmpl...",
    "status": "PENDING",
    "message": "Template submitted for Meta approval"
  }
}
```

---

## ⚠️ Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Detailed error message",
    "code": "ERROR_CODE"
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Common Error Codes

- `INVALID_CREDENTIALS` - Login failed
- `TENANT_SUSPENDED` - Account suspended
- `RATE_LIMIT_EXCEEDED` - Too many messages
- `WABA_TOKEN_INVALID` - WhatsApp token expired
- `MESSAGE_SEND_FAILED` - Failed to send message
- `RESOURCE_NOT_FOUND` - Resource doesn't exist

---

## 🔄 Rate Limits

### Per-Tenant Limits

Limits are based on your plan:

| Plan | Messages/Min | Phone Numbers | Agents |
|------|-------------|---------------|--------|
| Free | 60 | 1 | 2 |
| Starter | 120 | 3 | 5 |
| Pro | 300 | 10 | 20 |
| Enterprise | Custom | Unlimited | Unlimited |

### Rate Limit Headers

Responses include rate limit info:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699876543
```

---

## 📡 WebSockets / SSE

Real-time updates for conversations and messages.

**Endpoint:** `ws://localhost:3000/api/sse?token={accessToken}`

**Events:**
- `message:new` - New incoming message
- `message:status` - Message status update
- `conversation:update` - Conversation updated

---

## 🧪 Testing

Use the interactive Swagger UI at:

**http://localhost:3000/api-docs**

Or use cURL:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Send message
curl -X POST http://localhost:3000/api/messages/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"+1234567890","message":"Hello!"}'
```
