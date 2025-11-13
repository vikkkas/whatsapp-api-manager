# WhatsApp Number API Manager# WhatsApp Business API Manager - Multi-Tenant SaaS



A full-stack SaaS platform for managing WhatsApp Business API conversations, messages, and templates with multi-tenant support.A production-ready, multi-tenant SaaS platform for managing WhatsApp Business API communications at scale. Built with TypeScript, PostgreSQL, Redis, and modern best practices.



## 🚀 Features## 🚀 Features



- **Multi-Tenant Architecture** - Complete tenant isolation with role-based access control- **Multi-Tenant Architecture** - Complete tenant isolation with per-tenant rate limiting

- **WhatsApp Integration** - Send/receive messages, manage templates, handle webhooks- **Persist-First Webhooks** - Reliable message processing with automatic retries

- **Real-Time Updates** - WebSocket support for live message updates- **Type-Safe** - Full TypeScript implementation with strict type checking

- **Analytics Dashboard** - Track messages, conversations, and delivery rates- **Queue-Based Workers** - BullMQ for durable background job processing

- **Template Management** - Create and manage WhatsApp message templates- **Rate Limiting** - Token bucket algorithm for per-tenant message throttling

- **Contact Management** - Import/export contacts with CSV support- **Encrypted Credentials** - Secure storage of WABA access tokens

- **Media Support** - Handle images, videos, documents, and audio files- **Real-time Updates** - WebSocket/SSE support for live UI updates

- **Message Queue** - BullMQ with Redis for reliable message processing- **Comprehensive API Docs** - OpenAPI/Swagger documentation

- **Modern UI** - Built with React, TypeScript, TailwindCSS, and Shadcn/ui- **Theme Customization** - Per-tenant branding and theming

- **Analytics Dashboard** - Message metrics and conversation insights

## 📋 Prerequisites

## 📋 Prerequisites

- Node.js 18+ and npm/yarn/bun

- PostgreSQL 14+- **Node.js** >= 18.x

- Redis 6+ (optional, can run without queue processing)- **PostgreSQL** >= 14.x

- Meta WhatsApp Business Account- **Redis** >= 6.x

- **npm** or **bun** or **yarn**

## 🛠️ Tech Stack

## 🛠️ Tech Stack

### Backend

- **Framework:** Express.js + TypeScript### Backend

- **Database:** PostgreSQL + Prisma ORM- **Runtime**: Node.js with TypeScript

- **Queue:** BullMQ + Redis- **Framework**: Express.js

- **Auth:** JWT tokens- **Database**: PostgreSQL with Prisma ORM

- **WebSocket:** Socket.io- **Queue**: Redis + BullMQ

- **API:** RESTful + Real-time events- **Auth**: JWT with refresh tokens

- **Validation**: Zod

### Frontend- **Logging**: Winston

- **Framework:** React 18 + TypeScript + Vite- **API Docs**: Swagger/OpenAPI

- **Styling:** TailwindCSS + Shadcn/ui

- **State:** Zustand### Frontend

- **Charts:** Recharts- **Framework**: React + TypeScript

- **Forms:** React Hook Form + Zod- **Build Tool**: Vite

- **Routing:** React Router v6- **UI Library**: Shadcn UI + Radix UI

- **Styling**: TailwindCSS

## 🚀 Quick Start- **State**: TanStack Query

- **Theme**: next-themes

### 1. Clone Repository

```bash## 📦 Quick Installation

git clone <repository-url>

cd whatsapp-number-api-manager### Option 1: Quick Start (Recommended for Testing)

```

Follow the [**Quick Start Guide**](./docs/QUICK_START.md) for a 10-minute setup with Docker.

### 2. Backend Setup

```bash### Option 2: Manual Installation

cd backend

npm installSee the [Installation Guide](#-installation-guide) below for detailed steps.



# Configure environment### Prerequisites

cp .env.example .env

# Edit .env with your credentials- Node.js 18+ and npm

- PostgreSQL 14+

# Setup database- Redis 6+

npx prisma migrate deploy

npx prisma generate```bash

# Clone repository

# Create admin usergit clone https://github.com/vikkkas/whatsapp-number-api-manager.git

npm run create-admincd whatsapp-number-api-manager



# Start server# Start databases with Docker

npm run devdocker-compose up -d postgres redis

```

# Setup backend

### 3. Frontend Setupcd backend

```bashnpm install

cd frontendcp .env.example .env

npm install# Edit .env with your settings

npm run db:generate

# Configure environmentnpm run db:migrate

cp .env.example .env

# Edit .env with backend URL# Setup frontend

cd ../frontend

# Start development servernpm install

npm run dev

```# Start everything (3 terminals)

# Terminal 1: cd backend && npm run dev

### 4. Access Application# Terminal 2: cd backend && npm run worker:dev

- Frontend: http://localhost:8080# Terminal 3: cd frontend && npm run dev

- Backend API: http://localhost:3000```

- Default Admin: Check console after running `create-admin`

**📚 Full Guide:** See [QUICK_START.md](./docs/QUICK_START.md)

## 📁 Project Structure

## 🚀 Running the Application

```

whatsapp-number-api-manager/### Development Mode

├── backend/              # Express.js API server

│   ├── src/\`\`\`bash

│   │   ├── config/      # Database, Redis, Queue configs# Terminal 1 - Backend API Server

│   │   ├── controllers/ # Route controllerscd backend

│   │   ├── middleware/  # Auth, tenant isolation, validationnpm run dev

│   │   ├── models/      # Prisma models (generated)

│   │   ├── routes/      # API endpoints# Terminal 2 - Background Workers

│   │   ├── services/    # Business logic (Meta API, etc)cd backend

│   │   ├── utils/       # Helpers and utilitiesnpm run worker:dev

│   │   └── workers/     # Background job processors

│   ├── prisma/          # Database schema and migrations# Terminal 3 - Frontend Dev Server

│   └── uploads/         # Media file storagecd frontend

│npm run dev

├── frontend/            # React application\`\`\`

│   ├── src/

│   │   ├── components/  # Reusable UI components### Production Mode

│   │   ├── contexts/    # React contexts (Auth, WebSocket)

│   │   ├── hooks/       # Custom React hooks\`\`\`bash

│   │   ├── lib/         # API client and utilities# Build backend

│   │   ├── pages/       # Route pages/viewscd backend

│   │   └── store/       # Zustand state managementnpm run build

│   └── public/          # Static assetsnpm start

│

└── docs/                # Additional documentation# Build and start workers

```npm run worker



## 🔧 Environment Variables# Build frontend

cd frontend

### Backend (.env)npm run build

```envnpm run preview

# Database\`\`\`

DATABASE_URL="postgresql://user:password@localhost:5432/whatsapp_saas"

## 🔧 Environment Variables

# JWT

JWT_SECRET="your-secret-key"### Backend (.env)

JWT_REFRESH_SECRET="your-refresh-secret"

JWT_EXPIRES_IN="7d"\`\`\`bash

JWT_REFRESH_EXPIRES_IN="30d"# Database

DATABASE_URL="postgresql://user:password@localhost:5432/whatsapp_saas"

# Meta WhatsApp API

META_ACCESS_TOKEN="your-meta-token"# Redis

META_PHONE_NUMBER_ID="your-phone-number-id"REDIS_URL="redis://localhost:6379"

META_BUSINESS_ACCOUNT_ID="your-business-account-id"

META_WEBHOOK_VERIFY_TOKEN="your-verify-token"# JWT Secrets (CHANGE IN PRODUCTION!)

META_API_VERSION="v18.0"JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

JWT_EXPIRES_IN="7d"

# Redis (optional)JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"

REDIS_HOST="localhost"JWT_REFRESH_EXPIRES_IN="30d"

REDIS_PORT="6379"

REDIS_PASSWORD=""# WhatsApp/Meta

WEBHOOK_VERIFY_TOKEN="your-webhook-verify-token"

# ServerMETA_API_VERSION="v21.0"

PORT="3000"META_API_BASE_URL="https://graph.facebook.com"

NODE_ENV="development"

```# Encryption (CHANGE IN PRODUCTION!)

ENCRYPTION_KEY="your-32-character-encryption-key!!"

### Frontend (.env)

```env# Server

VITE_BACKEND_URL="http://localhost:3000"PORT=3000

VITE_WS_URL="http://localhost:3000"NODE_ENV="development"

```FRONTEND_URL="http://localhost:5173"



## 📚 API Documentation# Logging

LOG_LEVEL="info"

See [BACKEND.md](./BACKEND.md) for detailed API documentation.\`\`\`



Key endpoints:### Frontend (.env)

- `POST /api/auth/login` - User authentication

- `GET /api/messages` - List messages\`\`\`bash

- `POST /api/messages` - Send messageVITE_API_URL=http://localhost:3000

- `GET /api/conversations` - List conversationsVITE_WS_URL=ws://localhost:3000

- `GET /api/analytics/overview` - Analytics data\`\`\`

- `POST /api/webhook` - Meta webhook endpoint

## 📚 Documentation

## 🎨 Frontend Documentation

- **[Quick Start Guide](./docs/QUICK_START.md)** - Get running in 10 minutes

See [FRONTEND.md](./FRONTEND.md) for component architecture and development guide.- **[API Documentation](./docs/API.md)** - Complete API reference

- **[Architecture Overview](./docs/ARCHITECTURE.md)** - System design & data flow

## 🚀 Deployment- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment

- **[Meta Setup Guide](./docs/META_SETUP.md)** - WhatsApp Business API setup

### Backend

```bash### Interactive API Docs

cd backend

npm run buildOnce the backend is running, access Swagger UI at:

npm start

```**http://localhost:3000/api-docs**



### Frontend### Key Endpoints

```bash

cd frontend#### Authentication

npm run build- `POST /api/auth/register` - Register new tenant

# Serve the dist/ folder with any static server- `POST /api/auth/login` - Login

```- `POST /api/auth/refresh` - Refresh access token



### Docker (Coming Soon)#### WABA Management

```bash- `POST /api/waba/credentials` - Add WhatsApp Business Account

docker-compose up -d- `GET /api/waba/credentials` - List WABA credentials

```- `DELETE /api/waba/credentials/:id` - Remove WABA



## 🔐 Security Features#### Messages

- `POST /api/messages/send` - Send text message

- JWT-based authentication with refresh tokens- `POST /api/messages/send-media` - Send media message

- Row-level tenant isolation in database- `POST /api/messages/send-template` - Send template message

- Request validation and sanitization- `GET /api/messages` - List messages (paginated)

- CORS configuration

- Environment-based secrets#### Webhooks

- SQL injection prevention via Prisma- `GET /api/webhook` - Webhook verification

- XSS protection- `POST /api/webhook` - Receive Meta webhooks



## 📊 Database Schema#### Conversations

- `GET /api/conversations` - List conversations

Key models:- `GET /api/conversations/:id` - Get conversation details

- **Tenant** - Multi-tenant organization- `PATCH /api/conversations/:id` - Update conversation

- **AdminUser** - Users with role-based access

- **Conversation** - WhatsApp conversations#### Analytics

- **Message** - Individual messages (text, media, etc)- `GET /api/analytics/dashboard` - Dashboard stats

- **Template** - Message templates- `GET /api/analytics/messages` - Message charts

- **Contact** - Contact directory

## 🏗️ Architecture

See `backend/prisma/schema.prisma` for full schema.

### Multi-Tenant Data Model

## 🧪 Testing

All data is scoped by `tenantId`. The schema enforces:

### Backend Tests- Tenant isolation at the database level

```bash- Per-tenant WABA credentials (encrypted)

cd backend- Per-tenant rate limits

npm test- Per-tenant themes and branding

```

### Persist-First Pattern

### Frontend Tests

```bash```

cd frontendWebhook → RawWebhookEvent (persist) → Queue Job → Worker → Message (processed)

npm test```

```

**Benefits:**

## 📝 Meta WhatsApp Setup- No message loss during outages

- Replay capability for recovery

1. Create Meta Business Account- Audit trail of all events

2. Set up WhatsApp Business App

3. Add Phone Number### Queue Architecture

4. Generate Access Token

5. Configure Webhook URL: `https://your-domain.com/api/webhook````

6. Subscribe to webhook events: `messages`, `message_status`┌─────────────────┐

│   API Server    │

## 🐛 Troubleshooting└────────┬────────┘

         │

### Database Connection Issues    ┌────▼─────┐

- Verify PostgreSQL is running    │  Redis   │  (BullMQ)

- Check DATABASE_URL format    │  Queues  │

- Run `npx prisma migrate deploy`    └────┬─────┘

         │

### Redis Connection Issues    ┌────▼────────────────┐

- Redis is optional for development    │   Worker Process    │

- Backend will warn but continue without queues    ├─────────────────────┤

- For production, ensure Redis is running    │ • webhook-processor │

    │ • message-send      │

### WebSocket Issues    │ • campaign-runner   │

- Check firewall settings    └─────────────────────┘

- Verify VITE_WS_URL matches backend```

- Check browser console for connection errors

### Rate Limiting

## 🤝 Contributing

Token bucket algorithm per tenant:

1. Fork the repository- Configurable messages/minute per plan

2. Create feature branch (`git checkout -b feature/amazing-feature`)- Automatic refill at steady rate

3. Commit changes (`git commit -m 'Add amazing feature'`)- Prevents Meta API limits violations

4. Push to branch (`git push origin feature/amazing-feature`)

5. Open Pull Request## 🔐 Security



## 📄 License### Authentication

- JWT with short-lived access tokens (7 days default)

This project is licensed under the MIT License.- Refresh tokens for seamless re-authentication

- Tenant claims in JWT payload

## 👥 Support

### Encryption

For issues and questions:- WABA access tokens encrypted at rest

- GitHub Issues: Create an issue- AES-256-GCM encryption algorithm

- Documentation: [BACKEND.md](./BACKEND.md) | [FRONTEND.md](./FRONTEND.md)- **Production**: Use AWS KMS, Google Cloud KMS, or HashiCorp Vault



## 🎯 Roadmap### Best Practices

- All endpoints require authentication (except webhook & auth)

- [ ] Docker containerization- Tenant isolation enforced in middleware

- [ ] Kubernetes deployment configs- Rate limiting on all public endpoints

- [ ] Advanced analytics and reporting- Input validation with Zod

- [ ] WhatsApp catalog support- SQL injection protection via Prisma

- [ ] Automated testing suite- CORS configured for frontend only

- [ ] GraphQL API option

- [ ] Mobile app (React Native)## 📊 Monitoring & Logging


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
