# Deployment Guide

This guide covers deploying the WhatsApp SaaS platform to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Deployment Options](#deployment-options)
  - [Docker + Docker Compose](#docker--docker-compose)
  - [AWS (ECS/EC2)](#aws-deployment)
  - [DigitalOcean](#digitalocean-deployment)
  - [Heroku](#heroku-deployment)
- [SSL/TLS Setup](#ssltls-setup)
- [Monitoring](#monitoring)
- [Backups](#backups)
- [Scaling](#scaling)

---

## Prerequisites

- Domain name with DNS access
- SSL certificate (Let's Encrypt recommended)
- PostgreSQL database (managed service recommended)
- Redis instance (managed service recommended)
- Meta WhatsApp Business Account

---

## Environment Setup

### 1. Production Environment Variables

Create `.env` file with production values:

\`\`\`bash
# Database (Use managed PostgreSQL)
DATABASE_URL="postgresql://user:password@db-host:5432/whatsapp_saas?sslmode=require"

# Redis (Use managed Redis)
REDIS_URL="redis://:password@redis-host:6379"

# JWT Secrets (Generate secure random strings)
JWT_SECRET="$(openssl rand -base64 48)"
JWT_REFRESH_SECRET="$(openssl rand -base64 48)"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Encryption Key (32+ characters)
ENCRYPTION_KEY="$(openssl rand -base64 32)"

# WhatsApp/Meta
WEBHOOK_VERIFY_TOKEN="$(openssl rand -hex 32)"
META_API_VERSION="v21.0"
META_API_BASE_URL="https://graph.facebook.com"

# Server
PORT=3000
NODE_ENV="production"
FRONTEND_URL="https://your-domain.com"

# Logging
LOG_LEVEL="info"

# Optional: Monitoring
SENTRY_DSN="your-sentry-dsn"
\`\`\`

### 2. Generate Secrets

\`\`\`bash
# On Linux/Mac
openssl rand -base64 48  # For JWT secrets
openssl rand -base64 32  # For encryption key
openssl rand -hex 32     # For webhook token

# On Windows (PowerShell)
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
\`\`\`

---

## Database Setup

### Managed PostgreSQL (Recommended)

**AWS RDS:**
\`\`\`bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier whatsapp-saas-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username dbadmin \
  --master-user-password YOUR_PASSWORD \
  --allocated-storage 50 \
  --backup-retention-period 7 \
  --multi-az
\`\`\`

**DigitalOcean Managed Database:**
- Go to Databases → Create
- Choose PostgreSQL 15
- Select region and size
- Enable automatic backups

### Run Migrations

\`\`\`bash
# From your local machine or CI/CD
DATABASE_URL="your-prod-db-url" npm run db:migrate
\`\`\`

---

## Deployment Options

### Docker + Docker Compose

#### 1. Create Dockerfile

\`\`\`dockerfile
# Backend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/server.js"]
\`\`\`

#### 2. Create docker-compose.yml

\`\`\`yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: whatsapp
      POSTGRES_PASSWORD: \${DB_PASSWORD}
      POSTGRES_DB: whatsapp_saas
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U whatsapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass \${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # API Server
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://whatsapp:\${DB_PASSWORD}@postgres:5432/whatsapp_saas
      REDIS_URL: redis://:\${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: \${JWT_SECRET}
      JWT_REFRESH_SECRET: \${JWT_REFRESH_SECRET}
      ENCRYPTION_KEY: \${ENCRYPTION_KEY}
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  # Workers
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: node dist/workers/index.js
    environment:
      DATABASE_URL: postgresql://whatsapp:\${DB_PASSWORD}@postgres:5432/whatsapp_saas
      REDIS_URL: redis://:\${REDIS_PASSWORD}@redis:6379
      ENCRYPTION_KEY: \${ENCRYPTION_KEY}
      NODE_ENV: production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      replicas: 2  # Run 2 worker instances

  # Frontend (Nginx)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
\`\`\`

#### 3. Deploy

\`\`\`bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale workers
docker-compose up -d --scale worker=5
\`\`\`

---

### AWS Deployment

#### Using ECS (Elastic Container Service)

1. **Push to ECR:**
\`\`\`bash
# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t whatsapp-saas-api ./backend
docker tag whatsapp-saas-api:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/whatsapp-saas-api:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/whatsapp-saas-api:latest
\`\`\`

2. **Create ECS Task Definition** (use AWS Console or CLI)

3. **Create ECS Service** with:
   - Application Load Balancer
   - Auto-scaling (based on CPU/memory)
   - CloudWatch logs

4. **Environment:**
   - Store secrets in AWS Secrets Manager
   - Reference in task definition

---

### DigitalOcean Deployment

#### Using App Platform

1. **Connect GitHub Repository**
2. **Configure Components:**

\`\`\`yaml
# .do/app.yaml
name: whatsapp-saas

services:
  - name: api
    github:
      repo: your-username/whatsapp-saas
      branch: main
      deploy_on_push: true
    source_dir: /backend
    build_command: npm run build
    run_command: npm start
    envs:
      - key: DATABASE_URL
        scope: RUN_AND_BUILD_TIME
        value: \${db.DATABASE_URL}
      - key: REDIS_URL
        scope: RUN_AND_BUILD_TIME
        value: \${redis.DATABASE_URL}
    http_port: 3000
    instance_count: 2
    instance_size_slug: professional-xs

  - name: worker
    github:
      repo: your-username/whatsapp-saas
      branch: main
    source_dir: /backend
    build_command: npm run build
    run_command: npm run worker
    instance_count: 2

databases:
  - name: db
    engine: PG
    version: "15"
    size: db-s-2vcpu-4gb

  - name: redis
    engine: REDIS
    version: "7"
\`\`\`

3. **Deploy:**
\`\`\`bash
doctl apps create --spec .do/app.yaml
\`\`\`

---

### Heroku Deployment

\`\`\`bash
# Create app
heroku create whatsapp-saas-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:standard-0

# Add Redis
heroku addons:create heroku-redis:premium-0

# Set environment variables
heroku config:set JWT_SECRET="your-secret"
heroku config:set ENCRYPTION_KEY="your-key"

# Deploy
git push heroku main

# Scale workers
heroku ps:scale worker=2
\`\`\`

---

## SSL/TLS Setup

### Let's Encrypt with Certbot

\`\`\`bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (cron job)
sudo certbot renew --dry-run
\`\`\`

### Nginx Configuration

\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Frontend
    location / {
        root /var/www/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }
}
\`\`\`

---

## Monitoring

### Application Monitoring

**Sentry for Error Tracking:**
\`\`\`bash
npm install @sentry/node

# In server.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
\`\`\`

**Prometheus + Grafana:**
- Expose metrics endpoint
- Scrape with Prometheus
- Visualize in Grafana

### Health Checks

Add `/health` endpoint:
\`\`\`typescript
app.get('/health', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    queues: false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (e) {}

  try {
    await redis.ping();
    checks.redis = true;
  } catch (e) {}

  const allHealthy = Object.values(checks).every(v => v);
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
  });
});
\`\`\`

---

## Backups

### Database Backups

**Automated (AWS RDS):**
- Enabled by default
- 7-30 day retention
- Point-in-time recovery

**Manual:**
\`\`\`bash
# Backup
pg_dump -h db-host -U user -d whatsapp_saas > backup_\$(date +%Y%m%d).sql

# Restore
psql -h db-host -U user -d whatsapp_saas < backup_20251112.sql
\`\`\`

### Redis Backups

\`\`\`bash
# Enable AOF persistence
redis-cli CONFIG SET appendonly yes

# Manual snapshot
redis-cli BGSAVE
\`\`\`

---

## Scaling

### Horizontal Scaling

1. **API Servers:**
   - Stateless design
   - Scale behind load balancer
   - Session state in Redis

2. **Workers:**
   - Scale based on queue depth
   - Monitor with BullMQ metrics

3. **Database:**
   - Read replicas for analytics
   - Connection pooling
   - Query optimization

### Auto-Scaling

**AWS ECS Auto-Scaling:**
\`\`\`bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/cluster-name/service-name \
  --min-capacity 2 \
  --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --policy-name cpu-scaling \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/cluster-name/service-name \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
\`\`\`

---

## Post-Deployment Checklist

- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] SSL certificate installed
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Meta webhook configured
- [ ] DNS records updated
- [ ] Load testing completed
- [ ] Disaster recovery plan documented

---

## Troubleshooting

### Common Issues

**Database Connection:**
\`\`\`bash
# Test connection
psql "\$DATABASE_URL"

# Check connection pool
SELECT count(*) FROM pg_stat_activity;
\`\`\`

**Redis Connection:**
\`\`\`bash
redis-cli -u "\$REDIS_URL" PING
\`\`\`

**Queue Issues:**
\`\`\`bash
# Check queue depth
curl http://localhost:3000/api/admin/queues/stats
\`\`\`

---

**Need help? Join our [Discord community](#) or [open an issue](https://github.com/vikkkas/whatsapp-number-api-manager/issues).**
