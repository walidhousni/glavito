import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  OutgoingMessage,
  MessageDeliveryResult,
  WebhookPayload,
  MediaFile,
  ChannelCapabilities,
  ValidationResult,
  ChannelAdapter,
  ChannelType,
  ChannelMessage,
} from '@glavito/shared-types';

// Removed - using ChannelMessage directly

@Injectable()
export class MessengerAdapter implements ChannelAdapter {
  readonly channelType = ChannelType.MESSENGER;
  private readonly logger = new Logger(MessengerAdapter.name);

  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly pageId: string;
  // private readonly appSecret: string;
  private readonly verifyToken: string;
  private idempotencyCache: Map<string, { result: MessageDeliveryResult; expiresAt: number }> =
    new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.baseUrl = this.configService.get<string>(
      'MESSENGER_API_BASE_URL',
      'https://graph.facebook.com/v18.0'
    );
    this.accessToken = this.configService.get<string>('MESSENGER_ACCESS_TOKEN', '');
    this.pageId = this.configService.get<string>('MESSENGER_PAGE_ID', '');
    // this.appSecret = this.configService.get<string>('MESSENGER_APP_SECRET', '');
    this.verifyToken = this.configService.get<string>('MESSENGER_VERIFY_TOKEN', '');

    if (!this.accessToken || !this.pageId) {
      this.logger.warn('Messenger configuration incomplete. Some features may not work.');
    }

    this.initMetrics().catch((err) => {
      this.logger.debug('initMetrics failed (messenger)', (err as any)?.message || String(err));
    });
  }

  private metricSentTotal?: any;
  private metricApi429Total?: any;
  private metricSendLatencyMs?: any;

  private async initMetrics() {
    try {
      const prom = await import('prom-client');
      this.metricSentTotal = new prom.Counter({
        name: 'channel_messenger_messages_total',
        help: 'Total Messenger messages attempts',
        labelNames: ['status'] as const,
      });
      this.metricApi429Total = new prom.Counter({
        name: 'channel_messenger_rate_limit_total',
        help: 'Messenger API 429 occurrences',
      });
      this.metricSendLatencyMs = new prom.Histogram({
        name: 'channel_messenger_send_latency_ms',
        help: 'Messenger send latency in ms',
        buckets: [50, 100, 200, 500, 1000, 2000, 5000],
      });
    } catch (err) {
      this.logger.debug('prom-client init failed (messenger)', (err as any)?.message || String(err));
    }
  }

  async receiveMessage(webhook: WebhookPayload): Promise<ChannelMessage> {
    try {
      const data = webhook as any;

      if (!data.entry?.[0]?.messaging?.[0]) {
        throw new Error('Invalid Messenger webhook payload');
      }

      const messaging = data.entry[0].messaging[0];
      const message = messaging.message;

      // Skip echo messages (messages sent by the page)
      if (message?.is_echo) {
        this.logger.debug('Skipping echo message');
        throw new Error('Echo message');
      }

      let content = '';
      const attachments: Array<{ type: string; url?: string; payload?: any }> = [];

      if (message?.text) {
        content = message.text;
      }

      if (message?.attachments) {
        for (const attachment of message.attachments) {
          attachments.push({
            type: attachment.type,
            url: attachment.payload?.url,
            payload: attachment.payload,
          });

          if (!content) {
            content = `[${attachment.type}]`;
          }
        }
      }

      const channelMessage: ChannelMessage = {
        id: this.generateId(),
        conversationId: '', // Will be set by orchestrator
        senderId: messaging.sender.id,
        senderType: 'customer',
        content,
        messageType: (message?.attachments?.[0]?.type || 'text') as 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact',
        channel: 'messenger',
        timestamp: new Date(messaging.timestamp),
        messengerData: {
          messageId: message?.mid || this.generateId(),
          senderId: messaging.sender.id,
          recipientId: messaging.recipient.id,
        },
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      this.logger.log(`Message received: ${message?.mid}, type: ${channelMessage.messageType}`);
      return channelMessage;
    } catch (error) {
      this.logger.error('Failed to receive Messenger message:', error);
      throw error;
    }
  }

  async sendMessage(_conversationId: string, message: OutgoingMessage): Promise<MessageDeliveryResult> {
    try {
      const url = `${this.baseUrl}/me/messages`;

      // Idempotency check
      const idempotencyKey = this.getIdempotencyKey(message);
      if (idempotencyKey) {
        const cached = this.idempotencyCache.get(idempotencyKey);
        if (cached && cached.expiresAt > Date.now()) {
          this.logger.debug(`Idempotent send suppressed (messenger): ${idempotencyKey}`);
          return cached.result;
        }
      }

      const payload: Record<string, unknown> = {
        recipient: { id: message.recipientId },
        messaging_type: 'RESPONSE',
      };

      // Build message based on type
      switch (message.messageType) {
        case 'text':
          payload['message'] = { text: message.content };
          break;

        case 'image':
        case 'video':
        case 'audio':
        case 'document':
          if (message.attachments?.[0]) {
            payload['message'] = {
              attachment: {
                type: message.messageType === 'document' ? 'file' : message.messageType,
                payload: {
                  url: message.attachments[0].url,
                  is_reusable: true,
                },
              },
            };
          }
          break;

        default:
          payload['message'] = { text: message.content };
      }

      const start = Date.now();
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          params: { access_token: this.accessToken },
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const result: MessageDeliveryResult = {
        messageId: this.generateId(),
        status: 'sent',
        timestamp: new Date(),
        channelMessageId: response.data.message_id,
      };

      this.logger.log(`Message sent: ${result.messageId}, Messenger ID: ${result.channelMessageId}`);

      try {
        this.metricSentTotal?.inc({ status: 'success' });
        this.metricSendLatencyMs?.observe(Date.now() - start);
      } catch (err) {
        this.logger.debug('metrics record failed (messenger success)', (err as any)?.message || String(err));
      }

      // Cache idempotent result
      if (idempotencyKey) {
        const ttlMs = 5 * 60 * 1000;
        this.idempotencyCache.set(idempotencyKey, { result, expiresAt: Date.now() + ttlMs });
      }

      return result;
    } catch (error) {
      const msg = this.normalizeApiError(error);
      this.logger.error(`Failed to send Messenger message: ${msg}`);

      try {
        if ((error as any)?.response?.status === 429) this.metricApi429Total?.inc();
        this.metricSentTotal?.inc({ status: 'failed' });
      } catch (err) {
        this.logger.debug('metrics record failed (messenger error)', (err as any)?.message || String(err));
      }

      return {
        messageId: this.generateId(),
        status: 'failed',
        timestamp: new Date(),
        error: msg,
      };
    }
  }

  async downloadMedia(_mediaId: string): Promise<MediaFile> {
    throw new Error('Method not implemented for Messenger');
  }

  async uploadMedia(_file: MediaFile): Promise<string> {
    throw new Error('Method not implemented for Messenger');
  }

  async markAsRead(_conversationId: string, _messageId: string): Promise<void> {
    // Messenger doesn't require explicit read receipts in the same way
    this.logger.debug('Mark as read not implemented for Messenger');
  }

  getSupportedFeatures(): ChannelCapabilities {
    return {
      supportsAttachments: true,
      supportedAttachmentTypes: ['image', 'video', 'audio', 'file'],
      supportsLocation: false,
      supportsContacts: false,
      supportsTemplates: false,
      supportsRichMedia: true,
      supportsVoice: false,
      supportsVideo: false,
      maxMessageLength: 2000,
      maxAttachmentSize: 25 * 1024 * 1024, // 25MB
      rateLimits: {
        messagesPerMinute: 100,
        messagesPerHour: 1000,
        messagesPerDay: 10000,
      },
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
        warnings: [],
      });
    }

    // Validate attachments
    if (message.attachments) {
      for (const attachment of message.attachments) {
        if (!capabilities.supportedAttachmentTypes.includes(attachment.type)) {
          results.push({
            isValid: false,
            errors: [`Attachment type '${attachment.type}' is not supported`],
            warnings: [],
          });
        }

        if (
          attachment.size &&
          capabilities.maxAttachmentSize &&
          attachment.size > capabilities.maxAttachmentSize
        ) {
          results.push({
            isValid: false,
            errors: [`Attachment size exceeds maximum of ${capabilities.maxAttachmentSize} bytes`],
            warnings: [],
          });
        }
      }
    }

    return results;
  }

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Messenger webhook verified successfully');
      return challenge;
    }

    this.logger.warn('Messenger webhook verification failed');
    return null;
  }

  private generateId(): string {
    return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getIdempotencyKey(message: OutgoingMessage): string | null {
    try {
      const explicit = (message.metadata as any)?.idempotencyKey as string | undefined;
      if (explicit && explicit.length > 0) return `messenger:${explicit}`;

      const base = [
        message.messageType,
        message.recipientId,
        message.content || '',
        message.replyToMessageId || '',
      ].join('|');

      const crypto = require('crypto') as typeof import('crypto');
      return `messenger:auto:${crypto.createHash('sha256').update(base).digest('hex')}`;
    } catch {
      return null;
    }
  }

  private normalizeApiError(err: any): string {
    try {
      const status = err?.response?.status;
      // const code = err?.response?.data?.error?.code;
      if (status === 429) return 'Rate limited by Messenger API (429)';
      return err?.response?.data?.error?.message || err?.message || 'Unknown error';
    } catch {
      return 'Unknown error';
    }
  }
}

