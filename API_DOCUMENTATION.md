# WhatsApp SaaS API Documentation

## 🚀 Quick Start

### Servers Running
- **Backend:** http://localhost:3000
- **Frontend:** http://localhost:8080
- **Health Check:** http://localhost:3000/api/health

### Admin Credentials
- **Email:** admin@gmail.com
- **Password:** admin123456

---

## 📋 API Overview

Base URL: `http://localhost:3000/api`

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🔐 Authentication Endpoints

### 1. Register New Tenant

**POST** `/api/auth/register`

Create a new tenant account with admin user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "name": "John Doe",
  "tenantName": "My Company",
  "tenantSlug": "my-company"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "TENANT_ADMIN"
    },
    "tenant": {
      "id": "tenant-uuid",
      "name": "My Company",
      "slug": "my-company",
      "plan": "free",
      "status": "TRIAL"
    },
    "token": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

---

### 2. Login

**POST** `/api/auth/login`

Authenticate and receive JWT tokens.

**Request Body:**
```json
{
  "email": "admin@gmail.com",
  "password": "admin123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cmhvxpb8x0003y4qz8iqg0nuj",
      "email": "admin@gmail.com",
      "name": "Vikas",
      "role": "TENANT_ADMIN"
    },
    "tenant": {
      "id": "cmhvxpb3h0001y4qz0iyxleh1",
      "name": "Diviner",
      "slug": "diviner",
      "plan": "free",
      "status": "ACTIVE",
      "themeColor": "#6366f1",
      "logoUrl": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - Account deactivated/suspended
- `400 Bad Request` - Validation error

---

### 3. Refresh Token

**POST** `/api/auth/refresh`

Get a new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "your-refresh-token-here"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "new-access-token",
    "refreshToken": "new-refresh-token"
  }
}
```

---

### 4. Get Current User

**GET** `/api/auth/me`

Get authenticated user's profile.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "admin@gmail.com",
    "name": "Vikas",
    "role": "TENANT_ADMIN",
    "tenantId": "tenant-uuid",
    "tenant": {
      "name": "Diviner",
      "plan": "free",
      "status": "ACTIVE"
    }
  }
}
```

---

## 💬 Message Endpoints

### 1. Get All Messages

**GET** `/api/messages`

List messages with pagination and filters.

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 20)
- `conversationId` (string) - Filter by conversation
- `direction` (string) - INBOUND or OUTBOUND
- `status` (string) - PENDING, SENT, DELIVERED, READ, FAILED

**Example:**
```
GET /api/messages?page=1&limit=20&direction=INBOUND
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg-uuid",
        "conversationId": "conv-uuid",
        "direction": "INBOUND",
        "status": "READ",
        "from": "+1234567890",
        "to": "PHONE_NUMBER_ID",
        "type": "TEXT",
        "text": "Hello!",
        "createdAt": "2025-11-12T10:00:00Z",
        "conversation": {
          "contactPhone": "+1234567890",
          "contactName": "John Doe"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

---

### 2. Send Message

**POST** `/api/messages`

Send a message via WhatsApp Business API.

**Request Body (Text Message):**
```json
{
  "phoneNumberId": "YOUR_PHONE_NUMBER_ID",
  "to": "+1234567890",
  "type": "text",
  "text": "Hello from WhatsApp SaaS!"
}
```

**Request Body (Image):**
```json
{
  "phoneNumberId": "YOUR_PHONE_NUMBER_ID",
  "to": "+1234567890",
  "type": "image",
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Check out this image!"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "msg-uuid",
      "conversationId": "conv-uuid",
      "direction": "OUTBOUND",
      "status": "PENDING",
      "from": "PHONE_NUMBER_ID",
      "to": "+1234567890",
      "type": "TEXT",
      "text": "Hello from WhatsApp SaaS!",
      "createdAt": "2025-11-12T10:00:00Z"
    },
    "waMessageId": "wamid.XXX"
  }
}
```

---

## 💬 Conversation Endpoints

### 1. Get All Conversations

**GET** `/api/conversations`

List conversations with filters.

**Query Parameters:**
- `page` (number) - Page number
- `limit` (number) - Items per page
- `status` (string) - OPEN, PENDING, RESOLVED, ARCHIVED
- `search` (string) - Search by contact name/phone

**Example:**
```
GET /api/conversations?status=OPEN&page=1&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conv-uuid",
        "contactPhone": "+1234567890",
        "contactName": "John Doe",
        "status": "OPEN",
        "unreadCount": 3,
        "lastMessageAt": "2025-11-12T10:00:00Z",
        "messages": [
          {
            "id": "msg-uuid",
            "text": "Last message preview",
            "direction": "INBOUND",
            "createdAt": "2025-11-12T10:00:00Z"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

---

### 2. Get Conversation by ID

**GET** `/api/conversations/:id`

Get a single conversation with all messages.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "conv-uuid",
    "contactPhone": "+1234567890",
    "contactName": "John Doe",
    "status": "OPEN",
    "unreadCount": 0,
    "lastMessageAt": "2025-11-12T10:00:00Z",
    "messages": [
      {
        "id": "msg-uuid",
        "text": "Hello!",
        "direction": "INBOUND",
        "status": "READ",
        "createdAt": "2025-11-12T09:00:00Z"
      },
      {
        "id": "msg-uuid-2",
        "text": "Hi there!",
        "direction": "OUTBOUND",
        "status": "DELIVERED",
        "createdAt": "2025-11-12T09:01:00Z"
      }
    ]
  }
}
```

---

### 3. Update Conversation

**PATCH** `/api/conversations/:id`

Update conversation metadata.

**Request Body:**
```json
{
  "status": "RESOLVED",
  "contactName": "John Smith",
  "assignedAgentId": "agent-uuid"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "conv-uuid",
    "status": "RESOLVED",
    "contactName": "John Smith",
    "updatedAt": "2025-11-12T10:30:00Z"
  }
}
```

---

### 4. Archive Conversation

**DELETE** `/api/conversations/:id`

Archive a conversation.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Conversation archived successfully"
}
```

---

## 📋 Template Endpoints

### 1. Get All Templates

**GET** `/api/templates`

List all message templates.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "template-uuid",
      "name": "welcome_message",
      "content": "Hello {{name}}, welcome to our service!",
      "category": "marketing",
      "variables": ["name"],
      "createdAt": "2025-11-12T08:00:00Z"
    }
  ]
}
```

---

### 2. Create Template

**POST** `/api/templates`

Create a new message template.

**Request Body:**
```json
{
  "name": "welcome_message",
  "content": "Hello {{name}}, welcome to {{company}}!",
  "category": "marketing"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "template-uuid",
    "name": "welcome_message",
    "content": "Hello {{name}}, welcome to {{company}}!",
    "category": "marketing",
    "variables": ["name", "company"]
  }
}
```

---

## ⚙️ Settings Endpoints

### 1. Get Settings

**GET** `/api/settings`

Get tenant settings including WABA credentials.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "wabaCredentials": {
      "phoneNumberId": "YOUR_PHONE_NUMBER_ID",
      "businessAccountId": "YOUR_BUSINESS_ACCOUNT_ID",
      "accessToken": "encrypted-token"
    },
    "webhookUrl": "https://your-domain.com/api/webhook",
    "timezone": "America/New_York",
    "notifications": {
      "email": true,
      "inApp": true
    }
  }
}
```

---

### 2. Update Settings

**PUT** `/api/settings`

Update tenant settings.

**Request Body:**
```json
{
  "wabaCredentials": {
    "phoneNumberId": "NEW_PHONE_NUMBER_ID",
    "accessToken": "NEW_ACCESS_TOKEN",
    "businessAccountId": "NEW_BUSINESS_ACCOUNT_ID"
  },
  "timezone": "America/Los_Angeles"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Settings updated successfully"
  }
}
```

---

## 📊 Analytics Endpoints

### 1. Get Analytics

**GET** `/api/analytics`

Get conversation and message analytics.

**Query Parameters:**
- `startDate` (string) - ISO date (e.g., "2024-01-01")
- `endDate` (string) - ISO date (e.g., "2024-12-31")

**Example:**
```
GET /api/analytics?startDate=2024-01-01&endDate=2024-12-31
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalMessages": 1500,
    "inboundMessages": 800,
    "outboundMessages": 700,
    "totalConversations": 250,
    "openConversations": 45,
    "averageResponseTime": 120,
    "messagesByDay": [
      {
        "date": "2024-01-01",
        "count": 50
      }
    ],
    "conversationsByStatus": {
      "OPEN": 45,
      "PENDING": 30,
      "RESOLVED": 175
    }
  }
}
```

---

## 🔔 Webhook Endpoints

### 1. Webhook Verification

**GET** `/api/webhook`

Verify webhook for WhatsApp Business API.

**Query Parameters:**
- `hub.mode` - "subscribe"
- `hub.verify_token` - Your verify token
- `hub.challenge` - Challenge string

**Example:**
```
GET /api/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
```

**Response:** Returns the challenge string

---

### 2. Receive Webhook

**POST** `/api/webhook`

Receive incoming WhatsApp messages and events.

**Request Body (WhatsApp Format):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15551234567",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "contacts": [
              {
                "profile": {
                  "name": "John Doe"
                },
                "wa_id": "15559876543"
              }
            ],
            "messages": [
              {
                "from": "15559876543",
                "id": "wamid.XXX",
                "timestamp": "1625097600",
                "text": {
                  "body": "Hello!"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Response (200 OK):**
```
EVENT_RECEIVED
```

---

## ❤️ Health Check

**GET** `/api/health`

Check API health status.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T10:00:00Z",
  "uptime": 3600,
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

---

## 🔌 WebSocket Events

Connect to: `ws://localhost:3000`

**Authentication:**
Send token in connection handshake:
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});
```

### Events to Listen For:

1. **message:new** - New message received
```json
{
  "conversationId": "conv-uuid",
  "message": {
    "id": "msg-uuid",
    "text": "Hello!",
    "direction": "INBOUND",
    "createdAt": "2025-11-12T10:00:00Z"
  }
}
```

2. **message:status** - Message status updated
```json
{
  "conversationId": "conv-uuid",
  "messageId": "msg-uuid",
  "status": "DELIVERED"
}
```

3. **typing:start** - User started typing
```json
{
  "conversationId": "conv-uuid",
  "userId": "user-uuid"
}
```

4. **typing:stop** - User stopped typing
```json
{
  "conversationId": "conv-uuid",
  "userId": "user-uuid"
}
```

5. **user:online** - User came online
```json
{
  "userId": "user-uuid"
}
```

6. **user:offline** - User went offline
```json
{
  "userId": "user-uuid"
}
```

### Events to Emit:

1. **conversation:join** - Join a conversation room
```javascript
socket.emit('conversation:join', { conversationId: 'conv-uuid' });
```

2. **conversation:leave** - Leave a conversation room
```javascript
socket.emit('conversation:leave', { conversationId: 'conv-uuid' });
```

3. **typing:start** - Notify typing started
```javascript
socket.emit('typing:start', { conversationId: 'conv-uuid' });
```

4. **typing:stop** - Notify typing stopped
```javascript
socket.emit('typing:stop', { conversationId: 'conv-uuid' });
```

---

## 🧪 Testing with Postman

1. **Import Collection:** `WhatsApp-SaaS-API.postman_collection.json`

2. **Set Variables:**
   - `baseUrl`: http://localhost:3000
   - `token`: (auto-populated after login)

3. **Test Flow:**
   1. Run "Login" request
   2. Token is automatically saved
   3. All other requests will use the token

---

## 🐛 Common Errors

### 401 Unauthorized
- **Cause:** Invalid or expired token
- **Solution:** Login again to get new token

### 403 Forbidden
- **Cause:** Account suspended or insufficient permissions
- **Solution:** Check account status or role

### 400 Bad Request
- **Cause:** Invalid request body or parameters
- **Solution:** Check request format matches documentation

### 500 Internal Server Error
- **Cause:** Server error
- **Solution:** Check backend logs

---

## 📝 Rate Limiting

- **Default:** 100 requests per minute per tenant
- **Headers:** Response includes rate limit info:
  - `X-RateLimit-Limit`: Total allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

---

## 🔒 Security Best Practices

1. **Never commit** JWT secrets to version control
2. **Use HTTPS** in production
3. **Rotate tokens** regularly
4. **Validate** all inputs
5. **Encrypt** sensitive data (WABA credentials)
6. **Enable** CORS only for trusted origins

---

**Happy Testing! 🎉**
