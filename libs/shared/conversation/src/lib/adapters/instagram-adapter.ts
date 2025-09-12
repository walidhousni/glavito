import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  InstagramMessage,
  OutgoingMessage,
  MessageDeliveryResult,
  WebhookPayload,
  MediaFile,
  ChannelCapabilities,
  ValidationResult,
  InstagramAttachment,
  ChannelAdapter,
  ChannelType
} from '@glavito/shared-types';



@Injectable()
export class InstagramAdapter implements ChannelAdapter {
  readonly channelType = ChannelType.INSTAGRAM;
  private readonly logger = new Logger(InstagramAdapter.name);
  
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly pageId: string;
  // private readonly appSecret: string; // Unused
  private readonly verifyToken: string;
  
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    
    this.baseUrl = this.configService.get<string>('INSTAGRAM_API_BASE_URL', 'https://graph.facebook.com/v18.0');
    this.accessToken = this.configService.get<string>('INSTAGRAM_ACCESS_TOKEN', '');
    this.pageId = this.configService.get<string>('INSTAGRAM_PAGE_ID', '');
    // this.appSecret = this.configService.get<string>('INSTAGRAM_APP_SECRET', ''); // Unused
    this.verifyToken = this.configService.get<string>('INSTAGRAM_VERIFY_TOKEN', '');
    
    if (!this.accessToken || !this.pageId) {
      this.logger.warn('Instagram configuration incomplete. Some features may not work.');
    }
    this.initMetrics().catch((err) => {
      this.logger.debug('InstagramAdapter metrics init failed', (err as any)?.message);
    });
  }

  private usernameCache: Map<string, { username?: string; fetchedAt: number }> = new Map()

  private metricSentTotal?: any;
  private metricApi429Total?: any;
  private metricSendLatencyMs?: any;

  private async initMetrics() {
    try {
      const prom = await import('prom-client');
      this.metricSentTotal = new prom.Counter({
        name: 'channel_instagram_messages_total',
        help: 'Total Instagram messages attempts',
        labelNames: ['status'] as const,
      });
      this.metricApi429Total = new prom.Counter({
        name: 'channel_instagram_rate_limit_total',
        help: 'Instagram API 429 occurrences',
      });
      this.metricSendLatencyMs = new prom.Histogram({
        name: 'channel_instagram_send_latency_ms',
        help: 'Instagram send latency in ms',
        buckets: [50,100,200,500,1000,2000,5000],
      });
    } catch (err) {
      this.logger.debug('InstagramAdapter metrics disabled', (err as any)?.message);
    }
  }
  
  async receiveMessage(webhook: WebhookPayload): Promise<InstagramMessage> {
    try {
      const data = webhook as any;
      
      // Handle direct messages
      if (data.messaging?.[0]) {
        return this.processDirectMessage(data.messaging[0]);
      }
      
      // Handle comments and mentions
      if (data.changes?.[0]) {
        return this.processComment(data.changes[0]);
      }
      
      throw new Error('Invalid Instagram webhook payload');
      
    } catch (error) {
      this.logger.error('Failed to receive Instagram message:', error);
      throw error;
    }
  }
  
  private async processDirectMessage(messaging: any): Promise<InstagramMessage> {
    const message = messaging.message;
    const sender = messaging.sender;
    
    let content = '';
    let messageType = 'text';
    const attachments: InstagramAttachment[] = [];
    
    if (message.text) {
      content = message.text;
      messageType = 'text';
    } else if (message.attachments) {
      const attachment = message.attachments[0];
      messageType = attachment.type;
      
      switch (attachment.type) {
        case 'image':
          content = '[Image]';
          attachments.push({
            id: this.generateId(),
            type: 'image',
            url: attachment.payload.url,
            instagramMediaId: attachment.payload.url
          });
          break;
          
        case 'video':
          content = '[Video]';
          attachments.push({
            id: this.generateId(),
            type: 'video',
            url: attachment.payload.url,
            instagramMediaId: attachment.payload.url
          });
          break;
          
        case 'audio':
          content = '[Audio]';
          attachments.push({
            id: this.generateId(),
            type: 'audio',
            url: attachment.payload.url,
            instagramMediaId: attachment.payload.url
          });
          break;
          
        default:
          content = `[${attachment.type}]`;
      }
    } else if (message.quick_reply) {
      content = message.quick_reply.payload;
      messageType = 'quick_reply';
    }
    
    const instagramMessage: InstagramMessage = {
      id: this.generateId(),
      conversationId: '', // Will be set by orchestrator
      senderId: sender.id,
      senderType: 'customer',
      content,
      messageType: messageType as any,
      channel: 'instagram',
      timestamp: new Date(messaging.timestamp),
      instagramData: {
        messageId: message.mid,
        igId: sender.id,
        username: await this.getUsernameCached(sender.id),
        isStoryReply: false
      },
      attachments: attachments.length > 0 ? attachments : undefined,
      metadata: {
        replyToMessageId: message.reply_to?.mid
      }
    };
    
    this.logger.log(`Instagram DM received: ${message.mid}, sender: ${sender.id}`);
    
    return instagramMessage;
  }
  
  private async processComment(change: any): Promise<InstagramMessage> {
    const value = change.value;
    
    let content = value.text || '[Comment]';
    let messageType = 'text';
    
    // Handle media comments
    if (value.media) {
      content = `[Comment on ${value.media.media_type}]: ${content}`;
      messageType = 'comment';
    }
    
    const instagramMessage: InstagramMessage = {
      id: this.generateId(),
      conversationId: '', // Will be set by orchestrator
      senderId: value.from.id,
      senderType: 'customer',
      content,
      messageType: messageType as any,
      channel: 'instagram',
      timestamp: new Date(value.time * 1000),
      instagramData: {
        messageId: value.comment_id || value.id,
        igId: value.from.id,
        username: value.from.username,
        isStoryReply: value.item === 'story',
        storyId: value.item === 'story' ? value.entry_id : undefined,
        mediaType: value.media?.media_type as any,
        mediaUrl: value.media?.media_url
      },
      metadata: {
        parentCommentId: value.parent_id,
        mediaId: value.media?.id,
        commentType: value.item,
        isComment: true,
        // Aid reply UIs with defaults
        replyContext: {
          commentId: value.comment_id || value.id,
          mediaId: value.media?.id,
          username: value.from.username
        }
      }
    };
    
    this.logger.log(`Instagram comment received: ${value.comment_id || value.id}, sender: ${value.from.id}, type: ${value.item}`);
    
    return instagramMessage;
  }
  
  async sendMessage(_conversationId: string, message: OutgoingMessage): Promise<MessageDeliveryResult> {
    try {
      // Determine if this is a DM or comment reply
      const isComment = (message.metadata as any)?.['isComment'] || message.replyToMessageId?.includes('comment');
      
      if (isComment) {
        return this.sendCommentReply(message);
      } else {
        return this.sendDirectMessage(message);
      }
      
    } catch (error) {
      this.logger.error('Failed to send Instagram message:', error);
      
      return {
        messageId: this.generateId(),
        status: 'failed',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private async sendDirectMessage(message: OutgoingMessage): Promise<MessageDeliveryResult> {
    const url = `${this.baseUrl}/me/messages`;
    const payload: Record<string, unknown> = {
      recipient: { id: message.recipientId },
      message: {}
    };

    if (message.messageType === 'text') {
      (payload as any)['message']['text'] = message.content;
    } else if (message.attachments?.[0]) {
      const attachment = message.attachments[0];
      (payload as any)['message']['attachment'] = {
        type: attachment.type,
        payload: { url: attachment.url, is_reusable: true }
      };
    }

    const doRequest = async (): Promise<any> => firstValueFrom(
      this.httpService.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
    );

    try {
      const start = Date.now();
      const response = await doRequest();
      try {
        this.metricSentTotal?.inc({ status: 'success' });
        this.metricSendLatencyMs?.observe(Date.now() - start);
      } catch (metricErr) {
        this.logger.debug('Metrics observe error', (metricErr as any)?.message);
      }
      return {
        messageId: this.generateId(),
        status: 'sent',
        timestamp: new Date(),
        channelMessageId: response.data.message_id
      };
    } catch (err: any) {
      if (err?.response?.status === 429) {
        try { this.metricApi429Total?.inc(); } catch (metricErr) { this.logger.debug('Metrics 429 inc error', (metricErr as any)?.message); }
        const retryAfter = parseInt(err.response.headers?.['retry-after'] || '2', 10) * 1000;
        await new Promise((r) => setTimeout(r, isNaN(retryAfter) ? 2000 : retryAfter));
        try {
          const start2 = Date.now();
          const response = await doRequest();
          try {
            this.metricSentTotal?.inc({ status: 'success' });
            this.metricSendLatencyMs?.observe(Date.now() - start2);
          } catch (metricErr) { this.logger.debug('Metrics retry observe error', (metricErr as any)?.message); }
          return {
            messageId: this.generateId(),
            status: 'sent',
            timestamp: new Date(),
            channelMessageId: response.data.message_id
          };
        } catch (e2: any) {
          this.logger.warn(`Instagram DM retry failed: ${e2?.message}`);
        }
      }
      this.logger.error('Failed to send Instagram DM:', err);
      try { this.metricSentTotal?.inc({ status: 'failed' }); } catch (metricErr) { this.logger.debug('Metrics failed inc error', (metricErr as any)?.message); }
      return { messageId: this.generateId(), status: 'failed', timestamp: new Date(), error: err?.message || 'Unknown error' };
    }
  }
  
  private async sendCommentReply(message: OutgoingMessage): Promise<MessageDeliveryResult> {
    const commentId = message.replyToMessageId || (message.metadata as any)?.['commentId'];
    
    if (!commentId) {
      throw new Error('Comment ID is required for comment replies');
    }
    
    const url = `${this.baseUrl}/${commentId}/replies`;
    
    const payload = {
      message: message.content
    };
    const doRequest = async (): Promise<any> => firstValueFrom(
      this.httpService.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })
    );

    try {
      const start = Date.now();
      const response = await doRequest();
      try {
        this.metricSentTotal?.inc({ status: 'success' });
        this.metricSendLatencyMs?.observe(Date.now() - start);
      } catch (metricErr) { this.logger.debug('Metrics observe error', (metricErr as any)?.message); }
      return { messageId: this.generateId(), status: 'sent', timestamp: new Date(), channelMessageId: response.data.id };
    } catch (err: any) {
      if (err?.response?.status === 429) {
        try { this.metricApi429Total?.inc(); } catch (metricErr) { this.logger.debug('Metrics 429 inc error', (metricErr as any)?.message); }
        const retryAfter = parseInt(err.response.headers?.['retry-after'] || '2', 10) * 1000;
        await new Promise((r) => setTimeout(r, isNaN(retryAfter) ? 2000 : retryAfter));
        try {
          const start2 = Date.now();
          const response = await doRequest();
          try {
            this.metricSentTotal?.inc({ status: 'success' });
            this.metricSendLatencyMs?.observe(Date.now() - start2);
          } catch (metricErr) { this.logger.debug('Metrics retry observe error', (metricErr as any)?.message); }
          return { messageId: this.generateId(), status: 'sent', timestamp: new Date(), channelMessageId: response.data.id };
        } catch (e2: any) {
          this.logger.warn(`Instagram comment reply retry failed: ${e2?.message}`);
        }
      }
      this.logger.error('Failed to send Instagram comment reply:', err);
      try { this.metricSentTotal?.inc({ status: 'failed' }); } catch (metricErr) { this.logger.debug('Metrics failed inc error', (metricErr as any)?.message); }
      return { messageId: this.generateId(), status: 'failed', timestamp: new Date(), error: err?.message || 'Unknown error' };
    }
  }
  
  async downloadMedia(mediaId: string): Promise<MediaFile> {
    try {
      const url = `${this.baseUrl}/${mediaId}?fields=media_url,media_type,thumbnail_url`;
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      );
      
      const mediaUrl = response.data.media_url;
      const mediaType = response.data.media_type;
      
      // Download the actual media
      const mediaResponse = await firstValueFrom(
        this.httpService.get(mediaUrl, {
          responseType: 'arraybuffer'
        })
      );
      
      const mediaFile: MediaFile = {
        id: mediaId,
        filename: `instagram_media_${mediaId}`,
        mimeType: this.getMimeTypeFromMediaType(mediaType),
        size: mediaResponse.data.byteLength,
        data: Buffer.from(mediaResponse.data),
        url: mediaUrl
      };
      
      this.logger.log(`Instagram media downloaded: ${mediaId}, type: ${mediaType}`);
      return mediaFile;
      
    } catch (error) {
      this.logger.error('Failed to download Instagram media:', error);
      throw error;
    }
  }
  
  async uploadMedia(file: MediaFile): Promise<string> {
    try {
      const url = `${this.baseUrl}/${this.pageId}/media`;
      
      const formData = new (globalThis as any).FormData();
      formData.append('source', new Blob([file.data], { type: file.mimeType }), file.filename);
      
      const response = await firstValueFrom(
        this.httpService.post(url, formData, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      );
      
      const mediaId = response.data.id;
      this.logger.log(`Instagram media uploaded: ${mediaId}, filename: ${file.filename}`);
      
      return mediaId;
      
    } catch (error) {
      this.logger.error('Failed to upload Instagram media:', error);
      throw error;
    }
  }
  
  getSupportedFeatures(): ChannelCapabilities {
    return {
      supportsAttachments: true,
      supportedAttachmentTypes: ['image', 'video', 'audio'],
      supportsLocation: false,
      supportsContacts: false,
      supportsTemplates: false,
      supportsRichMedia: true,
      supportsVoice: false,
      supportsVideo: false,
      maxMessageLength: 1000,
      maxAttachmentSize: 8 * 1024 * 1024, // 8MB
      rateLimits: {
        messagesPerMinute: 20,
        messagesPerHour: 200,
        messagesPerDay: 1000
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
    
    // Validate Instagram user ID format
    if (!/^\d+$/.test(message.recipientId)) {
      results.push({
        isValid: false,
        errors: ['Invalid Instagram user ID format'],
        warnings: []
      });
    }
    
    return results;
  }
  
  // Instagram-specific helper methods
  private async getUsernameCached(userId: string): Promise<string | undefined> {
    const now = Date.now()
    const cached = this.usernameCache.get(userId)
    if (cached && now - cached.fetchedAt < 5 * 60 * 1000) {
      return cached.username
    }
    const username = await this.getUsernameFromId(userId)
    this.usernameCache.set(userId, { username, fetchedAt: now })
    return username
  }
  private async getUsernameFromId(userId: string): Promise<string | undefined> {
    try {
      const url = `${this.baseUrl}/${userId}?fields=username`;
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      );
      
      return response.data.username;
      
    } catch (error) {
      this.logger.warn(`Failed to get username for user ${userId}:`, (error as any).message);
      return undefined;
    }
  }
  
  private getMimeTypeFromMediaType(mediaType: string): string {
    switch (mediaType.toLowerCase()) {
      case 'image':
        return 'image/jpeg';
      case 'video':
        return 'video/mp4';
      case 'audio':
        return 'audio/mpeg';
      default:
        return 'application/octet-stream';
    }
  }
  
  // Get story mentions
  async getStoryMentions(): Promise<unknown[]> {
    try {
      const url = `${this.baseUrl}/${this.pageId}/stories?fields=id,media_type,media_url,timestamp`;
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
      );
      
      return response.data.data || [];
      
    } catch (error) {
      this.logger.error('Failed to get story mentions:', error);
      return [];
    }
  }
  
  // Reply to story
  async replyToStory(storyId: string, reply: string): Promise<MessageDeliveryResult> {
    try {
      const url = `${this.baseUrl}/me/messages`;
      
      const payload = {
        recipient: {
          story_id: storyId
        },
        message: {
          text: reply
        }
      };
      
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        })
      );
      
      const result: MessageDeliveryResult = {
        messageId: this.generateId(),
        status: 'sent',
        timestamp: new Date(),
        channelMessageId: response.data.message_id
      };
      
      this.logger.log(`Instagram story reply sent: story ${storyId}, message ${result.messageId}`);
      
      return result;
      
    } catch (error) {
      this.logger.error('Failed to reply to story:', error);
      
      return {
        messageId: this.generateId(),
        status: 'failed',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Webhook verification for Instagram
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Instagram webhook verified successfully');
      return challenge;
    }
    
    this.logger.warn('Instagram webhook verification failed');
    return null;
  }

  private generateId(): string {
    return `ig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}