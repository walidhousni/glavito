import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ChannelType, ChannelAdapter, OutgoingMessage, MessageDeliveryResult, ValidationResult, ChannelCapabilities, ChannelMessage, WebhookPayload, MediaFile } from '@glavito/shared-types';

@Injectable()
export class SMSAdapter implements ChannelAdapter {
  readonly channelType = ChannelType.PHONE;
  private readonly logger = new Logger(SMSAdapter.name);

  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromPhone: string;
  private readonly baseUrl = 'https://api.twilio.com/2010-04-01/Accounts';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService
  ) {
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') || '';
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || '';
    this.fromPhone = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';
  }

  async receiveMessage(webhook: WebhookPayload): Promise<ChannelMessage> {
    this.logger.debug(`Received SMS webhook: ${JSON.stringify(webhook)}`);
    const data = (webhook?.data ?? {}) as Record<string, unknown>;
    const body = String(data['Body'] ?? data['body'] ?? '');
    const from = String(data['From'] ?? data['from'] ?? '');
    const messageSid = String(data['MessageSid'] ?? data['messageSid'] ?? this.generateId());

    const webMessage: ChannelMessage = {
      id: messageSid,
      conversationId: String(data['conversationId'] ?? 'sms'),
      senderId: from,
      senderType: 'customer',
      content: body,
      messageType: 'text',
      timestamp: new Date(),
      channel: 'web',
      webData: { sessionId: 'sms', userAgent: 'twilio-sms' },
      metadata: { provider: 'twilio', raw: data },
    } as any;
    return webMessage;
  }

  async sendMessage(conversationId: string, message: OutgoingMessage): Promise<MessageDeliveryResult> {
    const to = message.recipientId || message.metadata?.['to'];
    if (!to) throw new Error('Phone number required for SMS');

    const body = typeof message.content === 'string' ? message.content : '';
    const mediaUrl = message.attachments && message.attachments[0]?.url;

    const formData = new URLSearchParams({
      To: String(to),
      From: this.fromPhone,
      Body: body,
      ...(mediaUrl ? { MediaUrl: mediaUrl } : {}),
    } as any);

    const url = `${this.baseUrl}/${this.accountSid}/Messages.json`;
    const auth = { username: this.accountSid, password: this.authToken };

    try {
      const httpResp = await firstValueFrom(
        this.httpService.post(url, formData, { auth, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
      );
      const sid = String((httpResp?.data || {})['sid'] || '');
      return { messageId: sid, status: 'sent', timestamp: new Date(), channelMessageId: sid };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`SMS send failed: ${errMsg}`);
      throw new Error(errMsg);
    }
  }

  /**
   * Get Twilio account balance
   */
  async getBalance(): Promise<{ balance: number; currency: string; metadata?: Record<string, unknown> }> {
    try {
      if (!this.accountSid || !this.authToken) {
        throw new Error('SMS configuration incomplete');
      }

      const url = `${this.baseUrl}/${this.accountSid}/Balance.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        })
      );

      const balance = parseFloat((response.data as any)?.balance || '0');
      const currency = (response.data as any)?.currency || 'USD';

      return {
        balance,
        currency,
        metadata: {
          accountSid: this.accountSid,
          fromPhone: this.fromPhone,
        },
      };
    } catch (err: any) {
      this.logger.error('Failed to get SMS balance', err?.message || String(err));
      throw err;
    }
  }

  async downloadMedia(mediaId: string): Promise<MediaFile> {
    throw new Error('Media download stub: implement full download');
  }

  async uploadMedia(_file: MediaFile): Promise<string> {
    throw new Error('Media upload not implemented for SMS');
  }

  getSupportedFeatures(): ChannelCapabilities {
    return {
      supportsAttachments: true,
      supportedAttachmentTypes: ['image','video','audio','document'],
      supportsLocation: false,
      supportsContacts: false,
      supportsTemplates: false,
      supportsRichMedia: true,
      supportsVoice: false,
      supportsVideo: false,
      maxMessageLength: 1600,
    };
  }

  validateMessage(message: OutgoingMessage): ValidationResult[] {
    const errors: string[] = [];
    const warnings: string[] = [];
    const contentText = typeof message.content === 'string' ? message.content.trim() : '';
    if (!contentText) errors.push('SMS body is required');
    if (contentText.length > 1600) warnings.push('SMS body exceeds 1600 chars; may split');
    if (!message.recipientId && !message.metadata?.['to']) errors.push('Recipient phone number required');
    const attachLen = message.attachments?.length ?? 0;
    if (attachLen > 10) errors.push('Max 10 media attachments for MMS');
    return [{ isValid: errors.length === 0, errors, warnings }];
  }

  private generateId(): string {
    return `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
