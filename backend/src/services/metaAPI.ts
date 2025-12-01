import axios, { AxiosInstance, AxiosError } from 'axios';
import prisma from '../config/prisma.js';
import { log } from '../utils/logger.js';

const META_API_VERSION = 'v18.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Meta WhatsApp Business API Service
 * Handles all interactions with Meta's Graph API
 */
export class MetaWhatsAppAPI {
  private axiosInstance: AxiosInstance;
  private phoneNumberId: string;
  private accessToken: string;

  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;

    this.axiosInstance = axios.create({
      baseURL: META_BASE_URL,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get phone number information and validation
   */
  async getPhoneNumberInfo() {
    try {
      const response = await this.axiosInstance.get(`/${this.phoneNumberId}`, {
        params: {
          fields: 'verified_name,display_phone_number,quality_rating,messaging_limit_tier,account_mode,certificate,code_verification_status'
        }
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      log.error('Failed to get phone number info', { error });
      throw error;
    }
  }

  /**
   * Send a text message
   */
  async sendTextMessage(to: string, text: string, options?: { preview_url?: boolean }) {
    try {
      const response = await this.axiosInstance.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: options?.preview_url || false,
          body: text,
        },
      });

      log.info('Text message sent', { to, messageId: response.data.messages[0].id });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        wabaMessageId: response.data.messages[0].id,
      };
    } catch (error) {
      log.error('Failed to send text message', { to, error });
      throw error;
    }
  }

  /**
   * Send a template message
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    components?: Array<{
      type: 'header' | 'body' | 'button';
      parameters: Array<{ type: string; text?: string; image?: any; video?: any; document?: any }>;
    }>
  ) {
    try {
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
        },
      };

      if (components && components.length > 0) {
        payload.template.components = components;
      }

      const response = await this.axiosInstance.post(`/${this.phoneNumberId}/messages`, payload);

      log.info('Template message sent', { to, templateName, messageId: response.data.messages[0].id });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        wabaMessageId: response.data.messages[0].id,
      };
    } catch (error) {
      log.error('Failed to send template message', { to, templateName, error });
      throw error;
    }
  }

  /**
   * Send media message (image, video, audio, document)
   */
  async sendMediaMessage(
    to: string,
    mediaType: 'image' | 'video' | 'audio' | 'document',
    mediaId: string,
    options?: {
      caption?: string;
      filename?: string;
    }
  ) {
    try {
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: mediaType,
        [mediaType]: {
          id: mediaId,
        },
      };

      if (options?.caption && (mediaType === 'image' || mediaType === 'video')) {
        payload[mediaType].caption = options.caption;
      }

      if (options?.filename && mediaType === 'document') {
        payload[mediaType].filename = options.filename;
      }

      const response = await this.axiosInstance.post(`/${this.phoneNumberId}/messages`, payload);

      log.info('Media message sent', { to, mediaType, messageId: response.data.messages[0].id });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        wabaMessageId: response.data.messages[0].id,
      };
    } catch (error) {
      log.error('Failed to send media message', { to, mediaType, error });
      throw error;
    }
  }

  /**
   * Upload media to WhatsApp
   */
  async uploadMedia(file: Buffer, mimeType: string, filename: string) {
    try {
      const formData = new FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', new Blob([file], { type: mimeType }), filename);

      const response = await this.axiosInstance.post(`/${this.phoneNumberId}/media`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      log.info('Media uploaded', { mediaId: response.data.id, filename });

      return {
        success: true,
        mediaId: response.data.id,
      };
    } catch (error) {
      log.error('Failed to upload media', { filename, error });
      throw error;
    }
  }

  /**
   * Download media from WhatsApp
   */
  async downloadMedia(mediaId: string) {
    try {
      // Get media URL
      const urlResponse = await this.axiosInstance.get(`/${mediaId}`);
      const mediaUrl = urlResponse.data.url;

      // Download media
      const mediaResponse = await this.axiosInstance.get(mediaUrl, {
        responseType: 'arraybuffer',
      });

      return {
        success: true,
        data: Buffer.from(mediaResponse.data),
        mimeType: mediaResponse.headers['content-type'],
      };
    } catch (error) {
      log.error('Failed to download media', { mediaId, error });
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string) {
    try {
      await this.axiosInstance.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });

      log.info('Message marked as read', { messageId });

      return { success: true };
    } catch (error) {
      log.error('Failed to mark message as read', { messageId, error });
      throw error;
    }
  }

  /**
   * Send interactive message (buttons, lists, etc.)
   */
  async sendInteractiveMessage(
    to: string,
    interactive: {
      type: 'button' | 'list';
      header?: {
        type: 'text' | 'image' | 'video' | 'document';
        text?: string;
        image?: { link: string };
        video?: { link: string };
        document?: { link: string };
      };
      body: {
        text: string;
      };
      footer?: {
        text: string;
      };
      action: {
        buttons?: Array<{
          type: 'reply';
          reply: {
            id: string;
            title: string;
          };
        }>;
        button?: string; // For list messages
        sections?: Array<{
          title?: string;
          rows: Array<{
            id: string;
            title: string;
            description?: string;
          }>;
        }>;
      };
    }
  ) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive,
      };

      const response = await this.axiosInstance.post(`/${this.phoneNumberId}/messages`, payload);

      log.info('Interactive message sent', { to, type: interactive.type, messageId: response.data.messages[0].id });

      return {
        success: true,
        messageId: response.data.messages[0].id,
        wabaMessageId: response.data.messages[0].id,
      };
    } catch (error) {
      log.error('Failed to send interactive message', { to, error });
      throw error;
    }
  }

  /**
   * Send quick reply buttons (up to 3 buttons)
   */
  async sendQuickReplyButtons(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    options?: {
      headerText?: string;
      footerText?: string;
    }
  ) {
    if (buttons.length > 3) {
      throw new Error('Maximum 3 buttons allowed for quick replies');
    }

    const interactive: any = {
      type: 'button',
      body: {
        text: bodyText,
      },
      action: {
        buttons: buttons.map(btn => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title.substring(0, 20), // Max 20 chars
          },
        })),
      },
    };

    if (options?.headerText) {
      interactive.header = {
        type: 'text',
        text: options.headerText,
      };
    }

    if (options?.footerText) {
      interactive.footer = {
        text: options.footerText,
      };
    }

    return this.sendInteractiveMessage(to, interactive);
  }

  /**
   * Send list message (up to 10 sections with multiple rows each)
   */
  async sendListMessage(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title?: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>,
    options?: {
      headerText?: string;
      footerText?: string;
    }
  ) {
    if (sections.length > 10) {
      throw new Error('Maximum 10 sections allowed for list messages');
    }

    const interactive: any = {
      type: 'list',
      body: {
        text: bodyText,
      },
      action: {
        button: buttonText.substring(0, 20), // Max 20 chars
        sections: sections.map(section => ({
          title: section.title?.substring(0, 24), // Max 24 chars
          rows: section.rows.map(row => ({
            id: row.id.substring(0, 200), // Max 200 chars
            title: row.title.substring(0, 24), // Max 24 chars
            description: row.description?.substring(0, 72), // Max 72 chars
          })),
        })),
      },
    };

    if (options?.headerText) {
      interactive.header = {
        type: 'text',
        text: options.headerText,
      };
    }

    if (options?.footerText) {
      interactive.footer = {
        text: options.footerText,
      };
    }

    return this.sendInteractiveMessage(to, interactive);
  }

  /**
   * Get message templates
   */
  async getTemplates(businessAccountId: string) {
    try {
      const response = await this.axiosInstance.get(`/${businessAccountId}/message_templates`, {
        params: {
          fields: 'name,language,status,category,components,id,rejection_reason',
          limit: 100,
        },
      });

      return {
        success: true,
        templates: response.data.data,
      };
    } catch (error) {
      log.error('Failed to get templates', { error });
      throw error;
    }
  }

  /**
   * Create a new message template
   */
  async createTemplate(
    businessAccountId: string,
    name: string,
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
    language: string,
    components: Array<{
      type: string;
      format?: string;
      text?: string;
      buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
    }>
  ) {
    try {
      const response = await this.axiosInstance.post(`/${businessAccountId}/message_templates`, {
        name,
        category,
        language,
        components,
      });

      log.info('Template created', { templateId: response.data.id, name });

      return {
        success: true,
        templateId: response.data.id,
      };
    } catch (error) {
      log.error('Failed to create template', { name, error });
      throw error;
    }
  }

  /**
   * Delete a message template
   */
  async deleteTemplate(businessAccountId: string, templateName: string, language: string) {
    try {
      await this.axiosInstance.delete(`/${businessAccountId}/message_templates`, {
        params: {
          name: templateName,
          language,
        },
      });

      log.info('Template deleted', { templateName, language });

      return { success: true };
    } catch (error) {
      log.error('Failed to delete template', { templateName, error });
      throw error;
    }
  }

  /**
   * Get business profile
   */
  async getBusinessProfile() {
    try {
      const response = await this.axiosInstance.get(`/${this.phoneNumberId}/whatsapp_business_profile`, {
        params: {
          fields: 'about,address,description,email,profile_picture_url,websites,vertical',
        },
      });

      return {
        success: true,
        profile: response.data.data[0],
      };
    } catch (error) {
      log.error('Failed to get business profile', { error });
      throw error;
    }
  }

  /**
   * Update business profile
   */
  async updateBusinessProfile(profile: {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    vertical?: string;
    websites?: string[];
  }) {
    try {
      const response = await this.axiosInstance.post(`/${this.phoneNumberId}/whatsapp_business_profile`, {
        messaging_product: 'whatsapp',
        ...profile,
      });

      log.info('Business profile updated');

      return { success: true };
    } catch (error) {
      log.error('Failed to update business profile', { error });
      throw error;
    }
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: AxiosError) {
    if (error.response) {
      const data: any = error.response.data;
      log.error('Meta API Error', {
        status: error.response.status,
        code: data.error?.code,
        message: data.error?.message,
        type: data.error?.type,
        errorSubcode: data.error?.error_subcode,
      });

      // Handle specific error cases
      if (error.response.status === 429) {
        log.warn('Rate limit exceeded');
      } else if (error.response.status === 401) {
        log.error('Invalid access token');
      } else if (data.error?.code === 100) {
        log.error('Invalid parameter');
      } else if (data.error?.code === 131047) {
        log.error('Message undeliverable - user may have blocked the number');
      }
    } else if (error.request) {
      log.error('No response from Meta API', { error: error.message });
    } else {
      log.error('Request setup error', { error: error.message });
    }
  }
}

/**
 * Get Meta API instance for a tenant
 */
export async function getMetaAPIForTenant(tenantId: string): Promise<MetaWhatsAppAPI> {
  const wabaCredential = await prisma.wABACredential.findFirst({
    where: { tenantId, isValid: true },
  });

  if (!wabaCredential) {
    throw new Error(`No valid WABA credentials found for tenant: ${tenantId}`);
  }

  return new MetaWhatsAppAPI(wabaCredential.phoneNumberId, wabaCredential.accessToken);
}

export default MetaWhatsAppAPI;
