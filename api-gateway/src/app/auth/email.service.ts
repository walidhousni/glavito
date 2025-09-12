import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { DatabaseService } from '@glavito/shared-database';

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

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private tenantTransporters = new Map<string, nodemailer.Transporter>();

  constructor(private readonly configService: ConfigService, private readonly db: DatabaseService) {
    const host = this.configService.get<string>('SMTP_HOST')
    const port = this.configService.get<number>('SMTP_PORT')
    const user = this.configService.get<string>('SMTP_USER')
    const pass = this.configService.get<string>('SMTP_PASS')
    if (!host || !port || !user || !pass) {
      // Create a stub transporter that logs instead of sending, to avoid crashes in dev
      this.transporter = nodemailer.createTransport({ jsonTransport: true })
    } else {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: Number(port) === 465,
        auth: { user, pass },
      });
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email dispatched:', info?.messageId || '(mock)', 'to:', options.to);
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw error;
    }
  }

  private async getTenantSmtpConfig(tenantId: string): Promise<TenantSmtpConfig | null> {
    const tenant = await this.db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return null;
    const settings = ((tenant as any).whiteLabelSettings || {}) as { smtp?: TenantSmtpConfig };
    const smtp = settings?.smtp;
    if (!smtp || !smtp.host || !smtp.port || !smtp.user || !smtp.pass) return null;
    return smtp;
  }

  private async getTransporterForTenant(tenantId: string): Promise<nodemailer.Transporter> {
    if (this.tenantTransporters.has(tenantId)) {
      return this.tenantTransporters.get(tenantId) as nodemailer.Transporter;
    }
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
    const smtp = await this.getTenantSmtpConfig(tenantId);
    const transporter = await this.getTransporterForTenant(tenantId);
    const mailOptions = {
      from: (smtp?.from || this.configService.get<string>('EMAIL_FROM')),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('📧 Email dispatched:', info?.messageId || '(mock)', 'to:', options.to, 'tenant:', tenantId);
    } catch (error) {
      console.error('❌ Failed to send email (tenant):', error);
      throw error;
    }
  }

  async dispatchEmailForTenant(tenantId: string, options: EmailOptions): Promise<{ messageId: string | null }> {
    const smtp = await this.getTenantSmtpConfig(tenantId);
    const transporter = await this.getTransporterForTenant(tenantId);
    const mailOptions = {
      from: (smtp?.from || this.configService.get<string>('EMAIL_FROM')),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };
    try {
      const info = await transporter.sendMail(mailOptions);
      const messageId = (info as any)?.messageId ? String((info as any).messageId) : null;
      return { messageId };
    } catch (error) {
      console.error('❌ Failed to dispatch email (tenant):', error);
      throw error;
    }
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
    const verificationUrl = `${this.configService.get('FRONTEND_URL') || this.configService.get('PUBLIC_API_BASE_URL')}/verify-email?token=${token}`;
    
    await this.sendEmail({
      to,
      subject: 'Verify your email address',
      html: `
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      text: `Please verify your email by visiting: ${verificationUrl}`,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL') || this.configService.get('PUBLIC_API_BASE_URL')}/reset-password?token=${token}`;
    
    await this.sendEmail({
      to,
      subject: 'Reset your password',
      html: `
        <h1>Password Reset</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      text: `Reset your password by visiting: ${resetUrl}`,
    });
  }

  async sendInvitationEmail(to: string, token: string, inviterName?: string, tenantName?: string): Promise<void> {
    const invitationUrl = `${this.configService.get('FRONTEND_URL')}/accept-invitation?token=${token}`;
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
            <a href="${invitationUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Accept Invitation</a>
          </div>
          <p style="font-size: 14px; color: #999;">
            This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
      text: `You've been invited to join ${tenant} by ${inviter}. Accept at: ${invitationUrl}`,
    });
  }
}