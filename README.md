# WhatsApp Business API Manager - Multi-Tenant SaaS

A production-ready, multi-tenant SaaS platform for managing WhatsApp Business API communications at scale. Built with TypeScript, PostgreSQL, Redis, and modern best practices.

## 🚀 Features

- **Multi-Tenant Architecture** - Complete tenant isolation with per-tenant rate limiting
- **Persist-First Webhooks** - Reliable message processing with automatic retries
- **Type-Safe** - Full TypeScript implementation with strict type checking
- **Queue-Based Workers** - BullMQ for durable background job processing
- **Rate Limiting** - Token bucket algorithm for per-tenant message throttling
- **Encrypted Credentials** - Secure storage of WABA access tokens
- **Real-time Updates** - WebSocket/SSE support for live UI updates
- **Comprehensive API Docs** - OpenAPI/Swagger documentation
- **Theme Customization** - Per-tenant branding and theming
- **Analytics Dashboard** - Message metrics and conversation insights

## 📋 Prerequisites

- **Node.js** >= 18.x
- **PostgreSQL** >= 14.x
- **Redis** >= 6.x
- **npm** or **bun** or **yarn**

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: Redis + BullMQ
- **Auth**: JWT with refresh tokens
- **Validation**: Zod
- **Logging**: Winston
- **API Docs**: Swagger/OpenAPI

### Frontend
- **Framework**: React + TypeScript
- **Build Tool**: Vite
- **UI Library**: Shadcn UI + Radix UI
- **Styling**: TailwindCSS
- **State**: TanStack Query
- **Theme**: next-themes

## 📦 Quick Installation

### Option 1: Quick Start (Recommended for Testing)

Follow the [**Quick Start Guide**](./docs/QUICK_START.md) for a 10-minute setup with Docker.

### Option 2: Manual Installation

See the [Installation Guide](#-installation-guide) below for detailed steps.

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+

```bash
# Clone repository
git clone https://github.com/vikkkas/whatsapp-number-api-manager.git
cd whatsapp-number-api-manager

# Start databases with Docker
docker-compose up -d postgres redis

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm run db:generate
npm run db:migrate

# Setup frontend
cd ../frontend
npm install

# Start everything (3 terminals)
# Terminal 1: cd backend && npm run dev
# Terminal 2: cd backend && npm run worker:dev
# Terminal 3: cd frontend && npm run dev
```

**📚 Full Guide:** See [QUICK_START.md](./docs/QUICK_START.md)

## 🚀 Running the Application

### Development Mode

\`\`\`bash
# Terminal 1 - Backend API Server
cd backend
npm run dev

# Terminal 2 - Background Workers
cd backend
npm run worker:dev

# Terminal 3 - Frontend Dev Server
cd frontend
npm run dev
\`\`\`

### Production Mode

\`\`\`bash
# Build backend
cd backend
npm run build
npm start

# Build and start workers
npm run worker

# Build frontend
cd frontend
npm run build
npm run preview
\`\`\`

## 🔧 Environment Variables

### Backend (.env)

\`\`\`bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/whatsapp_saas"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets (CHANGE IN PRODUCTION!)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"
JWT_REFRESH_EXPIRES_IN="30d"

# WhatsApp/Meta
WEBHOOK_VERIFY_TOKEN="your-webhook-verify-token"
META_API_VERSION="v21.0"
META_API_BASE_URL="https://graph.facebook.com"

# Encryption (CHANGE IN PRODUCTION!)
ENCRYPTION_KEY="your-32-character-encryption-key!!"

# Server
PORT=3000
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"

# Logging
LOG_LEVEL="info"
\`\`\`

### Frontend (.env)

\`\`\`bash
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
\`\`\`

## 📚 Documentation

- **[Quick Start Guide](./docs/QUICK_START.md)** - Get running in 10 minutes
- **[API Documentation](./docs/API.md)** - Complete API reference
- **[Architecture Overview](./docs/ARCHITECTURE.md)** - System design & data flow
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment
- **[Meta Setup Guide](./docs/META_SETUP.md)** - WhatsApp Business API setup

### Interactive API Docs

Once the backend is running, access Swagger UI at:

**http://localhost:3000/api-docs**

### Key Endpoints

#### Authentication
- `POST /api/auth/register` - Register new tenant
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token

#### WABA Management
- `POST /api/waba/credentials` - Add WhatsApp Business Account
- `GET /api/waba/credentials` - List WABA credentials
- `DELETE /api/waba/credentials/:id` - Remove WABA

#### Messages
- `POST /api/messages/send` - Send text message
- `POST /api/messages/send-media` - Send media message
- `POST /api/messages/send-template` - Send template message
- `GET /api/messages` - List messages (paginated)

#### Webhooks
- `GET /api/webhook` - Webhook verification
- `POST /api/webhook` - Receive Meta webhooks

#### Conversations
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id` - Get conversation details
- `PATCH /api/conversations/:id` - Update conversation

#### Analytics
- `GET /api/analytics/dashboard` - Dashboard stats
- `GET /api/analytics/messages` - Message charts

## 🏗️ Architecture

### Multi-Tenant Data Model

All data is scoped by `tenantId`. The schema enforces:
- Tenant isolation at the database level
- Per-tenant WABA credentials (encrypted)
- Per-tenant rate limits
- Per-tenant themes and branding

### Persist-First Pattern

```
Webhook → RawWebhookEvent (persist) → Queue Job → Worker → Message (processed)
```

**Benefits:**
- No message loss during outages
- Replay capability for recovery
- Audit trail of all events

### Queue Architecture

```
┌─────────────────┐
│   API Server    │
└────────┬────────┘
         │
    ┌────▼─────┐
    │  Redis   │  (BullMQ)
    │  Queues  │
    └────┬─────┘
         │
    ┌────▼────────────────┐
    │   Worker Process    │
    ├─────────────────────┤
    │ • webhook-processor │
    │ • message-send      │
    │ • campaign-runner   │
    └─────────────────────┘
```

### Rate Limiting

Token bucket algorithm per tenant:
- Configurable messages/minute per plan
- Automatic refill at steady rate
- Prevents Meta API limits violations

## 🔐 Security

### Authentication
- JWT with short-lived access tokens (7 days default)
- Refresh tokens for seamless re-authentication
- Tenant claims in JWT payload

### Encryption
- WABA access tokens encrypted at rest
- AES-256-GCM encryption algorithm
- **Production**: Use AWS KMS, Google Cloud KMS, or HashiCorp Vault

### Best Practices
- All endpoints require authentication (except webhook & auth)
- Tenant isolation enforced in middleware
- Rate limiting on all public endpoints
- Input validation with Zod
- SQL injection protection via Prisma
- CORS configured for frontend only

## 📊 Monitoring & Logging

### Structured Logging

All logs include:
- Timestamp
- Log level
- Service name
- Tenant ID (where applicable)
- Request ID (for tracing)

### Log Files

- `logs/combined.log` - All logs
- `logs/error.log` - Errors only

### Queue Monitoring

Check queue health:
```bash
GET /api/admin/queues/stats
```

Returns job counts per queue (pending, active, completed, failed).

## 🧪 Testing

\`\`\`bash
# Run tests
npm test

# Type checking
npm run typecheck

# Database UI
npm run db:studio
\`\`\`

## 📱 Meta WhatsApp Setup

### 1. Create Meta App
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new app
3. Add WhatsApp product

### 2. Configure Webhook
- URL: `https://your-domain.com/api/webhook`
- Verify Token: Set in `.env` as `WEBHOOK_VERIFY_TOKEN`
- Subscribe to: `messages`, `message_status`

### 3. Get Credentials
- **Phone Number ID**: From WhatsApp > API Setup
- **Access Token**: Generate permanent token
- **Business Account ID**: From WhatsApp settings

### 4. Add to Platform
\`\`\`bash
POST /api/waba/credentials
{
  "phoneNumberId": "123456789",
  "phoneNumber": "+1234567890",
  "accessToken": "your-permanent-token",
  "displayName": "My Business"
}
\`\`\`

## 🚢 Deployment

### Docker (Recommended)

\`\`\`bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
\`\`\`

### Manual Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for:
- AWS deployment guide
- DigitalOcean setup
- Environment configuration
- SSL/TLS setup
- Database backups

## 📈 Scaling

### Horizontal Scaling

- API servers: Stateless, scale behind load balancer
- Workers: Scale independently based on queue depth
- Database: Use read replicas for analytics
- Redis: Use Redis Cluster for high availability

### Performance Tips

1. **Database Indexes**: All tenant queries indexed
2. **Connection Pooling**: Prisma connection pool configured
3. **Caching**: Redis for frequent lookups
4. **CDN**: Serve static assets via CDN
5. **Queue Concurrency**: Adjust worker concurrency based on load

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE)

## 🆘 Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/vikkkas/whatsapp-number-api-manager/issues)
- **Discord**: [Join Community](#)

## 🗺️ Roadmap

- [ ] Campaign builder & bulk messaging
- [ ] Visual flow builder for automation
- [ ] Stripe billing integration
- [ ] Advanced analytics & reports
- [ ] Multi-language support
- [ ] Chatbot & AI integration
- [ ] Team collaboration features
- [ ] Webhook replay UI

---

**Built with ❤️ for scalable WhatsApp Business communication**
