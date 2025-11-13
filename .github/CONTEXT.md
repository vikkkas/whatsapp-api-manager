# WhatsApp SaaS Multi-Tenant Platform - GitHub Context

## Project Overview
A production-ready, multi-tenant WhatsApp Business API (WABA) SaaS platform built with modern web technologies. The platform enables businesses to manage WhatsApp conversations, send messages, and handle customer communications at scale.

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5+ (strict mode)
- **Framework**: Express.js
- **Database**: PostgreSQL 15+ (Neon)
- **ORM**: Prisma 5.x
- **Cache/Queue**: Redis + BullMQ
- **Authentication**: JWT (access + refresh tokens)
- **Encryption**: AES-256-GCM, bcrypt
- **Logging**: Winston
- **Validation**: Zod

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **UI Library**: Shadcn/ui + Tailwind CSS
- **State Management**: React hooks
- **Date Handling**: date-fns
- **HTTP Client**: Fetch API

### Infrastructure
- **Hosting**: Vercel (frontend), Cloud platform (backend)
- **Database**: Neon PostgreSQL (serverless)
- **Cache**: Redis Labs / Upstash Redis
- **CI/CD**: GitHub Actions (planned)
- **Monitoring**: Health check endpoints (Kubernetes-ready)

## Architecture

### Multi-Tenant Design
- **Tenant Isolation**: All database queries automatically scoped to tenant
- **Authentication**: JWT with tenant context embedded
- **Data Model**: Single database with tenantId on all tables
- **Billing**: Per-tenant plan limits and usage tracking

### Backend Architecture
```
┌─────────────────────────────────────────────────────┐
│                   API Gateway (Express)              │
│  [Helmet, CORS, Rate Limiting, Auth Middleware]     │
└───────────────────┬─────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
   ┌────▼────┐ ┌───▼────┐ ┌───▼────┐
   │  Auth   │ │Messages│ │Webhooks│
   │ Routes  │ │ Routes │ │ Routes │
   └────┬────┘ └───┬────┘ └───┬────┘
        │          │           │
        └──────────┼───────────┘
                   │
        ┌──────────▼──────────┐
        │   Prisma Client     │
        │  (Tenant-scoped)    │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  PostgreSQL (Neon)  │
        └─────────────────────┘

        Async Processing:
        ┌──────────────────────┐
        │   BullMQ Queues      │
        │  • Webhook Processor │
        │  • Message Sender    │
        │  • Campaign Queue    │
        └──────────┬───────────┘
                   │
        ┌──────────▼──────────┐
        │   Worker Processes  │
        └─────────────────────┘
```

### Database Schema

**Core Models:**
- `Tenant` - Organization/company
- `AdminUser` - Tenant admins (login access)
- `Agent` - Customer service agents
- `WABACredential` - WhatsApp Business API credentials (encrypted)
- `Conversation` - Chat threads with customers
- `Message` - Individual messages
- `Template` - WhatsApp message templates
- `RawWebhookEvent` - Persist-first webhook storage
- `DailyUsage` - Usage tracking for billing

**Key Features:**
- Automatic timestamps (createdAt, updatedAt)
- Soft deletes via status fields
- Compound indexes for performance
- Foreign key constraints with cascade
- Encrypted credentials storage

## API Routes

### Authentication (`/api/auth`)
- `POST /register` - Create new tenant + admin user
- `POST /login` - Email/password authentication
- `POST /refresh` - Refresh access token
- `GET /me` - Get current user info

### Messages (`/api/messages`)
- `GET /` - List messages (paginated, filtered)
- `GET /:id` - Get specific message
- `POST /` - Send message to WhatsApp API
- `PATCH /:id` - Update message status

### Conversations (`/api/conversations`)
- `GET /` - List conversations (paginated, filtered)
- `GET /:id` - Get conversation with messages
- `PATCH /:id` - Update status, assign agent
- `DELETE /:id` - Archive conversation
- `GET /stats/summary` - Statistics

### Webhooks (`/api/webhook`)
- `GET /` - Meta webhook verification
- `POST /` - Receive webhook events

### Health (`/api/health`)
- `GET /health` - Overall health check
- `GET /ready` - Readiness probe
- `GET /live` - Liveness probe

## Security Features

### Authentication & Authorization
- JWT-based authentication with 7-day expiry
- Refresh token rotation
- Bcrypt password hashing (10 rounds)
- Role-based access control (SYSTEM_ADMIN, TENANT_ADMIN, AGENT)
- Tenant isolation middleware

### Data Protection
- AES-256-GCM encryption for WABA credentials
- Environment-based encryption keys
- SQL injection protection (Prisma)
- XSS protection (Helmet)
- CORS configuration
- Rate limiting per tenant

### Infrastructure Security
- HTTPS enforced in production
- Secure headers (Helmet.js)
- Trust proxy for load balancers
- Environment variable validation
- Secrets in environment, never committed

## Development Workflow

### Project Structure
```
whatsapp-number-api-manager/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── scripts/
│   │   ├── seed.ts                # Demo data seeder
│   │   ├── createAdmin.js         # Admin creation utility
│   │   └── cleanDb.js             # Database cleanup
│   ├── src/
│   │   ├── config/
│   │   │   ├── prisma.ts          # Prisma client singleton
│   │   │   ├── redis.ts           # Redis connection
│   │   │   └── queues.ts          # BullMQ queue setup
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT authentication
│   │   │   └── tenant.ts          # Tenant isolation
│   │   ├── routes/
│   │   │   ├── auth.ts            # Auth endpoints
│   │   │   ├── messages.ts        # Message CRUD
│   │   │   ├── conversations.ts   # Conversation CRUD
│   │   │   ├── webhook.ts         # Meta webhook handler
│   │   │   ├── templates.ts       # Template management
│   │   │   ├── settings.ts        # Settings API
│   │   │   ├── analytics.ts       # Analytics endpoints
│   │   │   ├── health.ts          # Health checks
│   │   │   ├── media.ts           # File upload/serve
│   │   │   └── contacts.ts        # Contact management
│   │   ├── utils/
│   │   │   ├── encryption.ts      # AES encryption + bcrypt
│   │   │   ├── logger.ts          # Winston logger
│   │   │   ├── rateLimiter.ts     # Token bucket rate limiter
│   │   │   └── tenantHelpers.ts   # Tenant utility functions
│   │   ├── workers/
│   │   │   ├── webhook-processor.ts  # Process webhook events
│   │   │   ├── message-sender.ts     # Send to WhatsApp API
│   │   │   └── index.ts              # Worker orchestrator
│   │   └── server.ts              # Main Express app
│   ├── .env                       # Environment variables
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # Shadcn components
│   │   │   ├── MessageThread.tsx  # Message display
│   │   │   ├── AppSidebar.tsx     # Navigation
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── FileUpload.tsx     # File upload component
│   │   │   └── FilePreview.tsx    # File preview component
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx    # Auth provider & hooks
│   │   ├── services/
│   │   │   └── websocket.ts       # WebSocket service
│   │   ├── stores/
│   │   │   ├── authStore.ts       # Zustand auth state
│   │   │   ├── conversationStore.ts
│   │   │   ├── messageStore.ts
│   │   │   └── uiStore.ts
│   │   ├── pages/
│   │   │   ├── Login.tsx          # Login page
│   │   │   ├── Inbox.tsx          # Conversation list
│   │   │   ├── SendMessage.tsx    # Send message UI
│   │   │   ├── SendMessageEnhanced.tsx # Enhanced send with media
│   │   │   ├── Templates.tsx      # Template management
│   │   │   ├── TemplateManagement.tsx  # Full template CRUD
│   │   │   ├── Settings.tsx       # Settings page
│   │   │   ├── Analytics.tsx      # Analytics dashboard
│   │   │   ├── ContactManagement.tsx   # Contact CRUD
│   │   │   └── UserManagement.tsx
│   │   ├── lib/
│   │   │   ├── api.ts             # API client
│   │   │   ├── utils.ts           # Utilities
│   │   │   └── phoneUtils.ts      # Phone formatting
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env                       # Frontend env vars
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── docs/                          # Documentation
├── .github/                       # GitHub workflows
└── README.md
```

### Environment Variables

**Backend (.env):**
```env
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Redis
REDIS_URL=redis://default:pass@host:port

# Authentication
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-encryption-key-uuid

# Server
PORT=3000
NODE_ENV=development

# Frontend (for CORS)
FRONTEND_URL=http://localhost:5173
```

**Frontend (.env):**
```env
VITE_BACKEND_URL=http://localhost:3000
```

### NPM Scripts

**Backend:**
```json
{
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "worker:dev": "tsx watch src/workers/index.ts",
  "worker:start": "node dist/workers/index.js",
  "db:generate": "prisma generate",
  "db:push": "prisma db push",
  "db:migrate": "prisma migrate dev",
  "db:seed": "tsx scripts/seed.ts",
  "db:studio": "prisma studio"
}
```

**Frontend:**
```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "lint": "eslint ."
}
```

## Development Phases

### ✅ Phase 1: Backend Foundation (COMPLETE)
- [x] PostgreSQL + Prisma multi-tenant schema
- [x] TypeScript conversion (100%)
- [x] JWT authentication with refresh tokens
- [x] Tenant isolation middleware
- [x] Message CRUD routes
- [x] Conversation CRUD routes
- [x] Webhook persist-first handler
- [x] Worker processes (webhook, message sender)
- [x] Rate limiting (token bucket)
- [x] Encryption utilities
- [x] Health check endpoints
- [x] Demo data seeding
- [x] Redis + BullMQ integration
- [x] Logging with Winston

### 🔄 Phase 2: Frontend Integration (COMPLETE ✅)
- [x] API client with TypeScript
- [x] Login page with demo credentials
- [x] Inbox/conversation list
- [x] Message thread component
- [x] Auth context & protected routes
- [x] Real-time updates (WebSocket)
- [x] Send message UI with file upload
- [x] Template management UI
- [x] Settings page (basic)
- [x] Analytics dashboard (basic)

### ⚡ Phase 3: Core Features (IN PROGRESS - 70% Complete)
- [x] File upload for media messages (images, videos, audio, documents)
- [x] Template message management (create, edit, delete, preview)
- [x] Contact management (CRUD, import/export CSV, search)
- [x] WebSocket real-time updates (fully functional)
- [ ] Agent assignment workflow (pending)
- [ ] Advanced search & filters (pending)
- [ ] Tags & notes (in progress)
- [ ] Bulk messaging campaigns (pending)
- [ ] Export conversations (PDF/CSV) (pending)

### 📋 Phase 4: Advanced Features (PLANNED)
- [x] WebSocket for real-time updates (moved to Phase 3, completed)
- [ ] Chatbot/auto-reply rules
- [ ] Canned responses
- [ ] Message scheduling
- [ ] Campaign management
- [ ] Advanced analytics & reporting
- [ ] Multi-language support
- [ ] Keyboard shortcuts
- [ ] Message templates with variables
- [ ] Auto-assignment rules (round-robin, least busy)

### 📋 Phase 5: Production (PLANNED)
- [ ] CI/CD with GitHub Actions
- [ ] Docker containerization
- [ ] Kubernetes deployment
- [ ] Monitoring (Prometheus/Grafana)
- [ ] Error tracking (Sentry)
- [ ] Log aggregation
- [ ] Database backups
- [ ] Load testing
- [ ] Security audit
- [ ] Documentation site

## Demo Credentials

**Admin User:**
- Email: `admin@demo.com`
- Password: `admin123`
- Role: TENANT_ADMIN
- Tenant: Demo Company

**Demo Data:**
- 5 conversations with sample messages
- 3 approved templates
- 1 WABA credential (dummy)
- 1 agent

## Testing

### Manual Testing
1. **Backend Health Check:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Login:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@demo.com","password":"admin123"}'
   ```

3. **List Conversations:**
   ```bash
   curl http://localhost:3000/api/conversations \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Database Testing
```bash
# Open Prisma Studio
cd backend
npm run db:studio

# Re-seed database
npm run db:seed
```

## Deployment

### Backend (Docker)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Frontend (Vercel)
- Auto-deploys from `main` branch
- Environment variables configured in Vercel dashboard
- Build command: `npm run build`
- Output directory: `dist`

### Environment Setup
1. PostgreSQL database (Neon, AWS RDS, etc.)
2. Redis instance (Redis Labs, Upstash, etc.)
3. Environment variables configured
4. Database migrations run
5. Seed data populated

## Key Design Decisions

### Why Multi-Tenant Single Database?
- Simpler infrastructure management
- Cost-effective for small/medium scale
- Easier to implement cross-tenant features
- Single schema migration path

### Why Persist-First Webhooks?
- Ensures no webhook data loss
- Decouples receiving from processing
- Enables retry logic
- Provides audit trail

### Why BullMQ?
- Redis-backed (fast, reliable)
- Built-in retry mechanisms
- Job prioritization
- Progress tracking
- UI dashboard available

### Why Prisma?
- Type-safe database access
- Automatic migrations
- Excellent TypeScript support
- Query optimization
- Built-in connection pooling

## Common Tasks

### Add New Route
1. Create route file in `backend/src/routes/`
2. Implement with authentication middleware
3. Add tenant isolation
4. Register in `server.ts`
5. Update API client in `frontend/src/lib/api.ts`

### Add New Database Model
1. Update `prisma/schema.prisma`
2. Run `npm run db:generate`
3. Run `npm run db:push` (dev) or `npm run db:migrate` (prod)
4. Update TypeScript types if needed

### Debug Issues
1. Check backend logs (Winston output)
2. Check Prisma Studio for data
3. Check Redis for queue status
4. Check browser Network tab
5. Check environment variables

## Performance Considerations

### Database
- Indexes on frequently queried fields
- Compound indexes for multi-column queries
- Connection pooling via Prisma
- Prepared statements (automatic with Prisma)

### Caching
- Redis for rate limiting
- Redis for queue state
- Consider adding Redis caching layer for hot data

### API
- Pagination on all list endpoints
- Field selection to reduce payload
- Compression enabled (gzip)
- Rate limiting to prevent abuse

## Security Checklist

- [ ] All secrets in environment variables
- [ ] JWT secret rotated regularly
- [ ] HTTPS enforced in production
- [ ] CORS properly configured
- [ ] SQL injection protected (Prisma)
- [ ] XSS protected (sanitization)
- [ ] CSRF tokens for state-changing operations
- [ ] Rate limiting enabled
- [ ] Input validation (Zod schemas)
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't include PII
- [ ] Database backups configured
- [ ] Dependencies regularly updated

## Troubleshooting

### Common Issues

**"Cannot find module" errors:**
- Run `npm install` in both backend and frontend
- Check TypeScript paths in `tsconfig.json`
- Verify file extensions (`.js` for imports)

**Database connection errors:**
- Verify `DATABASE_URL` in `.env`
- Check network connectivity to database
- Ensure database exists and is accessible
- Run `npx prisma db push` to sync schema

**Redis connection timeouts:**
- Verify `REDIS_URL` format: `redis://user:pass@host:port`
- Check Redis server is running
- Verify firewall rules
- Test with Redis CLI

**401 Unauthorized:**
- Token expired (7-day lifetime)
- Invalid token format
- Check `Authorization: Bearer TOKEN` header
- Clear localStorage and re-login

**CORS errors:**
- Verify `FRONTEND_URL` in backend `.env`
- Check CORS middleware configuration
- Ensure frontend URL matches exactly

## Contributing Guidelines

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Functional components (React)
- Async/await over promises
- Descriptive variable names
- Comments for complex logic

### Commit Messages
- Use conventional commits
- Format: `type(scope): message`
- Types: feat, fix, docs, style, refactor, test, chore
- Example: `feat(auth): add refresh token rotation`

### Pull Requests
- Link to issue/feature request
- Description of changes
- Screenshots for UI changes
- Tests passing
- No merge conflicts

## License
[Specify your license]

## Contact
[Your contact information]

---

**Last Updated:** November 13, 2025  
**Version:** 2.5.0  
**Status:** Phase 3 - Core Features (70% Complete)

## Recent Updates (November 13, 2025)

### Completed Features:
- ✅ **WebSocket Real-Time Updates**: Full implementation with JWT auth, message/conversation events, typing indicators
- ✅ **File Upload System**: Frontend FileUpload component with drag-and-drop, backend media routes, support for images/videos/audio/documents
- ✅ **Template Management**: Complete CRUD with preview, search/filters, variable substitution
- ✅ **Contact Management**: Full CRUD, import/export CSV, search, stats dashboard
- ✅ **Enhanced Send Message UI**: Tabbed interface for different message types, file preview, captions
- ✅ **AuthContext**: Centralized authentication with login/logout/refresh methods
- ✅ **API Enhancements**: Added contactAPI, campaignAPI, enhanced templateAPI with all CRUD operations

### Database Updates:
- Added `Contact` model with relations to Tenant and Conversation
- Updated Prisma schema with proper indexes and constraints
- Contact-Conversation linking for better relationship tracking

### In Progress:
- 🔨 Tags & Notes system
- 🔨 Agent assignment workflow
- 🔨 Advanced search & filters

### Upcoming:
- Bulk messaging campaigns
- Export functionality (PDF/CSV)
- Advanced analytics
