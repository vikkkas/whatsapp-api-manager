import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { env } from './config/env.js'; // Load env FIRST
import prisma from './config/prisma.js';
import { log, httpLogStream } from './utils/logger.js';
import { setupWebSocket } from './services/websocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import webhookRoutes from './routes/webhook.js';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import conversationRoutes from './routes/conversations.js';
import templateRoutes from './routes/templates.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';
import healthRoutes from './routes/health.js';
import mediaRoutes from './routes/media.js';
import contactRoutes from './routes/contacts.js';
import internalRoutes from './routes/internal.js';

const app: Express = express();
const PORT = env.PORT;

// ============================================
// SECURITY MIDDLEWARE
// ============================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// ============================================
// CORS CONFIGURATION
// ============================================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
  env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // In development, allow all localhost origins
    if (env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Check allowlist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      log.warn(`CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============================================
// BODY PARSING
// ============================================
// Webhook route needs raw body for signature verification
app.use('/api/webhook', express.raw({ type: 'application/json' }));

// All other routes use JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// LOGGING
// ============================================
app.use(morgan('combined', { stream: httpLogStream }));

// ============================================
// STATIC FILES
// ============================================
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ============================================
// TRUST PROXY (for deployment behind reverse proxy)
// ============================================
app.set('trust proxy', true);

// ============================================
// API ROUTES
// ============================================
app.use('/api/health', healthRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/internal', internalRoutes);

// ============================================
// ROOT ENDPOINT
// ============================================
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'WhatsApp SaaS API',
    version: '2.0.0',
    status: 'running',
    docs: '/api/docs',
    health: '/api/health'
  });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// ============================================
// ERROR HANDLER
// ============================================
interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

app.use((err: ApiError, req: Request, res: Response, _next: NextFunction) => {
  log.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// START SERVER
// ============================================
const httpServer = createServer(app);

// Setup WebSocket (async)
let io: any;
(async () => {
  io = await setupWebSocket(httpServer);
})();

const server = httpServer.listen(PORT, () => {
  log.info(`🚀 Server started on port ${PORT}`);
  log.info(`📝 Environment: ${env.NODE_ENV}`);
  log.info(`🔗 API Documentation: http://localhost:${PORT}/api/docs`);
  log.info(`❤️  Health Check: http://localhost:${PORT}/api/health`);
  log.info(`🔌 WebSocket server initialized`);
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
const gracefulShutdown = async (signal: string) => {
  log.info(`${signal} received, starting graceful shutdown...`);

  server.close(async () => {
    log.info('HTTP server closed');

    try {
      await prisma.$disconnect();
      log.info('Database connections closed');
      process.exit(0);
    } catch (error) {
      log.error('Error during shutdown', { error });
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    log.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============================================
// UNHANDLED REJECTIONS
// ============================================
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  log.error('Unhandled Rejection', { reason, promise });
  // Don't exit in development
  if (env.NODE_ENV === 'production') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught Exception', { error: error.message, stack: error.stack });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

export default app;
