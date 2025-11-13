# Backend Documentation

## Architecture Overview

Express.js REST API with TypeScript, PostgreSQL/Prisma, Redis/BullMQ queues, and Socket.io WebSocket support.

## Directory Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── db.js         # Database connection
│   │   ├── prisma.ts     # Prisma client instance
│   │   ├── redis.ts      # Redis client
│   │   └── queues.ts     # BullMQ queue setup
│   ├── controllers/      # Business logic controllers
│   │   ├── authController.js
│   │   ├── messageController.js
│   │   ├── analyticsController.js
│   │   └── webhookController.js
│   ├── middleware/       # Express middleware
│   │   ├── auth.js       # JWT authentication
│   │   └── tenant.js     # Tenant isolation
│   ├── models/           # Legacy Mongoose models (deprecated)
│   ├── routes/           # API route definitions
│   │   ├── auth.ts       # /api/auth
│   │   ├── messages.ts   # /api/messages
│   │   ├── conversations.ts # /api/conversations
│   │   ├── templates.ts  # /api/templates
│   │   ├── analytics.ts  # /api/analytics
│   │   ├── settings.ts   # /api/settings
│   │   ├── contacts.ts   # /api/contacts
│   │   └── webhook.ts    # /api/webhook
│   ├── services/         # External service integrations
│   │   ├── metaAPI.ts    # WhatsApp Business API
│   │   └── websocket.ts  # Socket.io server
│   ├── utils/            # Helper utilities
│   │   ├── logger.js     # Winston logger
│   │   ├── mediaHandler.js # File upload handling
│   │   └── encryption.ts # Data encryption
│   ├── workers/          # Background job processors
│   │   └── webhook-processor.ts
│   └── server.js         # Main server file
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
├── scripts/              # Utility scripts
│   ├── createAdmin.ts    # Create admin user
│   └── seedData.js       # Seed test data
└── uploads/
    └── media/            # Uploaded files storage
```

## API Endpoints

### Authentication (`/api/auth`)

#### POST `/api/auth/register`
Register new tenant and admin user.

**Request:**
```json
{
  "tenantName": "Company Name",
  "email": "admin@company.com",
  "password": "SecurePass123!",
  "name": "Admin User"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "role": "OWNER" },
    "tenant": { "id": "...", "name": "..." },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### POST `/api/auth/login`
User login.

**Request:**
```json
{
  "email": "admin@company.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "role": "OWNER" },
    "tenant": { "id": "...", "name": "..." },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### GET `/api/auth/me`
Get current user info (requires auth).

### Messages (`/api/messages`)

#### GET `/api/messages`
List messages with pagination and filters.

**Query Parameters:**
- `conversationId` - Filter by conversation
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `direction` - INBOUND or OUTBOUND
- `status` - SENT, DELIVERED, READ, FAILED

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

#### POST `/api/messages`
Send a new message.

**Request:**
```json
{
  "to": "+1234567890",
  "type": "text",
  "content": {
    "text": "Hello from API!"
  }
}
```

**For media messages:**
```json
{
  "to": "+1234567890",
  "type": "image",
  "content": {
    "mediaUrl": "https://...",
    "caption": "Check this out"
  }
}
```

#### GET `/api/messages/:id`
Get single message details.

### Conversations (`/api/conversations`)

#### GET `/api/conversations`
List conversations with pagination.

**Query Parameters:**
- `page`, `limit` - Pagination
- `status` - OPEN, CLOSED
- `search` - Search by phone number or name

#### GET `/api/conversations/:id`
Get conversation details with recent messages.

#### PATCH `/api/conversations/:id`
Update conversation (assign, status, tags).

**Request:**
```json
{
  "status": "CLOSED",
  "assignedTo": "user-id",
  "tags": ["support", "urgent"]
}
```

### Templates (`/api/templates`)

#### GET `/api/templates`
List WhatsApp message templates.

#### POST `/api/templates`
Create new template.

**Request:**
```json
{
  "name": "welcome_message",
  "category": "MARKETING",
  "language": "en",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Welcome!"
    },
    {
      "type": "BODY",
      "text": "Hello {{1}}, welcome to our service!"
    }
  ]
}
```

### Analytics (`/api/analytics`)

#### GET `/api/analytics/overview`
Get analytics overview.

**Query Parameters:**
- `days` - Number of days (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalMessages": 1523,
      "totalConversations": 245,
      "deliveryRate": 98.5,
      "sentToday": 45,
      "sentThisWeek": 312,
      "sentThisMonth": 1523
    },
    "messagesByStatus": {
      "sent": 1200,
      "delivered": 1150,
      "read": 900,
      "failed": 23
    },
    "dailyActivity": [
      { "date": "2025-11-13", "sent": 45, "received": 67 }
    ]
  }
}
```

### Settings (`/api/settings`)

#### GET `/api/settings`
Get tenant settings.

#### PATCH `/api/settings`
Update tenant settings.

**Request:**
```json
{
  "whatsappConfig": {
    "phoneNumberId": "...",
    "accessToken": "...",
    "businessAccountId": "..."
  },
  "webhookConfig": {
    "verifyToken": "...",
    "enabled": true
  }
}
```

### Contacts (`/api/contacts`)

#### GET `/api/contacts`
List contacts with pagination and search.

#### POST `/api/contacts`
Create new contact.

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "tags": ["customer", "vip"]
}
```

#### GET `/api/contacts/export`
Export contacts as CSV.

#### POST `/api/contacts/import/csv`
Import contacts from CSV file.

### Webhook (`/api/webhook`)

#### GET `/api/webhook`
Meta webhook verification endpoint.

#### POST `/api/webhook`
Receive WhatsApp webhook events from Meta.

## Authentication

All endpoints (except auth and webhook) require JWT authentication.

**Header:**
```
Authorization: Bearer <jwt-token>
```

**Token Refresh:**
Use `/api/auth/refresh` with refresh token to get new access token.

## Tenant Isolation

All data is automatically scoped to the authenticated user's tenant. The `tenantId` is extracted from the JWT and applied to all database queries.

## WebSocket Events

Socket.io connection on same port as HTTP server.

### Client → Server
- `join-conversation` - Join conversation room
- `leave-conversation` - Leave conversation room
- `typing-start` - User started typing
- `typing-stop` - User stopped typing

### Server → Client
- `message:new` - New message received
- `message:status` - Message status updated
- `conversation:updated` - Conversation updated
- `typing:start` - Other user typing
- `typing:stop` - Other user stopped typing

**Connection:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'jwt-token' }
});

socket.on('message:new', (message) => {
  console.log('New message:', message);
});
```

## Background Jobs

### Webhook Processing Queue
Processes incoming WhatsApp webhooks asynchronously.

**Job Data:**
```typescript
{
  rawEventId: string; // ID from RawWebhookEvent table
}
```

**Processing:**
1. Fetch raw event from database
2. Parse and validate webhook data
3. Create/update conversations
4. Create messages
5. Emit WebSocket events
6. Update message status

### Message Send Queue (Future)
Will handle outbound message sending with retries.

## Database Schema

### Key Models

**Tenant**
```prisma
model Tenant {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  users     AdminUser[]
  messages  Message[]
  // ...
}
```

**AdminUser**
```prisma
model AdminUser {
  id         String   @id @default(uuid())
  email      String   @unique
  password   String
  name       String
  role       Role     @default(ADMIN)
  tenantId   String
  tenant     Tenant   @relation(fields: [tenantId])
}

enum Role {
  OWNER
  ADMIN
  AGENT
}
```

**Message**
```prisma
model Message {
  id              String   @id @default(uuid())
  whatsappId      String?  @unique
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId])
  direction       Direction
  type            MessageType
  content         Json
  status          MessageStatus
  from            String
  to              String
  tenantId        String
  createdAt       DateTime @default(now())
}

enum Direction {
  INBOUND
  OUTBOUND
}

enum MessageType {
  TEXT
  IMAGE
  VIDEO
  AUDIO
  DOCUMENT
  TEMPLATE
}

enum MessageStatus {
  SENT
  DELIVERED
  READ
  FAILED
}
```

## Error Handling

All errors return consistent format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (dev only)"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Development

### Running Locally
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

### Database Commands
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

### Building
```bash
# TypeScript compilation
npm run build

# Start production server
npm start
```

## Environment Variables

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `META_ACCESS_TOKEN` - WhatsApp API token
- `META_PHONE_NUMBER_ID` - WhatsApp phone number ID

Optional:
- `PORT` - Server port (default: 3000)
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (info/debug/error)

## Security Best Practices

1. Always use HTTPS in production
2. Set strong JWT secrets
3. Enable CORS only for trusted origins
4. Validate all input data
5. Use prepared statements (Prisma handles this)
6. Implement rate limiting
7. Sanitize file uploads
8. Keep dependencies updated
9. Use environment variables for secrets
10. Enable database connection pooling
