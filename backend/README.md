# 🚀 WhatsApp Business SaaS Platform - Backend# WhatsApp Chatbot Manager Backend



A production-ready, multi-tenant WhatsApp Business API management platform built with **TypeScript**, **PostgreSQL**, **Prisma**, and **BullMQ**.A Node.js + Express backend for managing WhatsApp chatbot interactions with webhook handling, message management, templates, and analytics.



## ✨ Features## Features



- **🏢 Multi-Tenant Architecture** - Complete tenant isolation- 📨 **Webhook Handler** - Receives incoming WhatsApp messages

- **💪 Persist-First Webhooks** - Never lose a message- 🚀 **Send Messages** - Send messages via WhatsApp Cloud API

- **🔒 Secure by Design** - Encrypted credentials, JWT auth- 💾 **MongoDB Integration** - Store messages, users, and templates

- **⚡ Redis-Backed Queues** - Reliable message processing- 📊 **Analytics** - Message statistics and user insights

- **📱 WhatsApp Cloud API** - Full Meta integration- 📋 **Templates** - CRUD operations for message templates

- ⚙️ **Settings** - Configuration management

## 🚀 Quick Start- 🔄 **Auto-Reply** - Automatic response to incoming messages



```powershell## Tech Stack

# 1. Install dependencies

npm install- Node.js

- Express.js

# 2. Copy environment file- MongoDB (Mongoose)

copy .env.example .env- Axios (WhatsApp API calls)

- CORS enabled

# 3. Edit .env with your database credentials- ES Modules



# 4. Generate Prisma client## Setup Instructions

npm run db:generate

### 1. Install Dependencies

# 5. Push database schema

npm run db:push```bash

cd backend

# 6. Start developmentnpm install

npm run dev```

```

### 2. Environment Configuration

## 📚 Full Documentation

Copy the example environment file:

- [docs/SETUP.md](docs/SETUP.md) - Complete setup guide```bash

- [docs/API.md](docs/API.md) - API referencecp .env.example .env

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - System design```



## 🛠️ ScriptsUpdate `.env` with your credentials:

```env

- `npm run dev` - Start dev serverPORT=5000

- `npm run worker:dev` - Start workerMONGO_URI=mongodb://localhost:27017/whatsappbot

- `npm run db:studio` - Database GUIWHATSAPP_TOKEN=your_whatsapp_access_token

- `npm run build` - Build for productionPHONE_NUMBER_ID=your_phone_number_id

WEBHOOK_VERIFY_TOKEN=your_secure_verify_token
```

### 3. Start MongoDB

Make sure MongoDB is running on your system:
```bash
# macOS with Homebrew
brew services start mongodb/brew/mongodb-community

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Start the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Webhook
- `GET /webhook` - Webhook verification
- `POST /webhook` - Handle incoming messages

### Messages
- `POST /api/messages/send` - Send a message
- `GET /api/messages` - Get all messages
- `GET /api/messages/conversation/:phone` - Get conversation with user
- `GET /api/messages/users` - Get all users/contacts

### Templates
- `GET /api/templates` - Get all templates
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

### Analytics
- `GET /api/analytics` - Get analytics overview
- `GET /api/analytics/messages` - Get detailed message analytics

### Settings
- `GET /api/settings` - Get current settings
- `POST /api/settings` - Update settings
- `GET /api/settings/test` - Test WhatsApp connection
- `GET /api/settings/status` - Get system status

### Health Check
- `GET /` - API information
- `GET /health` - Server health status

## WhatsApp Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing one
3. Add WhatsApp Business Platform product
4. Get your:
   - **Access Token** (`WHATSAPP_TOKEN`)
   - **Phone Number ID** (`PHONE_NUMBER_ID`)
5. Set up webhook URL: `https://your-domain.com/webhook`
6. Use your `WEBHOOK_VERIFY_TOKEN` for verification

## Testing

### Send a Test Message
```bash
curl -X POST http://localhost:5000/api/messages/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "message": "Hello from the chatbot!"
  }'
```

### Get Messages
```bash
curl http://localhost:5000/api/messages
```

### Create a Template
```bash
curl -X POST http://localhost:5000/api/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Message",
    "content": "Welcome to our service! How can we help you today?",
    "status": "approved"
  }'
```

## Project Structure

```
src/
├── config/
│   └── db.js              # MongoDB connection
├── controllers/
│   ├── webhookController.js    # Webhook handling
│   ├── messageController.js    # Message operations
│   ├── templateController.js   # Template CRUD
│   ├── analyticsController.js  # Analytics data
│   └── settingsController.js   # Settings management
├── models/
│   ├── Message.js         # Message schema
│   ├── User.js           # User schema
│   └── Template.js       # Template schema
├── routes/
│   ├── webhook.js        # Webhook routes
│   ├── messages.js       # Message routes
│   ├── templates.js      # Template routes
│   ├── analytics.js      # Analytics routes
│   └── settings.js       # Settings routes
└── server.js            # Main server file
```

## Logs

The server provides detailed logging for:
- 📨 Incoming messages
- 📤 Outgoing messages
- 🤖 Auto-replies
- ⚙️ Settings updates
- 📝 Template operations
- ❌ Errors and debugging

## Production Deployment

1. Set `NODE_ENV=production` in your environment
2. Use a production MongoDB instance
3. Set up proper webhook URL with HTTPS
4. Configure proper CORS origins
5. Use PM2 or similar for process management:

```bash
npm install -g pm2
pm2 start src/server.js --name "whatsapp-backend"
```

## Troubleshooting

- **Database Connection**: Ensure MongoDB is running and URI is correct
- **WhatsApp API**: Verify your tokens and phone number ID
- **Webhook**: Make sure your webhook URL is accessible and uses HTTPS in production
- **CORS**: Update `FRONTEND_URL` in `.env` to match your frontend domain

## Support

For issues and questions, check the logs and ensure all environment variables are properly configured.