import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelAdapter,
  ChannelMessage,
  MediaFile,
  ChannelType,
  MessageDeliveryResult,
  OutgoingMessage,
  ValidationResult,
  ChannelCapabilities,
  WebhookPayload,
} from '@glavito/shared-types';

@Injectable()
export class WebAdapter implements ChannelAdapter {
  readonly channelType = ChannelType.CHAT;
  private readonly logger = new Logger(WebAdapter.name);

  async receiveMessage(webhook: WebhookPayload): Promise<ChannelMessage> {
    // Web channel typically doesn't rely on external webhooks; treat as local
    const data = (webhook?.data as any) || {};
    const content = String(data.content || '').trim() || '[message]';
    const senderId = String(data.senderId || 'unknown');
    const id = this.generateId();
    const msg: ChannelMessage = {
      id,
      conversationId: '',
      senderId,
      senderType: (data.senderType as any) || 'customer',
      content,
      messageType: (data.messageType as any) || 'text',
      channel: 'web',
      timestamp: new Date(),
      attachments: Array.isArray(data.attachments) && data.attachments.length ? data.attachments : undefined,
      metadata: data.metadata || {},
      webData: {
        sessionId: String((data.sessionId || data.channelMessageId || id)),
      } as any,
    };
    this.logger.debug(`Web message received (local): ${id}`);
    return msg;
  }

  async sendMessage(_conversationId: string, message: OutgoingMessage): Promise<MessageDeliveryResult> {
    // Web channel is local — no external API call. Consider this "sent".
    const id = this.generateId();
    this.logger.debug(`Web message sent (local): ${id}`);
    return {
      messageId: id,
      status: 'sent',
      timestamp: new Date(),
      channelMessageId: id,
    };
  }

  async downloadMedia(_mediaId: string): Promise<MediaFile> {
    throw new Error('Media download not supported for web channel');
  }

  async uploadMedia(_file: MediaFile): Promise<string> {
    throw new Error('Media upload not supported for web channel');
  }

  getSupportedFeatures(): ChannelCapabilities {
    return {
      supportsAttachments: true,
      supportedAttachmentTypes: ['image', 'video', 'audio', 'document', 'pdf', 'text'],
      supportsLocation: false,
      supportsContacts: false,
      supportsTemplates: false,
      supportsRichMedia: true,
      supportsVoice: false,
      supportsVideo: false,
      maxMessageLength: 5000,
      maxAttachmentSize: 10 * 1024 * 1024,
      rateLimits: {
        messagesPerMinute: 120,
        messagesPerHour: 3000,
        messagesPerDay: 50000,
      },
    };
  }

  validateMessage(message: OutgoingMessage): ValidationResult[] {
    const results: ValidationResult[] = [];
    if (!message.content && !message.attachments?.length) {
      results.push({
        isValid: false,
        errors: ['Message must have content or attachments'],
        warnings: [],
      });
    }
    return results;
  }

  private generateId(): string {
    return `web_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}


