import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

interface WebSocketEvents {
  'message:new': (message: any) => void;
  'message:status': (data: { messageId: string; status: string }) => void;
  'conversation:updated': (conversation: any) => void;
  'typing:start': (data: { conversationId: string; userId: string; userName: string }) => void;
  'typing:stop': (data: { conversationId: string; userId: string }) => void;
  'user:online': (data: { userId: string }) => void;
  'user:offline': (data: { userId: string }) => void;
  'connect': () => void;
  'disconnect': () => void;
  'error': (error: Error) => void;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private eventHandlers: Map<string, Set<Function>> = new Map();

  connect(token: string): void {
    if (this.socket?.connected || this.isConnecting) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.isConnecting = true;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 10000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      console.log('✅ WebSocket connected:', this.socket?.id);
      toast.success('Connected to live updates');
      this.emit('connect');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnecting = false;
      console.log('❌ WebSocket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, need to reconnect manually
        this.reconnect();
      }
      this.emit('disconnect');
    });

    this.socket.on('connect_error', (error) => {
      this.isConnecting = false;
      this.reconnectAttempts++;
      console.error('WebSocket connection error:', error);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('Connection failed. Please refresh the page.');
      }
    });

    // Message events
    this.socket.on('message:new', (message) => {
      console.log('📨 New message received:', message);
      this.emit('message:new', message);
    });

    this.socket.on('message:status', (data) => {
      console.log('📬 Message status updated:', data);
      this.emit('message:status', data);
    });

    // Conversation events
    this.socket.on('conversation:updated', (conversation) => {
      console.log('💬 Conversation updated:', conversation);
      this.emit('conversation:updated', conversation);
    });

    // Typing indicators
    this.socket.on('typing:start', (data) => {
      this.emit('typing:start', data);
    });

    this.socket.on('typing:stop', (data) => {
      this.emit('typing:stop', data);
    });

    // User presence
    this.socket.on('user:online', (data) => {
      this.emit('user:online', data);
    });

    this.socket.on('user:offline', (data) => {
      this.emit('user:offline', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      toast.error(error.message || 'WebSocket error occurred');
      this.emit('error', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
      console.log('WebSocket manually disconnected');
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.socket?.connect();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }

  // Join a conversation room
  joinConversation(conversationId: string): void {
    this.socket?.emit('conversation:join', { conversationId });
  }

  // Leave a conversation room
  leaveConversation(conversationId: string): void {
    this.socket?.emit('conversation:leave', { conversationId });
  }

  // Send typing indicator
  startTyping(conversationId: string): void {
    this.socket?.emit('typing:start', { conversationId });
  }

  stopTyping(conversationId: string): void {
    this.socket?.emit('typing:stop', { conversationId });
  }

  // Mark message as read
  markAsRead(messageId: string): void {
    this.socket?.emit('message:read', { messageId });
  }

  // Generic event emitter
  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }

  // Subscribe to events
  on<K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as Function);
  }

  // Unsubscribe from events
  off<K extends keyof WebSocketEvents>(event: K, handler: WebSocketEvents[K]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler as Function);
    }
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Get socket ID
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
