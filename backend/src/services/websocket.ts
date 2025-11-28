import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { log } from '../utils/logger.js';

interface UserPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

interface AuthenticatedSocket extends Socket {
  data: {
    user: UserPayload;
  };
}

let io: Server | null = null;

export async function setupWebSocket(server: HTTPServer): Promise<Server> {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:8080',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;
      (socket as AuthenticatedSocket).data = { user: decoded };
      next();
    } catch (err) {
      log.error('WebSocket authentication failed', { error: String(err) });
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const user = authSocket.data.user;

    log.info('WebSocket client connected', {
      socketId: socket.id,
      userId: user.userId,
      tenantId: user.tenantId,
    });

    // Join user's personal room for direct messages
    socket.join(`user:${user.userId}`);
    socket.join(`tenant:${user.tenantId}`);

    // Broadcast user online status
    socket.to(`tenant:${user.tenantId}`).emit('user:online', {
      userId: user.userId,
    });

    // Join conversation room
    socket.on('conversation:join', ({ conversationId }: { conversationId: string }) => {
      socket.join(`conversation:${conversationId}`);
      log.info('User joined conversation', {
        userId: user.userId,
        conversationId,
      });
    });

    // Leave conversation room
    socket.on('conversation:leave', ({ conversationId }: { conversationId: string }) => {
      socket.leave(`conversation:${conversationId}`);
      log.info('User left conversation', {
        userId: user.userId,
        conversationId,
      });
    });

    // Typing indicators
    socket.on('typing:start', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', {
        conversationId,
        userId: user.userId,
        userName: user.email.split('@')[0], // Simple name extraction
      });
    });

    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', {
        conversationId,
        userId: user.userId,
      });
    });

    // Mark message as read
    socket.on('message:read', async ({ messageId }: { messageId: string }) => {
      try {
        // Broadcast to conversation participants
        socket.emit('message:status', {
          messageId,
          status: 'READ',
        });
      } catch (error) {
        log.error('Failed to mark message as read', {
          error: String(error),
          messageId,
        });
      }
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      log.info('WebSocket client disconnected', {
        socketId: socket.id,
        userId: user.userId,
        reason,
      });

      // Broadcast user offline status
      socket.to(`tenant:${user.tenantId}`).emit('user:offline', {
        userId: user.userId,
      });
    });

    // Error handler
    socket.on('error', (error) => {
      log.error('WebSocket error', {
        socketId: socket.id,
        userId: user.userId,
        error: String(error),
      });
    });
  });

  // Subscribe to Redis pub/sub for events from workers
  const { subscribeToWebSocketEvents } = await import('./pubsub.js');
  subscribeToWebSocketEvents((event) => {
    log.info('Received WebSocket event from Redis', { type: event.type });
    
    switch (event.type) {
      case 'message:new':
        if (event.data.conversationId && event.data.message) {
          broadcastNewMessage(event.data.conversationId, event.data.message);
        }
        break;
      case 'conversation:new':
        if (event.data.conversation) {
          broadcastNewConversation(event.data.conversation);
        }
        break;
      case 'conversation:updated':
        if (event.data.conversationId && event.data.conversation) {
          broadcastConversationUpdate(event.data.conversationId, event.data.conversation);
        }
        break;
      case 'notification:new':
        if (event.data.message && event.data.message.tenantId) {
          io.to(`tenant:${event.data.message.tenantId}`).emit('notification:new', event.data);
        }
        break;
    }
  });

  log.info('WebSocket server initialized');
  return io;
}

// Helper functions to broadcast events from other parts of the app

export function broadcastNewMessage(conversationId: string, message: any): void {
  if (!io) {
    log.warn('WebSocket not initialized, cannot broadcast message');
    return;
  }

  // Broadcast to conversation room
  io.to(`conversation:${conversationId}`).emit('message:new', message);
  
  // Also broadcast to tenant room for notifications
  if (message.tenantId) {
    io.to(`tenant:${message.tenantId}`).emit('notification:new', {
      type: 'message',
      conversationId,
      message,
    });
  }
  
  log.info('Broadcasted new message', { conversationId, messageId: message.id });
}

export function broadcastMessageStatus(conversationId: string, messageId: string, status: string): void {
  if (!io) return;

  io.to(`conversation:${conversationId}`).emit('message:status', {
    messageId,
    status,
  });
}

export function broadcastConversationUpdate(conversationId: string, conversation: any): void {
  if (!io) return;

  // Broadcast to conversation room
  io.to(`conversation:${conversationId}`).emit('conversation:updated', conversation);
  
  // Also broadcast to tenant room so all users see the update
  if (conversation.tenantId) {
    io.to(`tenant:${conversation.tenantId}`).emit('conversation:updated', conversation);
  }
  
  log.info('Broadcasted conversation update', { conversationId });
}

export function broadcastNewConversation(conversation: any): void {
  if (!io) return;

  // Broadcast new conversation to all users in the tenant
  if (conversation.tenantId) {
    io.to(`tenant:${conversation.tenantId}`).emit('conversation:new', conversation);
    log.info('Broadcasted new conversation', { conversationId: conversation.id });
  }
}

export function notifyUser(userId: string, event: string, data: any): void {
  if (!io) return;

  io.to(`user:${userId}`).emit(event, data);
}

export function getIO(): Server | null {
  return io;
}

