import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  WhatsAppMessage,
  OutgoingMessage,
  MessageDeliveryResult,
  WebhookPayload,
  MediaFile,
  ChannelCapabilities,
  ValidationResult,
  WhatsAppAttachment,
  LocationData,
  ContactData,
  ChannelAdapter,
  ChannelType
} from '@glavito/shared-types';



@Injectable()
export class WhatsAppAdapter implements ChannelAdapter {
  readonly channelType = ChannelType.WHATSAPP;
  private readonly logger = new Logger(WhatsAppAdapter.name);
  
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly webhookVerifyToken: string;
  
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    
    this.baseUrl = this.configService.get<string>('WHATSAPP_API_BASE_URL', 'https://graph.facebook.com/v18.0');
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN', '');
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');
    this.webhookVerifyToken = this.configService.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN', '');
    
    if (!this.accessToken || !this.phoneNumberId) {
      this.logger.warn('WhatsApp configuration incomplete. Some features may not work.');
    }
    // Initialize counters lazily
    this.initMetrics().catch((err) => {
      this.logger.debug('initMetrics failed (whatsapp)', (err as any)?.message || String(err));
    });
  }

  private metricSentTotal?: any;
  private metricApi429Total?: any;
  private metricSendLatencyMs?: any;
  private templatesCacheByAccount: Map<string, { items: Array<{ name: string; category?: string; language?: string; status?: string; previewBody?: string; variables?: string[] }>; fetchedAt: number }> = new Map()

  private async initMetrics() {
    try {
      const prom = await import('prom-client');
      this.metricSentTotal = new prom.Counter({
        name: 'channel_whatsapp_messages_total',
        help: 'Total WhatsApp messages attempts',
        labelNames: ['status'] as const,
      });
      this.metricApi429Total = new prom.Counter({
        name: 'channel_whatsapp_rate_limit_total',
        help: 'WhatsApp API 429 occurrences',
      });
      this.metricSendLatencyMs = new prom.Histogram({
        name: 'channel_whatsapp_send_latency_ms',
        help: 'WhatsApp send latency in ms',
        buckets: [50,100,200,500,1000,2000,5000],
      });
    } catch (err) {
      this.logger.debug('prom-client init failed (whatsapp)', (err as any)?.message || String(err));
    }
  }
  
  async receiveMessage(webhook: WebhookPayload): Promise<WhatsAppMessage> {
    try {
      const data = webhook as any;
      
      // Check for WhatsApp Flow response
      if (data.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.nfm_reply) {
        return this.handleFlowResponse(data);
      }
      
      if (!data.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
        throw new Error('Invalid WhatsApp webhook payload');
      }
      
      const change = data.entry[0].changes[0];
      const message = change.value.messages[0];
      const contact = change.value.contacts?.[0];
      
      // Extract message content based on type
      let content = '';
      const messageType = message.type;
      const attachments: WhatsAppAttachment[] = [];
      let location: LocationData | undefined;
      let contactData: ContactData | undefined;
      
      switch (message.type) {
        case 'text':
          content = message.text?.body || '';
          break;
          
        case 'image':
          content = message.image?.caption || '[Image]';
          if (message.image) {
            attachments.push({
              id: message.image.id,
              type: 'image',
              url: '', // Will be populated after download
              mimeType: message.image.mime_type,
              whatsappMediaId: message.image.id,
              caption: message.image.caption
            });
          }
          break;
          
        case 'video':
          content = message.video?.caption || '[Video]';
          if (message.video) {
            attachments.push({
              id: message.video.id,
              type: 'video',
              url: '', // Will be populated after download
              filename: message.video.filename,
              mimeType: message.video.mime_type,
              whatsappMediaId: message.video.id,
              caption: message.video.caption
            });
          }
          break;
          
        case 'audio':
          content = '[Audio]';
          if (message.audio) {
            attachments.push({
              id: message.audio.id,
              type: message.audio.voice ? 'voice' : 'audio',
              url: '', // Will be populated after download
              mimeType: message.audio.mime_type,
              whatsappMediaId: message.audio.id
            });
          }
          break;
          
        case 'document':
          content = message.document?.caption || `[Document: ${message.document?.filename || 'Unknown'}]`;
          if (message.document) {
            attachments.push({
              id: message.document.id,
              type: 'document',
              url: '', // Will be populated after download
              filename: message.document.filename,
              mimeType: message.document.mime_type,
              whatsappMediaId: message.document.id,
              caption: message.document.caption
            });
          }
          break;
          
        case 'location':
          content = '[Location]';
          if (message.location) {
            location = {
              latitude: message.location.latitude,
              longitude: message.location.longitude,
              name: message.location.name,
              address: message.location.address
            };
          }
          break;
          
        case 'contacts':
          content = '[Contact]';
          if (message.contacts?.[0]) {
            const whatsappContact = message.contacts[0];
            contactData = {
              name: {
                formattedName: whatsappContact.name.formatted_name,
                firstName: whatsappContact.name.first_name,
                lastName: whatsappContact.name.last_name,
                middleName: whatsappContact.name.middle_name
              },
              phones: whatsappContact.phones?.map((phone: any) => ({
                phone: phone.phone,
                type: phone.type,
                waId: phone.wa_id
              })),
              emails: whatsappContact.emails?.map((email: any) => ({
                email: email.email,
                type: email.type
              }))
            };
          }
          break;
          
        default:
          content = `[Unsupported message type: ${message.type}]`;
      }
      
      const whatsappMessage: WhatsAppMessage = {
        id: this.generateId(),
        conversationId: '', // Will be set by orchestrator
        senderId: message.from,
        senderType: 'customer',
        content,
        messageType: messageType as any,
        channel: 'whatsapp',
        timestamp: new Date(parseInt(message.timestamp) * 1000),
        whatsappData: {
          messageId: message.id,
          phoneNumber: message.from,
          profileName: contact?.profile?.name,
          isForwarded: message.context?.forwarded,
          isFrequentlyForwarded: message.context?.frequently_forwarded,
          replyToMessageId: message.context?.id,
          contextInfo: message.context ? {
            quotedMessage: message.context
          } : undefined
        },
        attachments: attachments.length > 0 ? attachments : undefined,
        location,
        contact: contactData,
        metadata: {
          phoneNumberId: change.value.metadata.phone_number_id,
          displayPhoneNumber: change.value.metadata.display_phone_number
        }
      };
      
      this.logger.log(`Message received: ${message.id}, type: ${message.type}`);
      return whatsappMessage;
      
    } catch (error) {
      this.logger.error('Failed to receive WhatsApp message:', error);
      throw error;
    }
  }
  
  async sendMessage(conversationId: string, message: OutgoingMessage): Promise<MessageDeliveryResult> {
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      
      const normalizedTo = this.normalizePhone(String(message.recipientId || ''))
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: message.messageType
      };
      
      // Build payload based on message type
      switch (message.messageType) {
        case 'text':
          payload['text'] = { body: message.content };
          break;
          
        case 'template': {
          if (!message.templateId) {
            throw new Error('Template ID is required for template messages');
          }
          const language = ((message.metadata as any)?.language || (message as any)?.templateLanguage || 'en') as string
          payload['template'] = {
            name: message.templateId,
            language: { code: language },
            components: message.templateParams ? [
              {
                type: 'body',
                parameters: Object.values(message.templateParams).map(value => ({
                  type: 'text',
                  text: value
                }))
              }
            ] : undefined
          };
          break;
        }
          
        case 'image':
        case 'video':
        case 'audio':
        case 'document':
          if (message.attachments?.[0]) {
            const attachment = message.attachments[0];
            payload[message.messageType] = {
              link: attachment.url,
              caption: message.content || undefined
            };
          }
          break;
          
        default:
          throw new Error(`Unsupported message type: ${message.messageType}`);
      }
      
      // Add reply context if specified
      if (message.replyToMessageId) {
        payload['context'] = {
          message_id: message.replyToMessageId
        };
      }
      
      const start = Date.now();
      const doRequest = async () => firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        })
      )
      let response: any
      try {
        response = await doRequest()
      } catch (err: any) {
        // basic retry for 429 and transient 5xx
        const status = err?.response?.status
        if (status === 429 || (status >= 500 && status < 600)) {
          const retryAfter = parseInt(err?.response?.headers?.['retry-after'] || '2', 10)
          await new Promise((r) => setTimeout(r, isNaN(retryAfter) ? 1500 : retryAfter * 1000))
          response = await doRequest()
        } else {
          throw err
        }
      }
      
      const result: MessageDeliveryResult = {
        messageId: this.generateId(),
        status: 'sent',
        timestamp: new Date(),
        channelMessageId: response.data.messages?.[0]?.id
      };
      
      this.logger.log(`Message sent: ${result.messageId}, WhatsApp ID: ${result.channelMessageId}`);
      try {
        this.metricSentTotal?.inc({ status: 'success' });
        this.metricSendLatencyMs?.observe(Date.now() - start);
      } catch (err) {
        this.logger.debug('metrics record failed (whatsapp success)', (err as any)?.message || String(err));
      }
      
      return result;
      
    } catch (error) {
      const msg = this.normalizeApiError(error);
      this.logger.error(`Failed to send WhatsApp message: ${msg}`);
      try {
        // crude check for 429
        if ((error as any)?.response?.status === 429) this.metricApi429Total?.inc();
        this.metricSentTotal?.inc({ status: 'failed' });
      } catch (err) {
        this.logger.debug('metrics record failed (whatsapp error)', (err as any)?.message || String(err));
      }
      
      return {
        messageId: this.generateId(),
        status: 'failed',
        timestamp: new Date(),
        error: msg
      };
    }
  }
  
  async downloadMedia(mediaId: string): Promise<MediaFile> {
    try {
      // First, get media URL
      const mediaInfoUrl = `${this.baseUrl}/${mediaId}`;
      const mediaInfoResponse = await firstValueFrom(
        this.httpService.get(mediaInfoUrl, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      );
      
      const mediaUrl = mediaInfoResponse.data.url;
      const mimeType = mediaInfoResponse.data.mime_type;
      const fileSize = mediaInfoResponse.data.file_size;
      
      // Download the actual media
      const mediaResponse = await firstValueFrom(
        this.httpService.get(mediaUrl, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          responseType: 'arraybuffer'
        })
      );
      
      const mediaFile: MediaFile = {
        id: mediaId,
        filename: `whatsapp_media_${mediaId}`,
        mimeType,
        size: fileSize,
        data: Buffer.from(mediaResponse.data),
        url: mediaUrl
      };
      
      this.logger.log(`Media downloaded: ${mediaId}, size: ${fileSize}`);
      return mediaFile;
      
    } catch (error) {
      this.logger.error('Failed to download WhatsApp media:', error);
      throw error;
    }
  }
  
  async uploadMedia(file: MediaFile): Promise<string> {
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/media`;
      
      const formData = new (globalThis as any).FormData();
      formData.append('messaging_product', 'whatsapp');
      formData.append('file', new Blob([file.data], { type: file.mimeType }), file.filename);
      formData.append('type', file.mimeType);
      
      const response = await firstValueFrom(
        this.httpService.post(url, formData, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      );
      
      const mediaId = response.data.id;
      this.logger.log(`Media uploaded: ${mediaId}, filename: ${file.filename}`);
      
      return mediaId;
      
    } catch (error) {
      this.logger.error('Failed to upload WhatsApp media:', error);
      throw error;
    }
  }
  
  async markAsRead(_conversationId: string, messageId: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      
      await firstValueFrom(
        this.httpService.post(url, {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        }, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        })
      );
      
      this.logger.log(`Message marked as read: ${messageId}`);
      
    } catch (error) {
      this.logger.error('Failed to mark message as read:', error);
    }
  }
  
  getSupportedFeatures(): ChannelCapabilities {
    return {
      supportsAttachments: true,
      supportedAttachmentTypes: ['image', 'video', 'audio', 'document'],
      supportsLocation: true,
      supportsContacts: true,
      supportsTemplates: true,
      supportsRichMedia: true,
      supportsVoice: true,
      supportsVideo: false,
      maxMessageLength: 4096,
      maxAttachmentSize: 16 * 1024 * 1024, // 16MB
      rateLimits: {
        messagesPerMinute: 80,
        messagesPerHour: 1000,
        messagesPerDay: 100000
      }
    };
  }
  
  validateMessage(message: OutgoingMessage): ValidationResult[] {
    const results: ValidationResult[] = [];
    const capabilities = this.getSupportedFeatures();
    
    // Check message length
    if (capabilities.maxMessageLength && message.content.length > capabilities.maxMessageLength) {
      results.push({
        isValid: false,
        errors: [`Message content exceeds maximum length of ${capabilities.maxMessageLength} characters`],
        warnings: []
      });
    }
    
    // Validate phone number format
    if (!/^\d{10,15}$/.test(message.recipientId.replace(/\D/g, ''))) {
      results.push({
        isValid: false,
        errors: ['Invalid WhatsApp phone number format'],
        warnings: []
      });
    }
    
    // Validate template message
    if (message.messageType === 'template' && !message.templateId) {
      results.push({
        isValid: false,
        errors: ['Template ID is required for template messages'],
        warnings: []
      });
    }
    
    // Validate attachments
    if (message.attachments) {
      for (const attachment of message.attachments) {
        if (!capabilities.supportedAttachmentTypes.includes(attachment.type)) {
          results.push({
            isValid: false,
            errors: [`Attachment type '${attachment.type}' is not supported`],
            warnings: []
          });
        }
        
        if (attachment.size && capabilities.maxAttachmentSize && attachment.size > capabilities.maxAttachmentSize) {
          results.push({
            isValid: false,
            errors: [`Attachment size exceeds maximum of ${capabilities.maxAttachmentSize} bytes`],
            warnings: []
          });
        }
      }
    }
    
    return results;
  }
  
  // Webhook verification for WhatsApp
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      this.logger.log('WhatsApp webhook verified successfully');
      return challenge;
    }
    
    this.logger.warn('WhatsApp webhook verification failed');
    return null;
  }

  // Simple WABA templates sync with in-memory cache
  async listTemplates(forceRefresh = false): Promise<Array<{ name: string; category?: string; language?: string; status?: string; previewBody?: string; variables?: string[] }>> {
    const cacheTtlMs = 5 * 60 * 1000
    try {
      const businessAccountId = this.configService.get<string>('WHATSAPP_BUSINESS_ACCOUNT_ID', '')
      if (!businessAccountId) return []
      const cacheKey = businessAccountId
      const cached = this.templatesCacheByAccount.get(cacheKey)
      if (!forceRefresh && cached && Date.now() - cached.fetchedAt < cacheTtlMs) return cached.items
      const url = `${this.baseUrl}/${businessAccountId}/message_templates`
      const response = await firstValueFrom(this.httpService.get(url, { headers: { 'Authorization': `Bearer ${this.accessToken}` } }))
      const items = Array.isArray((response.data as any)?.data) ? (response.data as any).data.map((t: any) => {
        // Try to extract BODY component text and placeholder variables ({{1}}, {{2}}, ...)
        let previewBody: string | undefined
        let variables: string[] | undefined
        try {
          const components: any[] = Array.isArray(t.components) ? t.components : []
          const body = components.find((c: any) => (c.type || '').toString().toUpperCase() === 'BODY')
          const bodyText: string | undefined = body?.text
          if (bodyText) {
            previewBody = String(bodyText)
            const matches = Array.from(previewBody.matchAll(/\{\{(\d+)\}\}/g))
            const set = new Set<string>(matches.map(m => m[1]))
            if (set.size > 0) variables = Array.from(set).sort((a, b) => Number(a) - Number(b))
          }
        } catch {
          // ignore component parse errors
        }
        return {
          name: String(t.name),
          category: t.category,
          language: t.language,
          status: t.status,
          previewBody,
          variables,
        }
      }) : []
      this.templatesCacheByAccount.set(cacheKey, { items, fetchedAt: Date.now() })
      return items
    } catch (err) {
      this.logger.debug('listTemplates failed (whatsapp)', (err as any)?.message || String(err))
      return []
    }
  }

  private normalizeApiError(err: any): string {
    try {
      const status = err?.response?.status
      const code = err?.response?.data?.error?.code
      if (status === 429) return 'Rate limited by WhatsApp API (429)'
      if (code === 131026) return 'Template not approved'
      if (code === 131047) return 'Recipient opted out'
      return err?.response?.data?.error?.message || (err?.message || 'Unknown error')
    } catch { return 'Unknown error' }
  }

  private generateId(): string {
    return `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private normalizePhone(input: string): string {
    const digits = input.replace(/\D/g, '')
    // Minimal normalization; assume already includes country code in most cases
    return digits
  }

  /**
   * Handle WhatsApp Flow response (including satisfaction surveys)
   */
  private async handleFlowResponse(data: any): Promise<WhatsAppMessage> {
    const change = data.entry[0].changes[0];
    const message = change.value.messages[0];
    const contact = change.value.contacts?.[0];
    const flowReply = message.interactive.nfm_reply;
    
    let content = '[Flow Response]';
    const metadata: any = {
      flowResponse: true,
      responseJson: flowReply.response_json,
    };

    try {
      const responseData = JSON.parse(flowReply.response_json);
      
      // Check if this is a satisfaction survey response
      if (responseData.surveyId) {
        content = this.formatSatisfactionSurveyResponse(responseData);
        metadata.surveyResponse = true;
        metadata.surveyId = responseData.surveyId;
        
        // Process the survey response asynchronously
        this.processSatisfactionSurveyResponse(responseData).catch((error) => {
          this.logger.error('Failed to process satisfaction survey response:', error);
        });
      } else {
        // Generic flow response
        content = `Flow completed with data: ${JSON.stringify(responseData, null, 2)}`;
      }
    } catch (error) {
      this.logger.warn('Failed to parse flow response JSON:', error);
      content = `Flow response: ${flowReply.response_json}`;
    }

    const whatsappMessage: WhatsAppMessage = {
      id: this.generateId(),
      conversationId: '', // Will be set by orchestrator
      senderId: message.from,
      senderType: 'customer',
      content,
      messageType: 'interactive',
      channel: 'whatsapp',
      timestamp: new Date(parseInt(message.timestamp) * 1000),
      whatsappData: {
        messageId: message.id,
        phoneNumber: message.from,
        profileName: contact?.profile?.name,
        flowResponse: flowReply,
      },
      metadata,
    };

    this.logger.log(`Flow response received: ${message.id}`);
    return whatsappMessage;
  }

  /**
   * Format satisfaction survey response for display
   */
  private formatSatisfactionSurveyResponse(responseData: any): string {
    const parts = ['📋 Customer Satisfaction Survey Response'];
    
    // Extract ratings and answers
    Object.entries(responseData).forEach(([key, value]) => {
      if (key === 'surveyId') return;
      
      if (key.startsWith('answer_')) {
        const questionNum = key.replace('answer_', '');
        
        // Convert rating IDs to readable format
        if (typeof value === 'string' && /^\d+$/.test(value)) {
          const ratingValue = parseInt(value) + 1; // Convert 0-4 to 1-5
          if (ratingValue >= 1 && ratingValue <= 5) {
            parts.push(`⭐ Rating: ${ratingValue}/5 stars`);
            return;
          }
        }
        
        parts.push(`💬 Response ${questionNum}: ${value}`);
      }
    });
    
    parts.push('✅ Thank you for your feedback!');
    return parts.join('\n');
  }

  /**
   * Process satisfaction survey response
   */
  private async processSatisfactionSurveyResponse(responseData: any): Promise<void> {
    try {
      const surveyId = responseData.surveyId;
      if (!surveyId) return;

      // Extract overall rating (first rating question)
      let rating = 5; // default
      let comment = '';
      const customAnswers: Record<string, unknown> = {};

      Object.entries(responseData).forEach(([key, value]) => {
        if (key === 'surveyId') return;
        
        if (key.startsWith('answer_')) {
          customAnswers[key] = value;
          
          // Try to extract rating from first answer
          if (key === 'answer_0' && typeof value === 'string' && /^\d+$/.test(value)) {
            const ratingValue = parseInt(value) + 1; // Convert 0-4 to 1-5
            if (ratingValue >= 1 && ratingValue <= 5) {
              rating = ratingValue;
            }
          }
          
          // Try to extract comment from text answers
          if (typeof value === 'string' && value.length > 10 && !comment) {
            comment = value;
          }
        }
      });

      // Submit to satisfaction service
      const response = await (globalThis as any).fetch('/api/satisfaction/surveys/' + surveyId + '/response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          comment,
          customAnswers,
        }),
      });

      if (response.ok) {
        this.logger.log(`Satisfaction survey response processed: ${surveyId}, rating: ${rating}`);
      } else {
        this.logger.error(`Failed to process satisfaction survey response: ${response.status}`);
      }
    } catch (error) {
      this.logger.error('Error processing satisfaction survey response:', error);
    }
  }
}