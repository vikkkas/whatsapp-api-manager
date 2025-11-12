import { create } from 'zustand';
import type { Conversation } from '../lib/api';

interface ConversationState {
  conversations: Conversation[];
  selectedConversationId: string | null;
  searchQuery: string;
  statusFilter: 'ALL' | 'OPEN' | 'PENDING' | 'RESOLVED' | 'ARCHIVED';
  isLoading: boolean;
  typingUsers: Map<string, Set<string>>; // conversationId -> Set of userIds typing
  
  // Actions
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  selectConversation: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: 'ALL' | 'OPEN' | 'PENDING' | 'RESOLVED' | 'ARCHIVED') => void;
  setLoading: (loading: boolean) => void;
  addTypingUser: (conversationId: string, userId: string) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  clearTyping: (conversationId: string) => void;
  incrementUnreadCount: (conversationId: string) => void;
  resetUnreadCount: (conversationId: string) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  selectedConversationId: null,
  searchQuery: '',
  statusFilter: 'ALL',
  isLoading: false,
  typingUsers: new Map(),

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === id ? { ...conv, ...updates } : conv
      ),
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((conv) => conv.id !== id),
    })),

  selectConversation: (id) => set({ selectedConversationId: id }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setStatusFilter: (status) => set({ statusFilter: status }),

  setLoading: (loading) => set({ isLoading: loading }),

  addTypingUser: (conversationId, userId) =>
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      if (!newTypingUsers.has(conversationId)) {
        newTypingUsers.set(conversationId, new Set());
      }
      newTypingUsers.get(conversationId)!.add(userId);
      return { typingUsers: newTypingUsers };
    }),

  removeTypingUser: (conversationId, userId) =>
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      const users = newTypingUsers.get(conversationId);
      if (users) {
        users.delete(userId);
        if (users.size === 0) {
          newTypingUsers.delete(conversationId);
        }
      }
      return { typingUsers: newTypingUsers };
    }),

  clearTyping: (conversationId) =>
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      newTypingUsers.delete(conversationId);
      return { typingUsers: newTypingUsers };
    }),

  incrementUnreadCount: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, unreadCount: (conv.unreadCount || 0) + 1 }
          : conv
      ),
    })),

  resetUnreadCount: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      ),
    })),
}));
