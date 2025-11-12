// API base configuration  
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Types
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    tenantId: string;
    role: string;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  waMessageId?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  from: string;
  to: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  text?: string;
  mediaUrl?: string;
  caption?: string;
  createdAt: string;
  conversation?: {
    id: string;
    contactPhone: string;
    contactName?: string;
  };
}

export interface Conversation {
  id: string;
  contactPhone: string;
  contactName?: string;
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'ARCHIVED';
  unreadCount: number;
  lastMessageAt: string;
  assignedAgent?: {
    id: string;
    name: string;
    email: string;
  };
  messages?: Message[];
}

// Get token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Generic API request function
async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    };

    const response = await fetch(url, { ...defaultOptions, ...options });
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const data = await apiRequest<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Store tokens
    localStorage.setItem('authToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  },

  register: async (email: string, password: string, name: string, organizationName: string): Promise<LoginResponse> => {
    const data = await apiRequest<LoginResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, organizationName }),
    });
    
    // Store tokens
    localStorage.setItem('authToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    return data;
  },

  me: async () => {
    return apiRequest('/api/auth/me');
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
};

// Message API
export const messageAPI = {
  list: async (params?: { conversationId?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<{ messages: Message[]; pagination: any }>(`/api/messages?${query}`);
  },

  get: async (id: string) => {
    return apiRequest<Message>(`/api/messages/${id}`);
  },

  send: async (data: {
    phoneNumberId: string;
    to: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document';
    text?: string;
    mediaUrl?: string;
    caption?: string;
    filename?: string;
  }) => {
    return apiRequest<Message>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: { status: string }) => {
    return apiRequest<Message>(`/api/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Conversation API
export const conversationAPI = {
  list: async (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest<{ conversations: Conversation[]; pagination: any }>(`/api/conversations?${query}`);
  },

  get: async (id: string) => {
    return apiRequest<Conversation>(`/api/conversations/${id}`);
  },

  update: async (id: string, data: { status?: string; assignedTo?: string | null; tags?: string[] }) => {
    return apiRequest<Conversation>(`/api/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  archive: async (id: string) => {
    return apiRequest(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
  },

  stats: async () => {
    return apiRequest('/api/conversations/stats/summary');
  },
};
    });
  },

  // Send a template message
  sendTemplate: async (to: string, templateName: string, language: string = 'en_US', parameters: string[] = []) => {
    return apiRequest('/api/messages/send-template', {
      method: 'POST',
      body: JSON.stringify({ 
        to, 
        templateName, 
        language,
        parameters 
      }),
    });
  },

  // Send a media message
  sendMedia: async (to: string, mediaType: 'image' | 'video' | 'audio' | 'document', mediaUrl: string, caption?: string) => {
    return apiRequest('/api/messages/send-media', {
      method: 'POST',
      body: JSON.stringify({
        to,
        mediaType,
        mediaUrl,
        caption
      }),
    });
  },

  // Get all messages
  getAll: async (params?: { phone?: string; limit?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.phone) searchParams.append('phone', params.phone);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest(`/api/messages${query}`);
  },

  // Get conversation with a specific user
  getConversation: async (phone: string, params?: { limit?: number; page?: number; since?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.since) searchParams.append('since', params.since);
    
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest(`/api/messages/conversation/${phone}${query}`);
  },

  // Get all users/contacts
  getUsers: async (params?: { limit?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest(`/api/messages/users${query}`);
  },
};

// Template API
export const templateAPI = {
  // Get all templates
  getAll: async (params?: { status?: string; limit?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) searchParams.append('page', params.page.toString());
    
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiRequest(`/api/templates${query}`);
  },

  // Get single template
  getById: async (id: string) => {
    return apiRequest(`/api/templates/${id}`);
  },

  // Create new template
  create: async (template: { name: string; content: string; status?: string }) => {
    return apiRequest('/api/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  },

  // Update template
  update: async (id: string, template: { name?: string; content?: string; status?: string }) => {
    return apiRequest(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  },

  // Delete template
  delete: async (id: string) => {
    return apiRequest(`/api/templates/${id}`, {
      method: 'DELETE',
    });
  },
};

// Analytics API
export const analyticsAPI = {
  // Get general analytics
  getOverview: async (days?: number) => {
    const query = days ? `?days=${days}` : '';
    return apiRequest(`/api/analytics${query}`);
  },

  // Get detailed message analytics
  getMessageAnalytics: async (days?: number) => {
    const query = days ? `?days=${days}` : '';
    return apiRequest(`/api/analytics/messages${query}`);
  },
};

// Settings API
export const settingsAPI = {
  // Get current settings
  get: async () => {
    return apiRequest('/api/settings');
  },

  // Update settings
  update: async (settings: { 
    autoReplyEnabled?: boolean; 
    autoReplyMessage?: string;
    phoneNumberId?: string;
    webhookVerifyToken?: string;
  }) => {
    return apiRequest('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  // Test WhatsApp connection
  testConnection: async () => {
    return apiRequest('/api/settings/test');
  },

  // Get system status
  getStatus: async () => {
    return apiRequest('/api/settings/status');
  },
};

// Health check
export const healthAPI = {
  check: async () => {
    return apiRequest('/health');
  },
};

// Server-Sent Events API
export const sseAPI = {
  // Connect to SSE endpoint
  connect: (onMessage: (event: SSEMessage) => void, onError?: (error: Event) => void) => {
    const eventSource = new EventSource(`${API_BASE_URL}/api/sse/stream`);
    
    eventSource.addEventListener('message', (event) => {
      console.log('SSE raw message received:', event);
      try {
        const data = JSON.parse(event.data);
        console.log('SSE parsed data:', data);
        onMessage(data);
      } catch (error) {
        console.error('Error parsing SSE message:', error, 'Raw data:', event.data);
      }
    });
    
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      if (onError) onError(error);
    };
    
    return eventSource;
  },

  // Get connection status
  getStatus: async () => {
    return apiRequest('/api/sse/status');
  },
};

// Export types for TypeScript
export interface Message {
  _id: string;
  from: string;
  to: string;
  message: string;
  direction: 'inbound' | 'outbound';
  type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template';
  media?: {
    type: 'image' | 'video' | 'audio' | 'document';
    id?: string;
    mimeType?: string;
    sha256?: string;
    fileSize?: number;
    filename?: string;
    url?: string;
    caption?: string;
  };
  templateName?: string;
  parameters?: string[];
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  phone: string;
  name: string;
  adSource: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SSEMessage {
  type: 'new_message' | 'user_updated' | 'heartbeat';
  data?: Message | User;
  timestamp?: string;
}

export interface Template {
  _id: string;
  name: string;
  content: string;
  status: 'approved' | 'pending' | 'rejected';
  category?: string;
  language?: string;
  createdAt: string;
  updatedAt: string;
  metaData?: {
    components?: unknown[];
    quality_score?: unknown;
    rejected_reason?: string;
  };
}

export interface Analytics {
  overview: {
    totalMessages: number;
    recentMessages: number;
    totalUsers: number;
    activeUsers: number;
    inboundMessages: number;
    outboundMessages: number;
    avgResponseTime: string;
  };
  charts: {
    messagesPerDay: Array<{
      _id: string;
      count: number;
      inbound: number;
      outbound: number;
    }>;
    messageDistribution: {
      inbound: number;
      outbound: number;
    };
  };
  topUsers: Array<{
    phone: string;
    messageCount: number;
    lastMessage: string;
    name?: string;
  }>;
  templates: {
    total: number;
    approved: number;
    pending: number;
  };
}

// Authentication interfaces
export interface AuthUser {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

// Authentication API
export const authAPI = {
  // Login
  login: async (credentials: LoginCredentials) => {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // Store token and user data
    if (response.token) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  },

  // Register (admin only)
  register: async (data: RegisterData) => {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get current user profile
  getProfile: async () => {
    return apiRequest('/api/auth/profile');
  },

  // Update profile
  updateProfile: async (data: { username?: string; email?: string }) => {
    return apiRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Change password
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    return apiRequest('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Logout
  logout: async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = getAuthToken();
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  // Get current user from localStorage
  getCurrentUser: (): AuthUser | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};