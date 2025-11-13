import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { log } from '../utils/logger.js';
let io = null;
export function setupWebSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:8080',
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication token required'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.data = { user: decoded };
            next();
        }
        catch (err) {
            log.error('WebSocket authentication failed', { error: String(err) });
            next(new Error('Authentication failed'));
        }
    });
    io.on('connection', (socket) => {
        const authSocket = socket;
        const user = authSocket.data.user;
        log.info('WebSocket client connected', {
            socketId: socket.id,
            userId: user.userId,
            tenantId: user.tenantId,
        });
        socket.join(`user:${user.userId}`);
        socket.join(`tenant:${user.tenantId}`);
        socket.to(`tenant:${user.tenantId}`).emit('user:online', {
            userId: user.userId,
        });
        socket.on('conversation:join', ({ conversationId }) => {
            socket.join(`conversation:${conversationId}`);
            log.info('User joined conversation', {
                userId: user.userId,
                conversationId,
            });
        });
        socket.on('conversation:leave', ({ conversationId }) => {
            socket.leave(`conversation:${conversationId}`);
            log.info('User left conversation', {
                userId: user.userId,
                conversationId,
            });
        });
        socket.on('typing:start', ({ conversationId }) => {
            socket.to(`conversation:${conversationId}`).emit('typing:start', {
                conversationId,
                userId: user.userId,
                userName: user.email.split('@')[0],
            });
        });
        socket.on('typing:stop', ({ conversationId }) => {
            socket.to(`conversation:${conversationId}`).emit('typing:stop', {
                conversationId,
                userId: user.userId,
            });
        });
        socket.on('message:read', async ({ messageId }) => {
            try {
                socket.emit('message:status', {
                    messageId,
                    status: 'READ',
                });
            }
            catch (error) {
                log.error('Failed to mark message as read', {
                    error: String(error),
                    messageId,
                });
            }
        });
        socket.on('disconnect', (reason) => {
            log.info('WebSocket client disconnected', {
                socketId: socket.id,
                userId: user.userId,
                reason,
            });
            socket.to(`tenant:${user.tenantId}`).emit('user:offline', {
                userId: user.userId,
            });
        });
        socket.on('error', (error) => {
            log.error('WebSocket error', {
                socketId: socket.id,
                userId: user.userId,
                error: String(error),
            });
        });
    });
    log.info('WebSocket server initialized');
    return io;
}
export function broadcastNewMessage(conversationId, message) {
    if (!io) {
        log.warn('WebSocket not initialized, cannot broadcast message');
        return;
    }
    io.to(`conversation:${conversationId}`).emit('message:new', message);
    log.info('Broadcasted new message', { conversationId, messageId: message.id });
}
export function broadcastMessageStatus(conversationId, messageId, status) {
    if (!io)
        return;
    io.to(`conversation:${conversationId}`).emit('message:status', {
        messageId,
        status,
    });
}
export function broadcastConversationUpdate(conversationId, conversation) {
    if (!io)
        return;
    io.to(`conversation:${conversationId}`).emit('conversation:updated', conversation);
    log.info('Broadcasted conversation update', { conversationId });
}
export function notifyUser(userId, event, data) {
    if (!io)
        return;
    io.to(`user:${userId}`).emit(event, data);
}
export function getIO() {
    return io;
}
//# sourceMappingURL=websocket.js.map