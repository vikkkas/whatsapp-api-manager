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

  useEffect(() => {
    if (isAuthenticated && token) {
      // Connect to WebSocket
      websocketService.connect(token);

      // Setup event listeners
      websocketService.on('connect', () => {
        setIsConnected(true);
      });

      websocketService.on('disconnect', () => {
        setIsConnected(false);
      });

      // Handle new messages
      websocketService.on('message:new', (message) => {
        // Add message to store
        addMessage(message.conversationId, message);

        // Increment unread count if conversation is not selected
        if (message.conversationId !== selectedConversationId && message.direction === 'INBOUND') {
          incrementUnreadCount(message.conversationId);
        }

        // Show notification for inbound messages
        if (message.direction === 'INBOUND') {
          toast.success(`New message from ${message.from}`);
        }
      });

      // Handle message status updates
      websocketService.on('message:status', ({ messageId, status }) => {
        // Find which conversation this message belongs to and update it
        // This is a limitation - we'd need to track message->conversation mapping
        // For now, we'll update in the current conversation
        if (selectedConversationId) {
          updateMessage(selectedConversationId, messageId, { status: status as any });
        }
      });

      // Handle conversation updates
      websocketService.on('conversation:updated', (conversation) => {
        updateConversation(conversation.id, conversation);
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
        websocketService.disconnect();
      };
    }
  }, [isAuthenticated, token]);

  const value: WebSocketContextType = {
    isConnected,
    joinConversation: (id) => websocketService.joinConversation(id),
    leaveConversation: (id) => websocketService.leaveConversation(id),
    startTyping: (id) => websocketService.startTyping(id),
    stopTyping: (id) => websocketService.stopTyping(id),
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
