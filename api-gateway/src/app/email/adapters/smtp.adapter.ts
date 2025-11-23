import type {
  BulkSendResult,
  EmailSendRequest,
  EmailSendResult,
  NormalizedEmailEvent,
  TenantEmailProviderResolvedConfig,
} from '../types';
import type { EmailAdapter } from './email-adapter';
import { NOT_IMPLEMENTED } from './email-adapter';
import * as nodemailer from 'nodemailer';

export class SmtpEmailAdapter implements EmailAdapter {
  private transporter?: nodemailer.Transporter;
  private config?: TenantEmailProviderResolvedConfig;

  configure(config: TenantEmailProviderResolvedConfig): void {
    this.config = config;
    const creds = (config.credentials || {}) as Record<string, any>;
    this.transporter = nodemailer.createTransport({
      host: creds.host || 'localhost',
      port: Number(creds.port || 587),
      secure: Boolean(creds.secure || false),
      auth:
        creds.user && creds.pass
          ? {
              user: String(creds.user),
              pass: String(creds.pass),
            }
          : undefined,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  async send(request: EmailSendRequest): Promise<EmailSendResult> {
    if (!this.transporter || !this.config) throw new Error('SMTP adapter not configured');
    const from = this.config.fromName ? `"${this.config.fromName}" <${this.config.fromEmail}>` : this.config.fromEmail;
    const to = request.personalizations.map((p) => p.toEmail).join(',');
    const info = await this.transporter.sendMail({
      from,
      to,
      subject: request.subject,
      html: request.html,
      text: request.text,
      replyTo: request.replyToEmail || this.config.replyToEmail || this.config.fromEmail,
      headers: request.headers,
    });
    return { providerMessageId: info.messageId, messageIds: [] };
  }

  async sendBulk(requests: EmailSendRequest[]): Promise<BulkSendResult> {
    const results = await Promise.all(requests.map((r) => this.send(r)));
    const first = results[0];
    return {
      providerBatchId: first?.providerMessageId,
      messageIds: results.flatMap((r) => r.messageIds || []),
    };
  }

  // SMTP generally lacks provider webhooks; return empty
  parseWebhook(_payload: unknown, _headers: Record<string, string>): NormalizedEmailEvent[] {
    return [];
  }
}


