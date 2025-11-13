import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

// ============================================
// EXPRESS REQUEST EXTENSIONS
// ============================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string; // Added for compatibility
    email: string;
    tenantId: string;
    role: string;
  };
  tenantId?: string;
}

// ============================================
// JWT PAYLOADS
// ============================================

export interface JWTPayload extends JwtPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  userId: string;
  tenantId: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

// Auth
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  tenantName: string;
  tenantSlug: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
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
    };
    accessToken: string;
    refreshToken: string;
  };
}

// WABA Credentials
export interface AddWABACredentialRequest {
  phoneNumberId: string;
  phoneNumber: string;
  accessToken: string;
  displayName?: string;
  businessAccountId?: string;
}

// Send Message
export interface SendTextMessageRequest {
  to: string;
  message: string;
  phoneNumberId?: string; // Optional: which WABA number to send from
}

export interface SendMediaMessageRequest {
  to: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  mediaId?: string;
  caption?: string;
  phoneNumberId?: string;
}

export interface SendTemplateMessageRequest {
  to: string;
  templateName: string;
  languageCode: string;
  parameters?: string[];
  phoneNumberId?: string;
}

// ============================================
// META WEBHOOK TYPES
// ============================================

export interface MetaWebhookEntry {
  id: string;
  changes: MetaWebhookChange[];
}

export interface MetaWebhookChange {
  value: MetaWebhookValue;
  field: string;
}

export interface MetaWebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: MetaContact[];
  messages?: MetaMessage[];
  statuses?: MetaMessageStatus[];
}

export interface MetaContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface MetaMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contacts' | 'interactive';
  text?: {
    body: string;
  };
  image?: MetaMedia;
  video?: MetaMedia;
  audio?: MetaMedia;
  document?: MetaMedia;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  interactive?: {
    type: string;
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
}

export interface MetaMedia {
  id: string;
  mime_type: string;
  sha256: string;
  caption?: string;
  filename?: string;
}

export interface MetaMessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message?: string;
  }>;
}

// ============================================
// META API RESPONSE TYPES
// ============================================

export interface MetaSendMessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export interface MetaMediaUploadResponse {
  id: string;
}

export interface MetaMediaUrlResponse {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
  messaging_product: 'whatsapp';
}

export interface MetaErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

// ============================================
// QUEUE JOB DATA TYPES
// ============================================

export interface WebhookProcessorJobData {
  rawEventId: string;
}

export interface MessageSendJobData {
  messageId: string;
  tenantId: string;
}

export interface CampaignJobData {
  campaignId: string;
  batchId: string;
  contacts: Array<{
    phone: string;
    name?: string;
    variables?: Record<string, string>;
  }>;
}

// ============================================
// RATE LIMITER TYPES
// ============================================

export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  retryAfter?: number;
}

export interface TokenBucketState {
  tokens: number;
  lastRefill: number;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface DashboardStats {
  today: {
    messagesSent: number;
    messagesReceived: number;
    messagesDelivered: number;
    messagesFailed: number;
  };
  thisWeek: {
    messagesSent: number;
    messagesReceived: number;
    activeConversations: number;
  };
  thisMonth: {
    messagesSent: number;
    messagesReceived: number;
    conversationsStarted: number;
    conversationsResolved: number;
  };
}

export interface MessageChart {
  date: string;
  sent: number;
  received: number;
  delivered: number;
  failed: number;
}

// ============================================
// UTILITY TYPES
// ============================================

export type PaginationParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
};
