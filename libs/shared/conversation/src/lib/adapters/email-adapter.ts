/* eslint-disable @typescript-eslint/no-empty-function */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
// import { simpleParser } from 'mailparser'; // Module not available
// ParsedMail type may not be available, using any instead
type ParsedMail = any;

// Mock simpleParser function since mailparser is not available
// @ts-expect-error - Intentionally unused mock function
const simpleParser = async (source: any): Promise<ParsedMail> => {
  // This is a mock implementation - replace with actual mailparser when available
  return {
    subject: 'Mock Subject',
    from: { value: [{ address: 'mock@example.com', name: 'Mock Sender' }] },
    to: { value: [{ address: 'recipient@example.com', name: 'Mock Recipient' }] },
    text: 'Mock email content',
    html: '<p>Mock email content</p>',
    attachments: [],
    inReplyTo: null,
    references: [],
    headers: new Map()
  };
};
import {
  EmailMessage,
  OutgoingMessage,
  MessageDeliveryResult,
  WebhookPayload,
  MediaFile,
  ChannelCapabilities,
  ValidationResult,
  EmailAttachment,
  ChannelAdapter
} from '@glavito/shared-types';

interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  imap: {
    host: string;
    port: number;
    tls: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: string;
}

@Injectable()
export class EmailAdapter implements ChannelAdapter {
  readonly channelType = 'email' as any;
  private readonly logger = new Logger(EmailAdapter.name);
  
  private readonly emailConfig: EmailConfig;
  private smtpTransporter!: nodemailer.Transporter;
  
  constructor(private readonly configService: ConfigService) {
    
    this.emailConfig = {
      smtp: {
        host: this.configService.get<string>('SMTP_HOST', 'localhost'),
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: this.configService.get<string>('SMTP_USER', ''),
          pass: this.configService.get<string>('SMTP_PASS', '')
        }
      },
      imap: {
        host: this.configService.get<string>('IMAP_HOST', 'localhost'),
        port: this.configService.get<number>('IMAP_PORT', 993),
        tls: this.configService.get<boolean>('IMAP_TLS', true),
        auth: {
          user: this.configService.get<string>('IMAP_USER', ''),
          pass: this.configService.get<string>('IMAP_PASS', '')
        }
      },
      from: this.configService.get<string>('EMAIL_FROM', 'support@example.com')
    };
    
    this.initializeSmtp();
    this.initMetrics().catch(() => {});
  }

  private metricSentTotal?: any;
  private metricSendLatencyMs?: any;

  private async initMetrics() {
    try {
      const prom = await import('prom-client');
      this.metricSentTotal = new prom.Counter({
        name: 'channel_email_messages_total',
        help: 'Total Email messages attempts',
        labelNames: ['status'] as const,
      });
      this.metricSendLatencyMs = new prom.Histogram({
        name: 'channel_email_send_latency_ms',
        help: 'Email send latency in ms',
        buckets: [50,100,200,500,1000,2000,5000,10000],
      });
    } catch (err) {
      this.logger.debug('email metrics init disabled', (err as any)?.message || String(err))
    }
  }
  
  private initializeSmtp(): void {
    this.smtpTransporter = nodemailer.createTransport({
      host: this.emailConfig.smtp.host,
      port: this.emailConfig.smtp.port,
      secure: this.emailConfig.smtp.secure,
      auth: this.emailConfig.smtp.auth,
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    });
    
    // Verify SMTP connection
    this.smtpTransporter.verify((error) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error);
      } else {
        this.logger.log('SMTP connection established successfully');
      }
    });
  }
  
  async receiveMessage(webhook: WebhookPayload): Promise<EmailMessage> {
    try {
      // For email, webhook.data should contain the parsed email
      const parsedEmail = webhook.data as any;
      
      if (!parsedEmail) {
        throw new Error('Invalid email webhook payload');
      }
      
      // Extract email content
      const content = parsedEmail.text || parsedEmail.html || '';
      const subject = parsedEmail.subject || '(No Subject)';
      
      // Process attachments
      const attachments: EmailAttachment[] = [];
      if (parsedEmail.attachments) {
        for (const attachment of parsedEmail.attachments) {
          attachments.push({
            id: this.generateId(),
            type: this.getAttachmentType(attachment.contentType),
            url: '', // Will be populated after saving
            filename: attachment.filename,
            size: attachment.size,
            mimeType: attachment.contentType,
            contentId: attachment.cid,
            isInline: attachment.contentDisposition === 'inline',
            contentDisposition: attachment.contentDisposition
          });
        }
      }
      
      // Extract email addresses
      const fromAddress = this.extractEmailAddress(parsedEmail.from);
      const toAddresses = this.extractEmailAddresses(parsedEmail.to);
      const ccAddresses = this.extractEmailAddresses(parsedEmail.cc);
      const bccAddresses = this.extractEmailAddresses(parsedEmail.bcc);
      
      const isBounce = this.isBounce(parsedEmail)
      const emailMessage: EmailMessage = {
        id: this.generateId(),
        conversationId: '', // Will be set by orchestrator
        senderId: fromAddress,
        senderType: 'customer',
        content,
        messageType: 'text',
        channel: 'email',
        timestamp: parsedEmail.date || new Date(),
        emailData: {
          messageId: parsedEmail.messageId || this.generateId(),
          from: fromAddress,
          to: toAddresses,
          cc: ccAddresses,
          bcc: bccAddresses,
          subject,
          inReplyTo: parsedEmail.inReplyTo,
          references: (parsedEmail as any)['references'],
          threadId: this.extractThreadId(parsedEmail),
          headers: this.extractHeaders(parsedEmail as any)
        },
        attachments: attachments.length > 0 ? attachments : undefined,
        metadata: {
          priority: parsedEmail.priority,
          importance: parsedEmail.headers.get('importance'),
          autoReply: this.isAutoReply(parsedEmail),
          isBounce,
          bounceReason: isBounce ? this.extractBounceReason(parsedEmail) : undefined
        }
      };
      
      this.logger.log(`Email received: ${emailMessage.emailData.messageId}, subject: ${subject}, from: ${fromAddress}`);
      
      return emailMessage;
      
    } catch (error) {
      this.logger.error('Failed to receive email:', error);
      throw error;
    }
  }
  
  async sendMessage(_conversationId: string, message: OutgoingMessage): Promise<MessageDeliveryResult> {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: this.emailConfig.from,
        to: message.recipientId,
        subject: this.extractSubjectFromMetadata(message) || 'Support Response',
        text: (message.metadata as any)?.['text'] || message.content,
        html: (message.metadata as any)?.['html'] || this.convertToHtml(message.content),
        replyTo: this.emailConfig.from
      };
      
      // Add reply headers if this is a reply
      if (message.replyToMessageId) {
        mailOptions.inReplyTo = message.replyToMessageId;
        mailOptions.references = (message.metadata as any)?.['references'] || message.replyToMessageId;
      }
      
      // Add attachments
      if (message.attachments && message.attachments.length > 0) {
        mailOptions.attachments = message.attachments.map((attachment: any) => ({
          filename: attachment.filename,
          content: attachment.url, // Assuming URL points to file content
          contentType: attachment.mimeType
        }));
      }
      
      // Add custom headers
      if ((message.metadata as any)?.['headers']) {
        mailOptions.headers = (message.metadata as any)['headers'];
      }
      
      const start = Date.now();
      const info = await this.smtpTransporter.sendMail(mailOptions);
      
      const result: MessageDeliveryResult = {
        messageId: this.generateId(),
        status: 'sent',
        timestamp: new Date(),
        channelMessageId: info.messageId
      };
      
      this.logger.log(`Email sent: ${result.messageId}, email ID: ${info.messageId}, to: ${message.recipientId}`);
      try {
        this.metricSentTotal?.inc({ status: 'success' });
        this.metricSendLatencyMs?.observe(Date.now() - start);
      } catch { /* empty */ }
      
      return result;
      
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      try { this.metricSentTotal?.inc({ status: 'failed' }); } catch (err2) {
        this.logger.debug('email metrics failed inc', (err2 as any)?.message || String(err2))
      }
      
      return {
        messageId: this.generateId(),
        status: 'failed',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async downloadMedia(_mediaId: string): Promise<MediaFile> {
    // For email, media is typically attachments that are already downloaded
    // This method would be used to retrieve stored attachments
    throw new Error('Email media download should be handled during email parsing');
  }
  
  async uploadMedia(file: MediaFile): Promise<string> {
    // For email, media upload is handled as part of sending the email
    // Return a reference that can be used in attachments
    return `email_attachment_${file.id}`;
  }
  
  getSupportedFeatures(): ChannelCapabilities {
    return {
      supportsAttachments: true,
      supportedAttachmentTypes: ['image', 'video', 'audio', 'document', 'pdf', 'text'],
      supportsLocation: false,
      supportsContacts: false,
      supportsTemplates: true,
      supportsRichMedia: true,
      supportsVoice: false,
      supportsVideo: false,
      maxMessageLength: 1000000, // 1MB for email content
      maxAttachmentSize: 25 * 1024 * 1024, // 25MB typical email limit
      rateLimits: {
        messagesPerMinute: 10,
        messagesPerHour: 100,
        messagesPerDay: 1000
      }
    };
  }
  
  validateMessage(message: OutgoingMessage): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Validate email address format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(message.recipientId)) {
      results.push({
          // field: 'recipientId', // Removed as it doesn't exist in ValidationResult
          isValid: false,
          message: 'Invalid email address format'
        } as any);
    }
    
    // Check for subject in metadata
    if (!this.extractSubjectFromMetadata(message)) {
      results.push({
          // field: 'metadata.subject', // Removed as it doesn't exist in ValidationResult
          isValid: false,
          message: 'Email subject not provided, using default'
        } as any);
    }
    
    return results;
  }
  
  // Email-specific helper methods
  private extractEmailAddress(addressObj: any): string {
    if (!addressObj) return '';
    
    if (typeof addressObj === 'string') {
      return addressObj;
    }
    
    if (Array.isArray(addressObj)) {
      return addressObj[0]?.address || addressObj[0] || '';
    }
    
    return (addressObj as any).address || (addressObj as any).text || '';
  }
  
  private extractEmailAddresses(addressObj: unknown): string[] {
    if (!addressObj) return [];
    
    if (typeof addressObj === 'string') {
      return [addressObj];
    }
    
    if (Array.isArray(addressObj)) {
      return addressObj.map(addr => addr.address || addr);
    }
    
    return [(addressObj as any).address || (addressObj as any).text || ''];
  }
  
  private extractThreadId(parsedEmail: ParsedMail): string | undefined {
    // Try to extract thread ID from various headers
    const threadId = parsedEmail.headers.get('thread-id') ||
                    parsedEmail.headers.get('x-thread-id') ||
                    parsedEmail.inReplyTo ||
                    parsedEmail.messageId;
    
    return threadId as string;
  }
  
  private extractHeaders(parsedEmail: ParsedMail): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (parsedEmail.headers) {
      for (const [key, value] of parsedEmail.headers) {
        headers[key] = Array.isArray(value) ? value.join(', ') : String(value);
      }
    }
    
    return headers;
  }
  
  private isAutoReply(parsedEmail: ParsedMail): boolean {
    const autoReplyHeaders = [
      'auto-submitted',
      'x-auto-response-suppress',
      'x-autorespond',
      'x-autoreply'
    ];
    
    for (const header of autoReplyHeaders) {
      if (parsedEmail.headers.has(header)) {
        return true;
      }
    }
    
    // Check subject for auto-reply indicators
    const subject = (parsedEmail.subject || '').toLowerCase();
    const autoReplyKeywords = ['auto-reply', 'automatic reply', 'out of office', 'vacation'];
    
    return autoReplyKeywords.some(keyword => subject.includes(keyword));
  }

  private isBounce(parsedEmail: ParsedMail): boolean {
    try {
      const headers = parsedEmail.headers || new Map()
      const subject = (parsedEmail.subject || '').toLowerCase()
      if (subject.includes('undelivered mail returned to sender') || subject.includes('delivery status notification') || subject.includes('mail delivery failed')) return true
      const from = (parsedEmail.from?.value?.[0]?.address || parsedEmail.from?.text || '').toLowerCase()
      if (from.includes('mailer-daemon') || from.includes('postmaster')) return true
      const autoSubmitted = headers.get('auto-submitted') as string | undefined
      if (autoSubmitted && autoSubmitted.toLowerCase().includes('auto-replied')) return true
      const xFailed = headers.get('x-failed-recipients') as string | undefined
      if (xFailed) return true
      return false
    } catch {
      return false
    }
  }

  private extractBounceReason(parsedEmail: ParsedMail): string | undefined {
    try {
      const headers = parsedEmail.headers || new Map()
      const diag = headers.get('diagnostic-code') as string | undefined
      if (diag) return String(diag)
      const status = headers.get('status') as string | undefined
      if (status) return `Status ${status}`
      const subject = parsedEmail.subject as string | undefined
      return subject
    } catch {
      return undefined
    }
  }
  
  private getAttachmentType(contentType: string): string {
    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('video/')) return 'video';
    if (contentType.startsWith('audio/')) return 'audio';
    if (contentType.includes('pdf')) return 'pdf';
    if (contentType.startsWith('text/')) return 'text';
    return 'document';
  }
  
  private extractSubjectFromMetadata(message: OutgoingMessage): string | undefined {
    return (message.metadata as any)?.['subject'] as string;
  }
  
  private convertToHtml(text: string): string {
    // Simple text to HTML conversion
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }
  
  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}