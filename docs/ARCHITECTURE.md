# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer (Nginx)                    │
└──────────────────────┬───────────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
┌────────▼────────┐         ┌────────▼────────┐
│   API Server    │         │   API Server    │  (Horizontally Scalable)
│   (Express +    │         │   (Express +    │
│    TypeScript)  │         │    TypeScript)  │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼──────────────┐
         │      Redis (BullMQ)         │
         │   • webhook-processor       │
         │   • message-send            │
         │   • campaign-runner         │
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │   Worker Processes          │
         │   (Background Jobs)         │
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │   PostgreSQL (Prisma)       │
         │   Multi-tenant Data         │
         └─────────────────────────────┘
```

## Data Flow

### Inbound Messages (Webhook)

```
Meta Webhook → API /webhook
                  │
                  ▼
           Persist RawWebhookEvent (database)
                  │
                  ▼
           Enqueue webhook-processor job (Redis)
                  │
                  ▼
           Worker picks up job
                  │
                  ├─→ Resolve tenant from phoneNumberId
                  ├─→ Check idempotency (waMessageId)
                  ├─→ Find/Create Conversation
                  ├─→ Create Message record
                  ├─→ Broadcast to UI via SSE/WebSocket
                  └─→ Mark RawWebhookEvent as PROCESSED
```

### Outbound Messages

```
API /messages/send
     │
     ├─→ Validate tenant & WABA credentials
     ├─→ Check rate limit (token bucket)
     ├─→ Create Message record (status: PENDING)
     │
     ▼
Enqueue message-send job (Redis)
     │
     ▼
Worker picks up job
     │
     ├─→ Get WABA credentials (decrypt token)
     ├─→ Acquire rate limit token
     ├─→ Call Meta API
     ├─→ Update Message status (SENT/FAILED)
     └─→ Broadcast status update to UI
```

## Multi-Tenancy

### Tenant Isolation Strategy

**Shared Schema with tenantId:**
- All tables include `tenantId` column
- Application-level enforcement via middleware
- Database indexes on `tenantId` for performance

### Tenant Resolution

1. **From JWT:** API requests include tenant claim in token
2. **From Webhook:** Resolve via `phoneNumberId` → `WABACredential` → `Tenant`
3. **From Worker:** Job data includes `tenantId`

### Per-Tenant Resources

- **WABA Credentials**: Encrypted access tokens
- **Rate Limits**: Token bucket per tenant
- **Themes**: Custom colors, logo, branding
- **Plan Limits**: Messages, phone numbers, agents

## Security Layers

### 1. Authentication & Authorization

```typescript
Request → Auth Middleware → Extract JWT
                            ↓
                    Verify signature
                            ↓
                    Decode payload { userId, tenantId, role }
                            ↓
                    Attach to req.user
                            ↓
                    Check tenant status (active/suspended)
                            ↓
                    Proceed to route handler
```

### 2. Tenant Context

```typescript
Route Handler → Tenant Middleware
                       ↓
                Get tenantId from req.user
                       ↓
                Attach to Prisma queries
                       ↓
           All queries auto-filtered by tenantId
```

### 3. Data Encryption

- **At Rest**: WABA tokens encrypted with AES-256-GCM
- **In Transit**: HTTPS/TLS for all communications
- **Secrets**: Environment variables, never in code

### 4. Rate Limiting

```typescript
// Token Bucket Algorithm
class TokenBucket {
  tokens: number          // Current available tokens
  maxTokens: number       // Bucket capacity (messages/min)
  refillRate: number      // Tokens added per second
  
  consume(n) {
    if (tokens >= n) {
      tokens -= n
      return { allowed: true }
    }
    return { allowed: false, retryAfter: ... }
  }
}
```

## Database Schema Highlights

### Core Entities

**Tenant** → Root entity for multi-tenancy
- Plan & limits
- Billing period
- Theme settings

**AdminUser** → Authenticated users
- Belongs to one tenant
- Role-based access (TENANT_ADMIN, AGENT, etc.)

**WABACredential** → WhatsApp Business Accounts
- Encrypted access tokens
- One tenant can have multiple numbers
- `phoneNumberId` is globally unique

**Conversation** → Chat threads
- Scoped by tenant + contactPhone
- Assignment to agents
- Status tracking (OPEN, RESOLVED, etc.)

**Message** → Individual messages
- Idempotency via `waMessageId` (inbound) and `clientMessageId` (outbound)
- Status lifecycle: PENDING → SENT → DELIVERED → READ

**RawWebhookEvent** → Persist-first pattern
- Stores original Meta payload
- Processing status (PENDING → PROCESSING → PROCESSED)
- Enables replay for recovery

## Queue Architecture

### Queue Types

1. **webhook-processor**
   - Priority: High
   - Retries: 5 with exponential backoff
   - Idempotent: Yes (via waMessageId)

2. **message-send**
   - Priority: Medium
   - Retries: 3
   - Rate-limited: Yes (per tenant)

3. **campaign-runner**
   - Priority: Low
   - Batch processing
   - Scheduled execution

### Worker Scaling

```
Queue Depth → CloudWatch Metric → Auto-scaling Policy
                                         ↓
                                  Launch more workers
```

## API Design Principles

### REST Conventions

- `GET` - Retrieve resources
- `POST` - Create resources
- `PATCH` - Update resources
- `DELETE` - Remove resources

### Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "message": "Human-readable error",
    "code": "ERROR_CODE"
  }
}
```

### Pagination

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Deployment Architecture

### Production Setup

```
                    ┌──────────────┐
                    │     CDN      │ (Static assets)
                    └──────────────┘
                           │
                    ┌──────▼──────┐
                    │   Nginx /   │
                    │     LB      │ (SSL termination)
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │ API #1  │       │ API #2  │       │ API #3  │
   └────┬────┘       └────┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │Worker#1 │       │Worker#2 │       │Worker#3 │
   └────┬────┘       └────┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
   ┌────▼────────┐                   ┌────────▼───┐
   │ PostgreSQL  │                   │   Redis    │
   │  (Primary)  │                   │  Cluster   │
   └────┬────────┘                   └────────────┘
        │
   ┌────▼────────┐
   │ PostgreSQL  │
   │ (Read Rep)  │
   └─────────────┘
```

## Monitoring & Observability

### Metrics to Track

**Application:**
- Request rate (req/sec)
- Response time (p50, p95, p99)
- Error rate (%)

**Queue:**
- Job throughput
- Queue depth
- Failed job rate
- Retry attempts

**Business:**
- Messages sent/received (per tenant)
- Active conversations
- WABA token validity
- Rate limit hits

### Logging Strategy

**Log Levels:**
- `error` - Failures requiring attention
- `warn` - Degraded state, still functional
- `info` - Normal operations
- `debug` - Detailed diagnostics

**Structured Logging:**
```json
{
  "timestamp": "2025-11-12T10:30:00Z",
  "level": "info",
  "service": "whatsapp-saas",
  "tenantId": "clxxx...",
  "userId": "clyyy...",
  "requestId": "req-abc123",
  "message": "Message sent successfully",
  "meta": {
    "messageId": "clmsg...",
    "to": "+1234567890"
  }
}
```

## Scaling Strategy

### Vertical Scaling (Instance Size)

- Start: 2 vCPU, 4GB RAM
- Medium: 4 vCPU, 8GB RAM  
- Large: 8 vCPU, 16GB RAM

### Horizontal Scaling

**API Servers:**
- Stateless design
- Scale out behind load balancer
- Target: CPU < 70%

**Workers:**
- Scale based on queue depth
- Target: Queue latency < 5s

**Database:**
- Read replicas for analytics
- Connection pooling (Prisma)
- Consider sharding at 100k+ tenants

### Caching Strategy

**Redis Cache:**
- Tenant metadata (1 hour TTL)
- WABA credentials (30 min TTL)
- Conversation unread counts (real-time)
- Rate limit buckets (5 min TTL)

## Theme System

### CSS Variables

```css
:root {
  --primary: var(--tenant-primary, #6366f1);
  --primary-foreground: #ffffff;
  --secondary: var(--tenant-secondary, #8b5cf6);
  --background: #ffffff;
  --foreground: #0a0a0a;
}

[data-theme="dark"] {
  --background: #0a0a0a;
  --foreground: #ffffff;
}
```

### Per-Tenant Customization

```typescript
// Load tenant theme on login
const theme = {
  primaryColor: tenant.themeColor,
  logoUrl: tenant.logoUrl,
  themeName: tenant.themeName, // 'default', 'dark', 'custom'
}

// Inject into document
document.documentElement.style.setProperty('--tenant-primary', theme.primaryColor)
```

## Future Enhancements

### Phase 2 (Campaigns)
- Bulk message scheduling
- Audience segmentation
- Campaign analytics

### Phase 3 (Flow Builder)
- Visual automation builder
- Conditional logic
- API integrations

### Phase 4 (Advanced)
- AI chatbot integration
- Multi-language support
- Advanced analytics
- Team collaboration

---

**This architecture is designed to scale from 1 to 10,000+ tenants while maintaining reliability, security, and performance.**
