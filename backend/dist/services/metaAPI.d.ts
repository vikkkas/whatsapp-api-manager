export declare class MetaWhatsAppAPI {
    private axiosInstance;
    private phoneNumberId;
    private accessToken;
    constructor(phoneNumberId: string, accessToken: string);
    getPhoneNumberInfo(): Promise<{
        success: boolean;
        data: any;
    }>;
    sendTextMessage(to: string, text: string, options?: {
        preview_url?: boolean;
    }): Promise<{
        success: boolean;
        messageId: any;
        wabaMessageId: any;
    }>;
    sendTemplate(to: string, templateName: string, languageCode: string, components?: Array<{
        type: 'header' | 'body' | 'button';
        parameters: Array<{
            type: string;
            text?: string;
            image?: any;
            video?: any;
            document?: any;
        }>;
    }>): Promise<{
        success: boolean;
        messageId: any;
        wabaMessageId: any;
    }>;
    sendMediaMessage(to: string, mediaType: 'image' | 'video' | 'audio' | 'document', mediaId: string, options?: {
        caption?: string;
        filename?: string;
    }): Promise<{
        success: boolean;
        messageId: any;
        wabaMessageId: any;
    }>;
    uploadMedia(file: Buffer, mimeType: string, filename: string): Promise<{
        success: boolean;
        mediaId: any;
    }>;
    downloadMedia(mediaId: string): Promise<{
        success: boolean;
        data: Buffer<any>;
        mimeType: any;
    }>;
    markMessageAsRead(messageId: string): Promise<{
        success: boolean;
    }>;
    getTemplates(businessAccountId: string): Promise<{
        success: boolean;
        templates: any;
    }>;
    createTemplate(businessAccountId: string, name: string, category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION', language: string, components: Array<{
        type: string;
        format?: string;
        text?: string;
        buttons?: Array<{
            type: string;
            text: string;
            url?: string;
            phone_number?: string;
        }>;
    }>): Promise<{
        success: boolean;
        templateId: any;
    }>;
    deleteTemplate(businessAccountId: string, templateName: string): Promise<{
        success: boolean;
    }>;
    getBusinessProfile(): Promise<{
        success: boolean;
        profile: any;
    }>;
    updateBusinessProfile(profile: {
        about?: string;
        address?: string;
        description?: string;
        email?: string;
        vertical?: string;
        websites?: string[];
    }): Promise<{
        success: boolean;
    }>;
    private handleApiError;
}
export declare function getMetaAPIForTenant(tenantId: string): Promise<MetaWhatsAppAPI>;
export default MetaWhatsAppAPI;
//# sourceMappingURL=metaAPI.d.ts.map