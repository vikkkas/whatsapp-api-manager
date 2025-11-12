// API base configuration  
const API_BASE_URL = (import.meta.env as any).VITE_BACKEND_URL || 'http://localhost:3000';

// Types
export interface LoginResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    tenant: {
      id: string;
      name: string;
      slug: string;
      plan: string;
      status: string;
      themeColor?: string;
      logoUrl?: string;
    };
    token: string;
    refreshToken: string;
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
  filename?: string;
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
    const response = await apiRequest<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    // Store tokens
    localStorage.setItem('authToken', response.data.token);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    localStorage.setItem('tenant', JSON.stringify(response.data.tenant));
    
    return response;
  },

  register: async (email: string, password: string, name: string, tenantName: string, tenantSlug: string): Promise<LoginResponse> => {
    const response = await apiRequest<LoginResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, tenantName, tenantSlug }),
    });
    
    // Store tokens
    localStorage.setItem('authToken', response.data.token);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    localStorage.setItem('tenant', JSON.stringify(response.data.tenant));
    
    return response;
  },

  me: async () => {
    return apiRequest('/api/auth/me');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('authToken');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
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

// Template API (placeholders for future use)
export const templateAPI = {
  getAll: async () => {
    return apiRequest('/api/templates');
  },
};

// Analytics API (placeholders for future use)
export const analyticsAPI = {
  getOverview: async () => {
    return apiRequest('/api/analytics');
  },
};

// Settings API (placeholders for future use)
export const settingsAPI = {
  get: async () => {
    return apiRequest('/api/settings');
  },
};

// Health check
export const healthAPI = {
  check: async () => {
    return apiRequest('/api/health');
  },
};
