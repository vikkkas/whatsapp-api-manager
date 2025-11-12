import { create } from 'zustand';
import type { Message } from '../lib/api';

interface MessageState {
  messagesByConversation: Map<string, Message[]>;
  isLoading: boolean;
  isSending: boolean;
  
  // Actions
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  clearMessages: (conversationId: string) => void;
  setLoading: (loading: boolean) => void;
  setSending: (sending: boolean) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messagesByConversation: new Map(),
  isLoading: false,
  isSending: false,

  setMessages: (conversationId, messages) =>
    set((state) => {
      const newMap = new Map(state.messagesByConversation);
      newMap.set(conversationId, messages);
      return { messagesByConversation: newMap };
    }),

  addMessage: (conversationId, message) =>
    set((state) => {
      const newMap = new Map(state.messagesByConversation);
      const existing = newMap.get(conversationId) || [];
      
      // Prevent duplicates
      if (existing.some(m => m.id === message.id)) {
        return state;
      }
      
      newMap.set(conversationId, [...existing, message]);
      return { messagesByConversation: newMap };
    }),

  updateMessage: (conversationId, messageId, updates) =>
    set((state) => {
      const newMap = new Map(state.messagesByConversation);
      const messages = newMap.get(conversationId);
      
      if (messages) {
        newMap.set(
          conversationId,
          messages.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          )
        );
      }
      
      return { messagesByConversation: newMap };
    }),

  removeMessage: (conversationId, messageId) =>
    set((state) => {
      const newMap = new Map(state.messagesByConversation);
      const messages = newMap.get(conversationId);
      
      if (messages) {
        newMap.set(
          conversationId,
          messages.filter((msg) => msg.id !== messageId)
        );
      }
      
      return { messagesByConversation: newMap };
    }),

  clearMessages: (conversationId) =>
    set((state) => {
      const newMap = new Map(state.messagesByConversation);
      newMap.delete(conversationId);
      return { messagesByConversation: newMap };
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setSending: (sending) => set({ isSending: sending }),
}));
