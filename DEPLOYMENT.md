# WhatsApp Number API Manager - Complete Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRODUCTION ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   WhatsApp   │────────▶│   Webhook    │────────▶│  PostgreSQL  │
│   Platform   │  HTTPS  │   Endpoint   │  Write  │   Database   │
└──────────────┘         └──────────────┘         └──────────────┘
                                │
                                │ Enqueue Job
                                ▼
                         ┌──────────────┐
                         │    Redis     │
                         │    Queue     │
                         └──────────────┘
                                │
                                │ Process Job
                                ▼
                         ┌──────────────┐
                         │    Worker    │◀────┐
                         │   Process    │     │
                         └──────────────┘     │
                                │             │
                                │ Publish     │ Subscribe
                                ▼             │
                         ┌──────────────┐     │
                         │    Redis     │─────┘
                         │   Pub/Sub    │
                         └──────────────┘
                                │
                                │ Events
                                ▼
                         ┌──────────────┐
                         │  WebSocket   │
                         │    Server    │
                         └──────────────┘
                                │
                                │ Real-time
                                ▼
                         ┌──────────────┐
                         │   Browser    │
                         │   Clients    │
                         └──────────────┘
```

## System Components

### Backend Services
1. **API Server** (Port 3000)
   - Express.js REST API
   - WebSocket server
   - Authentication & authorization
   - File uploads

2. **Worker Process**
   - BullMQ job processor
   - Webhook event processing
   - Message handling
   - Redis pub/sub publisher

3. **Database**
   - PostgreSQL for data persistence
   - Prisma ORM
   - Migrations managed

4. **Cache & Queue**
   - Redis for job queues
   - Redis pub/sub for real-time events

### Frontend
- React + TypeScript
- Vite build tool
- WebSocket client
- Zustand state management

---

## Deployment Guide

### Prerequisites

```bash
# Required software
- Node.js 18+ 
- Docker & Docker Compose
- Git
```

### 1. Clone & Setup

```bash
# Clone repository
git clone <your-repo-url>
cd whatsapp-number-api-manager

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Configuration

**Backend (.env)**
```env
# Database
DATABASE_URL=postgresql://whatsapp:whatsapp_password@localhost:5432/whatsapp_saas

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Meta WhatsApp API
META_VERIFY_TOKEN=your-webhook-verify-token
META_ACCESS_TOKEN=your-meta-access-token
META_PHONE_NUMBER_ID=your-phone-number-id
META_BUSINESS_ACCOUNT_ID=your-business-account-id

# Internal API (for worker communication)
INTERNAL_API_TOKEN=random-secure-token-for-internal-use
```

**Frontend (.env)**
```env
VITE_BACKEND_URL=https://api.your-domain.com
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be ready
docker-compose ps
```

### 4. Database Setup

```bash
cd backend

# Run migrations
npx prisma migrate deploy

# (Optional) Seed initial data
npx prisma db seed
```

### 5. Build Applications

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

### 6. Start Services

**Option A: Development**
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Worker
cd backend
npm run worker:dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

**Option B: Production (PM2)**
```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start dist/server.js --name whatsapp-api

# Start worker
pm2 start dist/workers/index.js --name whatsapp-worker

# Serve frontend (with nginx or similar)
# See nginx configuration below
```

### 7. Nginx Configuration

```nginx
# /etc/nginx/sites-available/whatsapp-manager

# Frontend
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/whatsapp-manager/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_types text/css application/javascript application/json;
}

# Backend API
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 8. SSL Certificates (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Auto-renewal is configured automatically
```

### 9. WhatsApp Webhook Setup

1. Go to Meta Developer Console
2. Configure webhook URL: `https://api.your-domain.com/api/webhook`
3. Set verify token (same as META_VERIFY_TOKEN in .env)
4. Subscribe to message events

---

## Production Checklist

### Security
- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET
- [ ] Enable HTTPS only
- [ ] Set up firewall rules
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring

### Performance
- [ ] Enable Redis persistence
- [ ] Configure database connection pooling
- [ ] Set up CDN for static assets
- [ ] Enable gzip compression
- [ ] Configure PM2 cluster mode

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure logging (Winston)
- [ ] Monitor Redis memory usage
- [ ] Track database performance
- [ ] Set up uptime monitoring

### Backup
- [ ] Automated PostgreSQL backups
- [ ] Redis AOF persistence enabled
- [ ] Backup environment files
- [ ] Document recovery procedures

---

## Key Features Implemented

### ✅ Real-time Chat System
- WebSocket-based messaging
- Instant notifications
- Unread message counts
- Typing indicators
- Message status tracking

### ✅ Phone Number Normalization
- Consistent E.164 format
- Duplicate prevention
- International number support

### ✅ Redis Pub/Sub Architecture
- Worker → WebSocket communication
- Scalable multi-process design
- Event-driven notifications

### ✅ Production-Ready UI
- No polling (WebSocket only)
- Smooth scrolling
- Auto-scroll to new messages
- Contact name display
- Browser notifications

---

## Troubleshooting

### Redis Connection Issues
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
docker exec -it <redis-container> redis-cli ping
# Should return: PONG

# Check logs
docker logs <redis-container>
```

### WebSocket Not Connecting
```bash
# Check backend logs
pm2 logs whatsapp-api

# Verify WebSocket endpoint
curl -I http://localhost:3000/socket.io/

# Check firewall
sudo ufw status
```

### Database Migration Errors
```bash
# Reset database (CAUTION: deletes data)
npx prisma migrate reset

# Apply specific migration
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

### Worker Not Processing Jobs
```bash
# Check worker logs
pm2 logs whatsapp-worker

# Verify Redis queue
redis-cli
> LLEN bull:webhook-processing:wait

# Restart worker
pm2 restart whatsapp-worker
```

---

## Maintenance

### Update Dependencies
```bash
# Backend
cd backend
npm update
npm audit fix

# Frontend
cd frontend
npm update
npm audit fix
```

### Database Maintenance
```bash
# Vacuum database
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('whatsapp_saas'));"
```

### Clear Redis Cache
```bash
# Clear all queues (CAUTION)
redis-cli FLUSHDB

# Clear specific queue
redis-cli DEL bull:webhook-processing:wait
```

---

## Scaling Considerations

### Horizontal Scaling
- Run multiple API server instances behind load balancer
- Use Redis Cluster for high availability
- Separate read replicas for PostgreSQL
- CDN for static assets

### Vertical Scaling
- Increase Redis memory
- Optimize database queries
- Add database indexes
- Increase worker concurrency

---

## Support & Documentation

### Logs Location
- Backend: `pm2 logs whatsapp-api`
- Worker: `pm2 logs whatsapp-worker`
- Nginx: `/var/log/nginx/`

### Useful Commands
```bash
# PM2
pm2 list                    # List all processes
pm2 restart all             # Restart all
pm2 stop all                # Stop all
pm2 delete all              # Delete all

# Docker
docker-compose ps           # List containers
docker-compose logs -f      # Follow logs
docker-compose restart      # Restart services

# Database
npx prisma studio           # Open database GUI
npx prisma db push          # Push schema changes
```

---

## License & Credits

Built with:
- Node.js + Express
- React + TypeScript
- PostgreSQL + Prisma
- Redis + BullMQ
- Socket.IO
- Meta WhatsApp Business API

---

**Last Updated**: November 2025
**Version**: 2.0.0
