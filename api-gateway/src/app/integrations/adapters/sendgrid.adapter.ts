import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

export interface SendGridConfig {
  apiKey: string;
  defaultFrom?: { email: string; name?: string };
}

@Injectable()
export class SendGridAdapter {
  private readonly logger = new Logger(SendGridAdapter.name);

  constructor(config: SendGridConfig) {
    sgMail.setApiKey(config.apiKey);
  }

  async testConnection(): Promise<boolean> {
    try {
      await sgMail.send({
        to: 'test@test.com',
        from: 'test@test.com',
        subject: 'Test',
        text: 'Test',
        mailSettings: { sandboxMode: { enable: true } },
      });
      return true;
    } catch (error) {
      this.logger.error('SendGrid connection test failed', error);
      return false;
    }
  }

  async sendEmail(params: {
    to: string | string[];
    from: { email: string; name?: string };
    subject: string;
    text?: string;
    html?: string;
    templateId?: string;
    dynamicTemplateData?: any;
    attachments?: Array<{
      content: string;
      filename: string;
      type?: string;
      disposition?: string;
    }>;
  }) {
    return sgMail.send(params as any);
  }

  async sendMultiple(messages: any[]) {
    return sgMail.send(messages);
  }

  async sendTemplate(params: {
    to: string | string[];
    from: { email: string; name?: string };
    templateId: string;
    dynamicTemplateData: any;
  }) {
    return sgMail.send(params as any);
  }

  async getEmailStats(params?: { start_date?: string; end_date?: string }) {
    // Note: Requires SendGrid Stats API access
    return { message: 'Stats API requires separate implementation' };
  }
}

