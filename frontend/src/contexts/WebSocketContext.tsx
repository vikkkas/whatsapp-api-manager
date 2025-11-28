import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';
import { useConversationStore } from '../store/conversationStore';
import { useMessageStore } from '../store/messageStore';
import websocketService from '../services/websocket';
import { toast } from 'sonner';

interface WebSocketContextType {
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<Props> = ({ children }) => {
  const { token, isAuthenticated } = useAuthStore();
  const { addConversation, updateConversation, addTypingUser, removeTypingUser, incrementUnreadCount, selectedConversationId } = useConversationStore();
  const { addMessage, updateMessage } = useMessageStore();
  const [isConnected, setIsConnected] = React.useState(false);
  const selectedConversationRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    selectedConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    if (isAuthenticated && token) {
      // Connect to WebSocket
      websocketService.connect(token);

      // Setup event listeners
      websocketService.on('connect', () => {
        setIsConnected(true);
        console.log('✅ WebSocket connected');
      });

      websocketService.on('disconnect', () => {
        setIsConnected(false);
        console.log('❌ WebSocket disconnected');
      });

      // Handle new messages
      websocketService.on('message:new', (message) => {
        console.log('📨 New message received:', message);
        
        // Add message to store
        addMessage(message.conversationId, message);

        // Note: Unread count and notifications are handled by notification:new event
        // to avoid duplicates since backend sends both events
      });

      // Handle message status updates
      websocketService.on('message:status', ({ messageId, status }) => {
        const activeConversation = selectedConversationRef.current;
        if (activeConversation) {
          updateMessage(activeConversation, messageId, { status: status as any });
        }
      });

      // Handle new conversations
      websocketService.on('conversation:new', (conversation) => {
        console.log('🆕 New conversation received:', conversation);
        addConversation(conversation);
        
        // Request notification permission if not already granted
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      });

      // Handle conversation updates
      websocketService.on('conversation:updated', (conversation) => {
        console.log('💬 Conversation updated:', conversation);
        updateConversation(conversation.id, conversation);
      });

      // Handle notification events (from backend pub/sub)
      websocketService.on('notification:new', ({ type, conversationId, message }) => {
        console.log('🔔 Notification received:', { type, conversationId, message });
        
        if (type === 'message' && message.direction === 'INBOUND') {
          // Add message to store if not already added
          addMessage(conversationId, message);
          
          // Increment unread count if conversation is not selected
          if (conversationId !== selectedConversationRef.current) {
            incrementUnreadCount(conversationId);
          }
          
          // Get conversation for display name
          const conversations = useConversationStore.getState().conversations;
          const conversation = conversations.find(c => c.id === conversationId);
          const displayName = conversation?.contactName || message.from;
          
          // Show toast notification
          toast.info(`💬 ${displayName}`, {
            description: message.text?.substring(0, 50) || 'New message',
          });
          
          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`New message from ${displayName}`, {
              body: message.text?.substring(0, 100) || 'New message',
              icon: '/whatsapp-icon.png',
              tag: conversationId,
            });
          }
        }
      });

      // Handle typing indicators
      websocketService.on('typing:start', ({ conversationId, userId, userName }) => {
        addTypingUser(conversationId, userId);
      });

      websocketService.on('typing:stop', ({ conversationId, userId }) => {
        removeTypingUser(conversationId, userId);
      });

      // Cleanup on unmount
      return () => {
        console.log('🧹 Cleaning up WebSocket listeners');
        websocketService.disconnect();
      };
    }
  }, [isAuthenticated, token]);

  const value: WebSocketContextType = React.useMemo(() => ({
    isConnected,
    joinConversation: (id) => websocketService.joinConversation(id),
    leaveConversation: (id) => websocketService.leaveConversation(id),
    startTyping: (id) => websocketService.startTyping(id),
    stopTyping: (id) => websocketService.stopTyping(id),
  }), [isConnected]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
