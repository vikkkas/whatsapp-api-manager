# Quick Start Guide

Get your WhatsApp SaaS platform running in 10 minutes!

## 🎯 Prerequisites

Install these first:
- **Node.js 18+**: [Download](https://nodejs.org/)
- **PostgreSQL 14+**: [Download](https://www.postgresql.org/download/) or use Docker
- **Redis 6+**: [Download](https://redis.io/download) or use Docker

## 🚀 Method 1: Docker (Easiest)

### 1. Clone & Setup

\`\`\`bash
git clone https://github.com/vikkkas/whatsapp-number-api-manager.git
cd whatsapp-number-api-manager
\`\`\`

### 2. Create Environment File

\`\`\`bash
# Backend environment
cd backend
cp .env.example .env
\`\`\`

Edit `.env` and set:
\`\`\`bash
DATABASE_URL="postgresql://whatsapp:password@localhost:5432/whatsapp_saas"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key-min-32-characters"
ENCRYPTION_KEY="your-encryption-key-32-chars!!"
WEBHOOK_VERIFY_TOKEN="your-webhook-token"
\`\`\`

### 3. Start Services with Docker

\`\`\`bash
# Start PostgreSQL & Redis
docker-compose up -d postgres redis

# Wait 10 seconds for services to be ready
sleep 10

# Install dependencies
npm install

# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Start API server
npm run dev
\`\`\`

### 4. Start Workers (New Terminal)

\`\`\`bash
cd backend
npm run worker:dev
\`\`\`

### 5. Start Frontend (New Terminal)

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

**Done!** Open http://localhost:5173

---

## 💻 Method 2: Local Install (No Docker)

### 1. Install PostgreSQL

**Windows:**
- Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- Install and remember your password
- Create database:
\`\`\`sql
CREATE DATABASE whatsapp_saas;
\`\`\`

**Mac (Homebrew):**
\`\`\`bash
brew install postgresql@15
brew services start postgresql@15
createdb whatsapp_saas
\`\`\`

**Linux (Ubuntu/Debian):**
\`\`\`bash
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres createdb whatsapp_saas
\`\`\`

### 2. Install Redis

**Windows:**
- Download from [redis.io](https://redis.io/download)
- Or use WSL2

**Mac (Homebrew):**
\`\`\`bash
brew install redis
brew services start redis
\`\`\`

**Linux (Ubuntu/Debian):**
\`\`\`bash
sudo apt-get install redis-server
sudo systemctl start redis-server
\`\`\`

### 3. Clone & Configure

\`\`\`bash
git clone https://github.com/vikkkas/whatsapp-number-api-manager.git
cd whatsapp-number-api-manager/backend

# Copy environment
cp .env.example .env

# Install dependencies
npm install
\`\`\`

### 4. Update .env

\`\`\`bash
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/whatsapp_saas"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="$(openssl rand -base64 48)"
JWT_REFRESH_SECRET="$(openssl rand -base64 48)"
ENCRYPTION_KEY="$(openssl rand -base64 32)"
WEBHOOK_VERIFY_TOKEN="$(openssl rand -hex 32)"
\`\`\`

### 5. Setup Database

\`\`\`bash
# Generate Prisma Client
npm run db:generate

# Run migrations (creates tables)
npm run db:migrate

# (Optional) Seed sample data
npm run db:seed
\`\`\`

### 6. Start Everything

**Terminal 1 - API Server:**
\`\`\`bash
cd backend
npm run dev
# ✓ Server running on http://localhost:3000
\`\`\`

**Terminal 2 - Workers:**
\`\`\`bash
cd backend
npm run worker:dev
# ✓ Workers started
\`\`\`

**Terminal 3 - Frontend:**
\`\`\`bash
cd frontend
npm install
npm run dev
# ✓ Frontend running on http://localhost:5173
\`\`\`

---

## 🎨 First Steps

### 1. Create Your Account

Open http://localhost:5173 and register:
- Email: `admin@yourcompany.com`
- Password: (strong password)
- Company Name: `Your Company`
- Company Slug: `yourcompany`

### 2. Add WhatsApp Business Account

You need a Meta WhatsApp Business Account first. See [Meta Setup Guide](./META_SETUP.md).

Once you have:
- Phone Number ID
- Access Token
- Business Account ID

Add it in the dashboard:
1. Go to Settings → WhatsApp Accounts
2. Click "Add Account"
3. Enter your credentials
4. Click "Connect"

### 3. Send Your First Message

Go to "Send Message" page:
- To: `+1234567890` (recipient's WhatsApp number)
- Message: `Hello from WhatsApp SaaS!`
- Click Send

---

## 🔍 Verify It's Working

### Check API Health

\`\`\`bash
curl http://localhost:3000/api/health
\`\`\`

Should return:
\`\`\`json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "redis": true,
    "queues": true
  }
}
\`\`\`

### Check Database

\`\`\`bash
cd backend
npm run db:studio
\`\`\`

Opens Prisma Studio at http://localhost:5555 to browse data.

### Check Redis

\`\`\`bash
redis-cli ping
# Should return: PONG
\`\`\`

### Check Queues

\`\`\`bash
curl http://localhost:3000/api/admin/queues/stats
\`\`\`

---

## 📱 Configure Meta Webhook

### 1. Expose Local Server (Development)

Use ngrok to make your local server accessible:

\`\`\`bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
\`\`\`

Copy the HTTPS URL: `https://abc123.ngrok.io`

### 2. Set in Meta Developer Console

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Select your app → WhatsApp → Configuration
3. Set Webhook URL: `https://abc123.ngrok.io/api/webhook`
4. Set Verify Token: (from your `.env` file - `WEBHOOK_VERIFY_TOKEN`)
5. Subscribe to: `messages` and `message_status`
6. Click "Verify and Save"

### 3. Test Webhook

Send a test message to your WhatsApp Business number.

Check logs:
\`\`\`bash
# Backend terminal should show:
[WEBHOOK] Webhook payload received
[WEBHOOK] Message processed successfully
\`\`\`

---

## 🐛 Troubleshooting

### "Cannot connect to database"

**Check PostgreSQL is running:**
\`\`\`bash
# Mac/Linux
pg_isready

# Windows
psql -U postgres -c "SELECT 1"
\`\`\`

**Check DATABASE_URL in .env:**
- Correct host, port, username, password
- Database exists

### "Redis connection refused"

**Check Redis is running:**
\`\`\`bash
redis-cli ping
# Should return: PONG
\`\`\`

**Mac/Linux start Redis:**
\`\`\`bash
redis-server
\`\`\`

### "Prisma Client not generated"

\`\`\`bash
npm run db:generate
\`\`\`

### "Port 3000 already in use"

Change PORT in `.env`:
\`\`\`bash
PORT=3001
\`\`\`

### TypeScript Errors

\`\`\`bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check TypeScript
npm run typecheck
\`\`\`

---

## 📚 Next Steps

1. **Read API Docs**: [API.md](./API.md)
2. **Configure Themes**: See theme customization guide
3. **Setup Templates**: Create message templates in Meta
4. **Add Team Members**: Invite agents to your tenant
5. **Deploy to Production**: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🆘 Get Help

- **Documentation**: Browse the `docs/` folder
- **Issues**: [GitHub Issues](https://github.com/vikkkas/whatsapp-number-api-manager/issues)
- **Discord**: [Join Community](#)

---

## ✅ Checklist

- [ ] PostgreSQL installed and running
- [ ] Redis installed and running
- [ ] Backend dependencies installed
- [ ] Environment variables configured
- [ ] Database migrated
- [ ] Backend server running (http://localhost:3000)
- [ ] Workers running
- [ ] Frontend running (http://localhost:5173)
- [ ] Account created
- [ ] WABA credentials added
- [ ] Test message sent successfully
- [ ] Webhook configured (if testing with Meta)

**Congratulations! You're ready to build on WhatsApp! 🎉**
