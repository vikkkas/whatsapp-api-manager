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
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'TEMPLATE' | 'INTERACTIVE';
  text?: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
  templateName?: string;
  templateParams?: unknown;
  interactiveData?: {
    type: 'button' | 'list' | 'button_reply' | 'list_reply';
    header?: { type: string; text?: string; image?: any; video?: any; document?: any };
    body?: { text: string };
    footer?: { text: string };
    action?: {
      buttons?: Array<{ type: 'reply'; reply: { id: string; title: string } }>;
      button?: string;
      sections?: Array<{ title?: string; rows: Array<{ id: string; title: string; description?: string }> }>;
    };
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
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

  agentLogin: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiRequest<LoginResponse>('/api/auth/agent-login', {
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

  refresh: async (refreshToken: string) => {
    const response = await apiRequest<LoginResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    
    // Update stored tokens
    localStorage.setItem('authToken', response.data.token);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    
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

  getCurrentTenant: () => {
    const tenantStr = localStorage.getItem('tenant');
    if (!tenantStr) return null;
    try {
      return JSON.parse(tenantStr);
    } catch {
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
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
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'interactive';
    text?: string;
    mediaUrl?: string;
    caption?: string;
    filename?: string;
    templateName?: string;
    languageCode?: string;
    templateComponents?: unknown[];
    interactive?: any;
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

// Media API
export const mediaAPI = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/api/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }
    
    return response.json();
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

  update: async (id: string, data: { status?: string; assignedTo?: string | null; tags?: string[]; contactName?: string }) => {
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

// Template API
export const templateAPI = {
  getAll: async () => {
    return apiRequest('/api/templates');
  },

  sync: async () => {
    return apiRequest('/api/templates/sync', {
      method: 'POST',
    });
  },

  get: async (id: string) => {
    return apiRequest(`/api/templates/${id}`);
  },

  create: async (data: {
    name: string;
    category: string;
    language: string;
    components: Array<{
      type: string;
      text?: string;
      format?: string;
      buttons?: Array<{ type: string; text: string }>;
    }>;
  }) => {
    return apiRequest('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: {
    name?: string;
    category?: string;
    language?: string;
    components?: Array<{
      type: string;
      text?: string;
      format?: string;
      buttons?: Array<{ type: string; text: string }>;
    }>;
  }) => {
    return apiRequest(`/api/templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/api/templates/${id}`, {
      method: 'DELETE',
    });
  },
};

export const templateMessageAPI = {
  send: async (data: {
    phoneNumberId: string;
    to: string;
    templateId?: string;
    templateName?: string;
    languageCode?: string;
    templateComponents?: unknown[];
  }) => {
    return apiRequest('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumberId: data.phoneNumberId,
        to: data.to,
        type: 'template',
        templateName: data.templateName || data.templateId,
        languageCode: data.languageCode,
        templateComponents: data.templateComponents,
      }),
    });
  },
};

// Analytics API
export const analyticsAPI = {
  getOverview: async (days: number = 30) => {
    return apiRequest(`/api/analytics/overview?days=${days}`);
  },
  getMessages: async (days: number = 7) => {
    return apiRequest(`/api/analytics/messages?days=${days}`);
  },
};

// Contact API
export const contactAPI = {
  list: async (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<{ contacts: any[]; total: number }>(`/api/contacts?${query}`);
  },

  get: async (id: string) => {
    return apiRequest(`/api/contacts/${id}`);
  },

  create: async (data: {
    phoneNumber: string;
    name?: string;
    email?: string;
    company?: string;
    notes?: string;
    tags?: string[];
  }) => {
    return apiRequest('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: {
    phoneNumber?: string;
    name?: string;
    email?: string;
    company?: string;
    notes?: string;
    tags?: string[];
  }) => {
    return apiRequest(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/api/contacts/${id}`, {
      method: 'DELETE',
    });
  },

  importCSV: async (contacts: any[]) => {
    return apiRequest('/api/contacts/import/csv', {
      method: 'POST',
      body: JSON.stringify({ contacts }),
    });
  },

  exportCSV: async () => {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE_URL}/api/contacts/export`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Export failed');
    return response.text();
  },
};

// Campaign API
export const campaignAPI = {
  list: async (params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<{ campaigns: any[]; total: number }>(`/api/campaigns?${query}`);
  },

  get: async (id: string) => {
    return apiRequest(`/api/campaigns/${id}`);
  },

  create: async (data: {
    name: string;
    description?: string;
    messageType: 'TEXT' | 'TEMPLATE' | 'INTERACTIVE';
    templateId?: string;
    messageText?: string;
    interactiveType?: 'button' | 'list';
    interactiveData?: any;
    scheduledAt?: string;
    contactIds?: string[];
  }) => {
    return apiRequest('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: {
    name?: string;
    description?: string;
    status?: string;
    messageType?: string;
    templateId?: string;
    messageText?: string;
    interactiveType?: string;
    interactiveData?: any;
    scheduledAt?: string;
  }) => {
    return apiRequest(`/api/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/api/campaigns/${id}`, {
      method: 'DELETE',
    });
  },

  addContacts: async (id: string, contactIds: string[]) => {
    return apiRequest(`/api/campaigns/${id}/contacts`, {
      method: 'POST',
      body: JSON.stringify({ contactIds }),
    });
  },

  removeContacts: async (id: string, contactIds: string[]) => {
    return apiRequest(`/api/campaigns/${id}/contacts`, {
      method: 'DELETE',
      body: JSON.stringify({ contactIds }),
    });
  },

  execute: async (id: string) => {
    return apiRequest(`/api/campaigns/${id}/execute`, {
      method: 'POST',
    });
  },

  getAnalytics: async (id: string) => {
    return apiRequest(`/api/campaigns/${id}/analytics`);
  },
};

// Agent API
export const agentAPI = {
  list: async (params?: { status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<{ agents: any[] }>(`/api/agents?${query}`);
  },

  get: async (id: string) => {
    return apiRequest(`/api/agents/${id}`);
  },

  create: async (data: {
    name: string;
    email: string;
    maxConcurrentChats?: number;
    skills?: string[];
  }) => {
    return apiRequest('/api/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: {
    name?: string;
    email?: string;
    status?: string;
    maxConcurrentChats?: number;
    skills?: string[];
  }) => {
    return apiRequest(`/api/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/api/agents/${id}`, {
      method: 'DELETE',
    });
  },

  updateStatus: async (id: string, status: string) => {
    return apiRequest(`/api/agents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  getStats: async (id: string) => {
    return apiRequest(`/api/agents/${id}/stats`);
  },
};

// Canned Response API
export const cannedResponseAPI = {
  list: async (params?: { category?: string; search?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<{ responses: any[] }>(`/api/canned-responses?${query}`);
  },

  get: async (id: string) => {
    return apiRequest(`/api/canned-responses/${id}`);
  },

  create: async (data: {
    title: string;
    content: string;
    shortcut: string;
    category?: string;
    isPublic?: boolean;
  }) => {
    return apiRequest('/api/canned-responses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: {
    title?: string;
    content?: string;
    shortcut?: string;
    category?: string;
    isPublic?: boolean;
  }) => {
    return apiRequest(`/api/canned-responses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/api/canned-responses/${id}`, {
      method: 'DELETE',
    });
  },

  getCategories: async () => {
    return apiRequest<{ categories: string[] }>('/api/canned-responses/meta/categories');
  },
};

// Settings API
export const settingsAPI = {
  get: async () => {
    return apiRequest('/api/settings');
  },

  update: async (data: Record<string, unknown>) => {
    return apiRequest('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  verifyWebhook: async (verifyToken: string) => {
    const challenge = `verify-${Date.now()}`;
    const params = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.verify_token': verifyToken,
      'hub.challenge': challenge,
    });

    const response = await fetch(`${API_BASE_URL}/api/webhook?${params.toString()}`);
    const text = await response.text();

    if (!response.ok) {
      throw new Error('Verification request failed');
    }

    return {
      success: text === challenge,
      challenge: text,
    };
  },
};

// Flow API
export const flowAPI = {
  list: async () => {
    return apiRequest<{ flows: any[] }>('/api/flows');
  },

  get: async (id: string) => {
    return apiRequest(`/api/flows/${id}`);
  },

  create: async (data: {
    name: string;
    description?: string;
    triggerType: string;
    trigger?: string;
  }) => {
    return apiRequest('/api/flows', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: {
    name?: string;
    description?: string;
    triggerType?: string;
    trigger?: string;
    nodes?: any[];
    edges?: any[];
    isActive?: boolean;
  }) => {
    return apiRequest(`/api/flows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/api/flows/${id}`, {
      method: 'DELETE',
    });
  },
};
