import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { EmailProviderFactory } from './provider.factory';
import { EmailTemplatesService } from './templates.service';
import type { EmailSendRequest, EmailSendResult } from './types';
import { EmailRateLimitService } from './rate-limit.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface TenantSmtpConfig {
  host: string;
  port: number;
  user: string;
  pass?: string;
  from?: string;
  secure?: boolean;
}

interface BrevoEmailResponse {
  messageId: string;
}

@Injectable()
export class EmailService {
  constructor(
    private readonly database: DatabaseService,
    private readonly providerFactory: EmailProviderFactory,
    private readonly templates: EmailTemplatesService,
    private readonly rateLimiter: EmailRateLimitService,
    private readonly configService: ConfigService,
  ) {}

  private readonly logger = new Logger(EmailService.name);
  private transporter!: nodemailer.Transporter;
  private tenantTransporters = new Map<string, nodemailer.Transporter>();
  private readonly brevoApiUrl = 'https://api.brevo.com/v3';
  private brevoApiKey: string | null = null;

  // Initialize transports and provider keys lazily on first use
  private ensureTransportsInitialized(): void {
    if (this.transporter) return;
    this.transporter = nodemailer.createTransport({ jsonTransport: true });
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT' as never);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: Number(port) === 465,
        auth: { user, pass },
      });
    }
    this.brevoApiKey = this.configService.get<string>('BREVO_API_KEY') || null;
  }

  async send(request: EmailSendRequest): Promise<EmailSendResult> {
    const { tenantId, subject, html, personalizations, templateId, campaignId, journeyId, stepId } = request;
    const adapter = await this.providerFactory.getAdapterForTenant(tenantId);
    const resolved = await this.providerFactory.getResolvedConfig(tenantId);
    const compiled = this.templates.compile(html);

    // Create EmailDelivery records first (status: pending)
    const created = await Promise.all(
      personalizations.map(async (p) => {
        const delivery = await this.database.emailDelivery.create({
          data: {
            tenantId,
            to: p.toEmail,
            subject,
            templateId: templateId || undefined,
            variables: (p.variables || {}) as any,
            status: 'pending',
            campaignId: campaignId || undefined,
            journeyId: journeyId || undefined,
            stepId: stepId || undefined,
          } as any,
        });
        return delivery;
      }),
    );

    const result = await this.rateLimiter.schedule(`email:${tenantId}`, Number(resolved.ratePerSecond || 5), () =>
      adapter.send({
        ...request,
        html: compiled.html,
        text: compiled.text,
      }),
    );

    // Update deliveries with provider message id, status sent, and timestamps
    await Promise.all(
      created.map(async (delivery) => {
        await this.database.emailDelivery.update({
          where: { id: (delivery as any).id },
          data: {
            status: 'sent',
            sentAt: new Date(),
            providerMessageId: result.providerMessageId,
          } as any,
        });

        // Best-effort: attach to latest open ticket for this customer
        try {
          const toEmail = (delivery as any).to as string;
          const customer = await this.database.customer.findFirst({
            where: { tenantId, email: toEmail },
            select: { id: true },
          });
          if (customer) {
            const ticket = await this.database.ticket.findFirst({
              where: { tenantId, customerId: customer.id, status: { in: ['open', 'pending'] } },
              orderBy: { createdAt: 'desc' },
              select: { id: true },
            });
            if (ticket) {
              await this.database.ticketTimelineEvent.create({
                data: {
                  ticketId: ticket.id,
                  eventType: 'email_sent',
                  description: subject,
                  newValue: { emailDeliveryId: (delivery as any).id } as any,
                },
              });
            }
          }
        } catch {
          // non-fatal
        }
      }),
    );

    return {
      providerMessageId: result.providerMessageId,
      messageIds: created.map((d) => (d as any).id as string),
    };
  }

  // ---- Legacy/general-purpose methods retained for auth/invitations and tenant SMTP ----

  async sendEmail(options: EmailOptions): Promise<void> {
    this.ensureTransportsInitialized();
    const from = this.configService.get<string>('EMAIL_FROM');
    const mailOptions = {
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };
    try {
      if (this.brevoApiKey) {
        try {
          const result = await this.sendViaBrevo(options, mailOptions.from || 'noreply@glavito.com');
          this.logger.log(`Email via Brevo: ${result.messageId || '(no id)'} -> ${options.to}`);
          return;
        } catch (brevoError) {
          this.logger.warn(`Brevo failed, fallback SMTP: ${(brevoError as Error)?.message}`);
        }
      }
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email via SMTP: ${info?.messageId || '(mock)'} -> ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${(error as Error)?.message}`);
      throw error;
    }
  }

  private async getTenantSmtpConfig(tenantId: string): Promise<TenantSmtpConfig | null> {
    const tenant = await this.database.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return null;
    const settings = ((tenant as any).whiteLabelSettings || {}) as { smtp?: TenantSmtpConfig };
    const smtp = settings?.smtp;
    if (!smtp || !smtp.host || !smtp.port || !smtp.user || !smtp.pass) return null;
    return smtp;
  }

  private async getTransporterForTenant(tenantId: string): Promise<nodemailer.Transporter> {
    this.ensureTransportsInitialized();
    if (this.tenantTransporters.has(tenantId)) return this.tenantTransporters.get(tenantId) as nodemailer.Transporter;
    const smtp = await this.getTenantSmtpConfig(tenantId);
    if (!smtp) return this.transporter;
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port),
      secure: Boolean(smtp.secure ?? (Number(smtp.port) === 465)),
      auth: { user: smtp.user, pass: smtp.pass as string },
    });
    this.tenantTransporters.set(tenantId, transporter);
    return transporter;
  }

  async sendEmailForTenant(tenantId: string, options: EmailOptions): Promise<void> {
    this.ensureTransportsInitialized();
    const smtp = await this.getTenantSmtpConfig(tenantId);
    const fromEmail = smtp?.from || this.configService.get<string>('EMAIL_FROM') || 'noreply@glavito.com';
    if (this.brevoApiKey && !smtp) {
      try {
        await this.sendViaBrevo(options, fromEmail);
        this.logger.log(`Email via Brevo -> ${options.to} tenant=${tenantId}`);
        return;
      } catch (brevoError) {
        this.logger.warn(`Brevo failed, fallback SMTP: ${(brevoError as Error)?.message}`);
      }
    }
    const transporter = await this.getTransporterForTenant(tenantId);
    const mailOptions = {
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };
    try {
      const info = await transporter.sendMail(mailOptions);
      this.logger.log(`Email via SMTP: ${info?.messageId || '(mock)'} -> ${options.to} tenant=${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to send tenant email: ${(error as Error)?.message}`);
      throw error;
    }
  }

  private async sendViaBrevo(options: EmailOptions, from: string): Promise<{ messageId: string | null }> {
    if (!this.brevoApiKey) throw new Error('Brevo API key not configured');
    const senderEmail = from.includes('<') ? from.match(/<(.+)>/)?.[1] || from : from;
    const senderName = from.includes('<') ? from.match(/^(.+)\s*</)?.[1]?.trim() || 'Glavito' : 'Glavito';
    const response = await fetch(`${this.brevoApiUrl}/smtp/email`, {
      method: 'POST',
      headers: { 'api-key': this.brevoApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html || options.text,
        textContent: options.text,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Brevo API error: ${errorData.message || response.statusText}`);
    }
    const data = (await response.json()) as BrevoEmailResponse;
    return { messageId: data.messageId || null };
  }

  async dispatchEmailForTenant(tenantId: string, options: EmailOptions): Promise<{ messageId: string | null }> {
    this.ensureTransportsInitialized();
    const smtp = await this.getTenantSmtpConfig(tenantId);
    const fromEmail = smtp?.from || this.configService.get<string>('EMAIL_FROM') || 'noreply@glavito.com';
    if (this.brevoApiKey && !smtp) {
      try {
        return await this.sendViaBrevo(options, fromEmail);
      } catch (error) {
        this.logger.warn(`Brevo failed, fallback SMTP: ${(error as Error)?.message}`);
      }
    }
    const transporter = await this.getTransporterForTenant(tenantId);
    const mailOptions = {
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };
    const info = await transporter.sendMail(mailOptions);
    const messageId = (info as any)?.messageId ? String((info as any).messageId) : null;
    return { messageId };
  }

  async testSmtpConfig(config: TenantSmtpConfig): Promise<{ ok: boolean; error?: string }> {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: Number(config.port),
        secure: Boolean(config.secure ?? (Number(config.port) === 465)),
        auth: { user: config.user, pass: String(config.pass || '') },
      });
      await transporter.verify();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error)?.message || 'SMTP verify failed' };
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const webBase = this.configService.get('FRONTEND_URL') || this.configService.get('PUBLIC_API_BASE_URL');
    const scheme = this.configService.get('MOBILE_DEEP_LINK_SCHEME') || 'glavito';
    const universal = this.configService.get('MOBILE_UNIVERSAL_LINK_BASE') || '';
    const mobileDeep = `${scheme}://verify-email?token=${token}`;
    const mobileUniversal = universal ? `${String(universal).replace(/\/$/, '')}/verify-email?token=${token}` : '';
    const verificationUrl = `${webBase}/verify-email?token=${token}`;
    await this.sendEmail({
      to,
      subject: 'Verify your email address',
      html: `
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify in browser</a>
        <p>On mobile, this link may open the app directly:</p>
        <p><a href="${mobileUniversal || verificationUrl}">${mobileUniversal || verificationUrl}</a></p>
        <p>If your device supports app links, try: <code>${mobileDeep}</code></p>
      `,
      text: `Verify in browser: ${verificationUrl}\nMobile universal link: ${mobileUniversal || verificationUrl}\nDeep link: ${mobileDeep}`,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const webBase = this.configService.get('FRONTEND_URL') || this.configService.get('PUBLIC_API_BASE_URL');
    const scheme = this.configService.get('MOBILE_DEEP_LINK_SCHEME') || 'glavito';
    const universal = this.configService.get('MOBILE_UNIVERSAL_LINK_BASE') || '';
    const mobileDeep = `${scheme}://reset-password?token=${token}`;
    const mobileUniversal = universal ? `${String(universal).replace(/\/$/, '')}/reset-password?token=${token}` : '';
    const resetUrl = `${webBase}/reset-password?token=${token}`;
    await this.sendEmail({
      to,
      subject: 'Reset your password',
      html: `
        <h1>Password Reset</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset in browser</a>
        <p>On mobile, this link may open the app directly:</p>
        <p><a href="${mobileUniversal || resetUrl}">${mobileUniversal || resetUrl}</a></p>
        <p>If your device supports app links, try: <code>${mobileDeep}</code></p>
        <p>This link will expire in 1 hour.</p>
      `,
      text: `Reset in browser: ${resetUrl}\nMobile universal link: ${mobileUniversal || resetUrl}\nDeep link: ${mobileDeep}`,
    });
  }

  async sendInvitationEmail(to: string, token: string, inviterName?: string, tenantName?: string): Promise<void> {
    const webBase = this.configService.get('FRONTEND_URL') || '';
    const scheme = this.configService.get('MOBILE_DEEP_LINK_SCHEME') || 'glavito';
    const universal = this.configService.get('MOBILE_UNIVERSAL_LINK_BASE') || '';
    const invitationUrl = `${webBase}/accept-invitation?token=${token}`;
    const mobileDeep = `${scheme}://invite/accept?token=${token}`;
    const mobileUniversal = universal ? `${String(universal).replace(/\/$/, '')}/invite/accept?token=${token}` : '';
    const inviter = inviterName || 'Someone';
    const tenant = tenantName || 'a team';
    await this.sendEmail({
      to,
      subject: `You're invited to join ${tenant}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">You're Invited!</h1>
          <p style="font-size: 16px; color: #666; line-height: 1.5;">
            ${inviter} has invited you to join ${tenant} on Glavito.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Accept in browser</a>
          </div>
          <p>On mobile, this link may open the app directly:</p>
          <p><a href="${mobileUniversal || invitationUrl}">${mobileUniversal || invitationUrl}</a></p>
          <p>If your device supports app links, try: <code>${mobileDeep}</code></p>
          <p style="font-size: 14px; color: #999;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
      text: `You've been invited to join ${tenant} by ${inviter}.\nWeb: ${invitationUrl}\nUniversal: ${mobileUniversal || invitationUrl}\nDeep: ${mobileDeep}`,
    });
  }
}
