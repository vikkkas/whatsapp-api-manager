import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import prisma from './config/prisma.js';
import { log, httpLogStream } from './utils/logger.js';
import { setupWebSocket } from './services/websocket.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
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
const app = express();
const PORT = process.env.PORT || 3000;
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:3000',
    process.env.FRONTEND_URL
].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.includes('localhost')) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: httpLogStream }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.set('trust proxy', true);
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
app.get('/', (req, res) => {
    res.json({
        name: 'WhatsApp SaaS API',
        version: '2.0.0',
        status: 'running',
        docs: '/api/docs',
        health: '/api/health'
    });
});
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.path
    });
});
app.use((err, req, res, _next) => {
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
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
const httpServer = createServer(app);
const io = setupWebSocket(httpServer);
const server = httpServer.listen(PORT, () => {
    log.info(`🚀 Server started on port ${PORT}`);
    log.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    log.info(`🔗 API Documentation: http://localhost:${PORT}/api/docs`);
    log.info(`❤️  Health Check: http://localhost:${PORT}/api/health`);
    log.info(`🔌 WebSocket server initialized`);
});
const gracefulShutdown = async (signal) => {
    log.info(`${signal} received, starting graceful shutdown...`);
    server.close(async () => {
        log.info('HTTP server closed');
        try {
            await prisma.$disconnect();
            log.info('Database connections closed');
            process.exit(0);
        }
        catch (error) {
            log.error('Error during shutdown', { error });
            process.exit(1);
        }
    });
    setTimeout(() => {
        log.error('Forced shutdown due to timeout');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection', { reason, promise });
    if (process.env.NODE_ENV === 'production') {
        gracefulShutdown('UNHANDLED_REJECTION');
    }
});
process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception', { error: error.message, stack: error.stack });
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});
export default app;
//# sourceMappingURL=server.js.map