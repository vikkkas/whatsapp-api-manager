import axios from 'axios';
import prisma from '../config/prisma.js';
import { log } from '../utils/logger.js';
const META_API_VERSION = 'v18.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
export class MetaWhatsAppAPI {
    axiosInstance;
    phoneNumberId;
    accessToken;
    constructor(phoneNumberId, accessToken) {
        this.phoneNumberId = phoneNumberId;
        this.accessToken = accessToken;
        this.axiosInstance = axios.create({
            baseURL: META_BASE_URL,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
        this.axiosInstance.interceptors.response.use((response) => response, (error) => {
            this.handleApiError(error);
            return Promise.reject(error);
        });
    }
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
        }
        catch (error) {
            log.error('Failed to get phone number info', { error });
            throw error;
        }
    }
    async sendTextMessage(to, text, options) {
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
        }
        catch (error) {
            log.error('Failed to send text message', { to, error });
            throw error;
        }
    }
    async sendTemplate(to, templateName, languageCode, components) {
        try {
            const payload = {
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
        }
        catch (error) {
            log.error('Failed to send template message', { to, templateName, error });
            throw error;
        }
    }
    async sendMediaMessage(to, mediaType, mediaId, options) {
        try {
            const payload = {
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
        }
        catch (error) {
            log.error('Failed to send media message', { to, mediaType, error });
            throw error;
        }
    }
    async uploadMedia(file, mimeType, filename) {
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
        }
        catch (error) {
            log.error('Failed to upload media', { filename, error });
            throw error;
        }
    }
    async downloadMedia(mediaId) {
        try {
            const urlResponse = await this.axiosInstance.get(`/${mediaId}`);
            const mediaUrl = urlResponse.data.url;
            const mediaResponse = await this.axiosInstance.get(mediaUrl, {
                responseType: 'arraybuffer',
            });
            return {
                success: true,
                data: Buffer.from(mediaResponse.data),
                mimeType: mediaResponse.headers['content-type'],
            };
        }
        catch (error) {
            log.error('Failed to download media', { mediaId, error });
            throw error;
        }
    }
    async markMessageAsRead(messageId) {
        try {
            await this.axiosInstance.post(`/${this.phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
            });
            log.info('Message marked as read', { messageId });
            return { success: true };
        }
        catch (error) {
            log.error('Failed to mark message as read', { messageId, error });
            throw error;
        }
    }
    async getTemplates(businessAccountId) {
        try {
            const response = await this.axiosInstance.get(`/${businessAccountId}/message_templates`, {
                params: {
                    fields: 'name,language,status,category,components',
                    limit: 100,
                },
            });
            return {
                success: true,
                templates: response.data.data,
            };
        }
        catch (error) {
            log.error('Failed to get templates', { error });
            throw error;
        }
    }
    async createTemplate(businessAccountId, name, category, language, components) {
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
        }
        catch (error) {
            log.error('Failed to create template', { name, error });
            throw error;
        }
    }
    async deleteTemplate(businessAccountId, templateName) {
        try {
            await this.axiosInstance.delete(`/${businessAccountId}/message_templates`, {
                params: {
                    name: templateName,
                },
            });
            log.info('Template deleted', { templateName });
            return { success: true };
        }
        catch (error) {
            log.error('Failed to delete template', { templateName, error });
            throw error;
        }
    }
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
        }
        catch (error) {
            log.error('Failed to get business profile', { error });
            throw error;
        }
    }
    async updateBusinessProfile(profile) {
        try {
            const response = await this.axiosInstance.post(`/${this.phoneNumberId}/whatsapp_business_profile`, {
                messaging_product: 'whatsapp',
                ...profile,
            });
            log.info('Business profile updated');
            return { success: true };
        }
        catch (error) {
            log.error('Failed to update business profile', { error });
            throw error;
        }
    }
    handleApiError(error) {
        if (error.response) {
            const data = error.response.data;
            log.error('Meta API Error', {
                status: error.response.status,
                code: data.error?.code,
                message: data.error?.message,
                type: data.error?.type,
                errorSubcode: data.error?.error_subcode,
            });
            if (error.response.status === 429) {
                log.warn('Rate limit exceeded');
            }
            else if (error.response.status === 401) {
                log.error('Invalid access token');
            }
            else if (data.error?.code === 100) {
                log.error('Invalid parameter');
            }
            else if (data.error?.code === 131047) {
                log.error('Message undeliverable - user may have blocked the number');
            }
        }
        else if (error.request) {
            log.error('No response from Meta API', { error: error.message });
        }
        else {
            log.error('Request setup error', { error: error.message });
        }
    }
}
export async function getMetaAPIForTenant(tenantId) {
    const wabaCredential = await prisma.wABACredential.findFirst({
        where: { tenantId, isValid: true },
    });
    if (!wabaCredential) {
        throw new Error(`No valid WABA credentials found for tenant: ${tenantId}`);
    }
    return new MetaWhatsAppAPI(wabaCredential.phoneNumberId, wabaCredential.accessToken);
}
export default MetaWhatsAppAPI;
//# sourceMappingURL=metaAPI.js.map