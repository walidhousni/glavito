/**
 * Invitation Service
 * Handles team member invitations, email templates, and invitation management
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@glavito/shared-database';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { EmailService } from '../email/email.service';

export interface SendInvitationRequest {
  email: string;
  role: 'agent' | 'admin' | 'manager';
  teamIds?: string[];
  permissions?: string[];
  customMessage?: string;
  templateId?: string;
}

export interface BulkInviteRequest {
  emails: string[];
  role: 'agent' | 'admin' | 'manager';
  teamIds?: string[];
  permissions?: string[];
  customMessage?: string;
  templateId?: string;
}

export interface InvitationInfo {
  id: string;
  tenantId: string;
  inviterUserId: string;
  inviter: {
    firstName: string;
    lastName: string;
    email: string;
  };
  email: string;
  role: string;
  token: string;
  status: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  teamIds?: string[];
  permissions?: string[];
  customMessage?: string;
}

export interface InvitationTemplateInfo {
  id: string;
  tenantId: string;
  name: string;
  role: string;
  subject: string;
  content: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvitationTemplateRequest {
  name: string;
  role: 'agent' | 'admin' | 'manager';
  subject: string;
  content: string;
  isDefault?: boolean;
}

export interface UpdateInvitationTemplateRequest {
  name?: string;
  subject?: string;
  content?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface AcceptInvitationRequest {
  token: string;
  firstName: string;
  lastName: string;
  password?: string;
}

export interface InvitationStats {
  totalSent: number;
  totalAccepted: number;
  totalPending: number;
  totalExpired: number;
  acceptanceRate: number;
  recentInvitations: InvitationInfo[];
}

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Send invitation to join team
   */
  async sendInvitation(
    tenantId: string,
    inviterUserId: string,
    request: SendInvitationRequest
  ): Promise<InvitationInfo> {
    try {
      this.logger.log(`Sending invitation to: ${request.email}`);

      // Check if user already exists
      const existingUser = await this.databaseService.user.findFirst({
        where: {
          email: request.email,
          tenantId,
        },
      });

      if (existingUser) {
        throw new BadRequestException('User already exists in this organization');
      }

      // Check for existing pending invitation
      const existingInvitation = await this.databaseService.invitation.findFirst({
        where: {
          email: request.email,
          tenantId,
          status: 'pending',
        },
      });

      if (existingInvitation) {
        throw new BadRequestException('Invitation already sent to this email');
      }

      // Generate secure token
      const token = this.generateInvitationToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create invitation
      const invitation = await this.databaseService.invitation.create({
        data: {
          tenantId,
          inviterUserId,
          email: request.email,
          role: request.role,
          token,
          status: 'pending',
          expiresAt,
        },
        include: {
          inviter: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Send invitation email
      await this.sendInvitationEmail(invitation, request);

      return this.mapToInvitationInfo(invitation, request);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send invitation: ${errorMessage}`);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to send invitation');
    }
  }

  /**
   * Get all invitations for a tenant
   */
  async getInvitations(
    tenantId: string,
    status?: string
  ): Promise<InvitationInfo[]> {
    try {
      const where: any = { tenantId };
      if (status) {
        where.status = status;
      }

      const invitations = await this.databaseService.invitation.findMany({
        where,
        include: {
          inviter: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return invitations.map(invitation => this.mapToInvitationInfo(invitation));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get invitations: ${errorMessage}`);
      throw new BadRequestException('Failed to get invitations');
    }
  }

  /**
   * Send bulk invitations
   */
  async sendBulkInvitations(
    tenantId: string,
    request: BulkInviteRequest,
    inviterUserId: string
  ): Promise<{ sent: number; failed: number; errors: Array<{ email: string; error: string }> }> {
    const results = { sent: 0, failed: 0, errors: [] as Array<{ email: string; error: string }> };
    const emails = Array.isArray(request.emails) ? request.emails : [];
    for (const email of emails) {
      try {
        await this.sendInvitation(tenantId, inviterUserId, {
          email,
          role: request.role,
          teamIds: request.teamIds,
          permissions: request.permissions,
          customMessage: request.customMessage,
          templateId: request.templateId,
        });
        results.sent += 1;
      } catch (e) {
        results.failed += 1;
        results.errors.push({ email, error: (e as Error)?.message || 'invite_failed' });
      }
    }
    return results;
  }

  /**
   * Validate invitation token
   */
  async getInvitationByToken(token: string): Promise<InvitationInfo | null> {
    const invitation = await this.databaseService.invitation.findFirst({
      where: { token, status: 'pending', expiresAt: { gt: new Date() } },
      include: {
        inviter: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!invitation) return null;
    return this.mapToInvitationInfo(invitation);
  }

  /**
   * Mark expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    const now = new Date();
    const expired = await this.databaseService.invitation.updateMany({
      where: { status: 'pending', expiresAt: { lt: now } },
      data: { status: 'expired' },
    });
    return expired.count || 0;
  }

  /**
   * Resend invitation
   */
  async resendInvitation(tenantId: string, invitationId: string): Promise<void> {
    try {
      const invitation = await this.databaseService.invitation.findFirst({
        where: {
          id: invitationId,
          tenantId,
          status: 'pending',
        },
        include: {
          inviter: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new NotFoundException('Invitation not found or already processed');
      }

      // Update expiration date
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await this.databaseService.invitation.update({
        where: { id: invitationId },
        data: { expiresAt: newExpiresAt },
      });

      // Resend email
      await this.sendInvitationEmail(invitation);

      this.logger.log(`Resent invitation: ${invitationId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to resend invitation: ${errorMessage}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to resend invitation');
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(tenantId: string, invitationId: string): Promise<void> {
    try {
      const invitation = await this.databaseService.invitation.findFirst({
        where: {
          id: invitationId,
          tenantId,
          status: 'pending',
        },
      });

      if (!invitation) {
        throw new NotFoundException('Invitation not found or already processed');
      }

      await this.databaseService.invitation.update({
        where: { id: invitationId },
        data: { status: 'revoked' },
      });

      this.logger.log(`Cancelled invitation: ${invitationId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to cancel invitation: ${errorMessage}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to cancel invitation');
    }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(request: AcceptInvitationRequest): Promise<{
    success: boolean;
    user?: any;
    message: string;
  }> {
    try {
      const invitation = await this.databaseService.invitation.findFirst({
        where: {
          token: request.token,
          status: 'pending',
          expiresAt: { gt: new Date() },
        },
      });

      if (!invitation) {
        return {
          success: false,
          message: 'Invalid or expired invitation token',
        };
      }

      // Check if user already exists
      const existingUser = await this.databaseService.user.findFirst({
        where: {
          email: invitation.email,
          tenantId: invitation.tenantId,
        },
      });

      if (existingUser) {
        return {
          success: false,
          message: 'User already exists in this organization',
        };
      }

      // Create user account
      const user = await this.databaseService.user.create({
        data: {
          tenantId: invitation.tenantId,
          email: invitation.email,
          firstName: request.firstName,
          lastName: request.lastName,
          role: invitation.role,
          status: 'active',
          emailVerified: true,
          passwordHash: request.password ? await this.hashPassword(request.password) : null,
        },
      });

      // Update invitation status
      await this.databaseService.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
        },
      });

      this.logger.log(`Invitation accepted: ${invitation.id} by user: ${user.id}`);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        message: 'Invitation accepted successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to accept invitation: ${errorMessage}`);
      return {
        success: false,
        message: 'Failed to accept invitation',
      };
    }
  }

  /**
   * Create invitation template
   */
  async createInvitationTemplate(
    tenantId: string,
    request: CreateInvitationTemplateRequest
  ): Promise<InvitationTemplateInfo> {
    try {
      // Check if template name already exists
      const existingTemplate = await this.databaseService.invitationTemplate.findFirst({
        where: {
          tenantId,
          name: request.name,
        },
      });

      if (existingTemplate) {
        throw new BadRequestException('Template name already exists');
      }

      // If this is set as default, unset other default templates for this role
      if (request.isDefault) {
        await this.databaseService.invitationTemplate.updateMany({
          where: {
            tenantId,
            role: request.role,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const template = await this.databaseService.invitationTemplate.create({
        data: {
          tenantId,
          name: request.name,
          role: request.role,
          subject: request.subject,
          content: request.content,
          isDefault: request.isDefault || false,
        },
      });

      return this.mapToInvitationTemplateInfo(template);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create invitation template: ${errorMessage}`);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create invitation template');
    }
  }

  /**
   * Get invitation templates
   */
  async getInvitationTemplates(
    tenantId: string,
    role?: string
  ): Promise<InvitationTemplateInfo[]> {
    try {
      const where: any = { tenantId, isActive: true };
      if (role) {
        where.role = role;
      }

      const templates = await this.databaseService.invitationTemplate.findMany({
        where,
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' },
        ],
      });

      return templates.map(template => this.mapToInvitationTemplateInfo(template));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get invitation templates: ${errorMessage}`);
      throw new BadRequestException('Failed to get invitation templates');
    }
  }

  /**
   * Get invitation statistics
   */
  async getInvitationStats(tenantId: string): Promise<InvitationStats> {
    try {
      const [totalSent, totalAccepted, totalPending, totalExpired, recentInvitations] = await Promise.all([
        this.databaseService.invitation.count({ where: { tenantId } }),
        this.databaseService.invitation.count({ where: { tenantId, status: 'accepted' } }),
        this.databaseService.invitation.count({ where: { tenantId, status: 'pending' } }),
        this.databaseService.invitation.count({ 
          where: { 
            tenantId, 
            status: 'pending',
            expiresAt: { lt: new Date() }
          } 
        }),
        this.databaseService.invitation.findMany({
          where: { tenantId },
          include: {
            inviter: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      const acceptanceRate = totalSent > 0 ? (totalAccepted / totalSent) * 100 : 0;

      return {
        totalSent,
        totalAccepted,
        totalPending,
        totalExpired,
        acceptanceRate: Math.round(acceptanceRate * 100) / 100,
        recentInvitations: recentInvitations.map((inv: any) => this.mapToInvitationInfo(inv)),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get invitation stats: ${errorMessage}`);
      throw new BadRequestException('Failed to get invitation statistics');
    }
  }

  // Private helper methods

  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(String(password ?? ''), 12);
  }

  private async sendInvitationEmail(invitation: any, request?: SendInvitationRequest): Promise<void> {
    try {
      const inviteUrl = `${this.configService.get('APP_URL')}/invite/accept?token=${invitation.token}`;
      
      // Get template or use default
      let template;
      if (request?.templateId) {
        template = await this.databaseService.invitationTemplate.findFirst({
          where: {
            id: request.templateId,
            tenantId: invitation.tenantId,
            isActive: true,
          },
        });
      }

      if (!template) {
        template = await this.databaseService.invitationTemplate.findFirst({
          where: {
            tenantId: invitation.tenantId,
            role: invitation.role,
            isDefault: true,
            isActive: true,
          },
        });
      }

      const subject = template?.subject || `You're invited to join ${invitation.inviter.firstName}'s team`;
      const content = template?.content || this.getDefaultInvitationContent();

      // Replace template variables
      const personalizedContent = content
        .replace(/\{inviterName\}/g, `${invitation.inviter.firstName} ${invitation.inviter.lastName}`)
        .replace(/\{inviterEmail\}/g, invitation.inviter.email)
        .replace(/\{inviteUrl\}/g, inviteUrl)
        .replace(/\{role\}/g, invitation.role)
        .replace(/\{customMessage\}/g, request?.customMessage || '');

      // Send email via Brevo SMTP using tenant-aware transport
      await this.emailService.dispatchEmailForTenant(invitation.tenantId, {
        to: invitation.email,
        subject,
        html: personalizedContent,
      });

      this.logger.log(`Invitation email sent to: ${invitation.email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send invitation email: ${errorMessage}`);
      // Don't throw error here to avoid breaking the invitation creation
    }
  }

  private async sendEmail(emailData: { to: string; subject: string; html: string; tenantId?: string }): Promise<void> {
    if (emailData.tenantId) {
      await this.emailService.dispatchEmailForTenant(emailData.tenantId, {
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
      });
      return;
    }
    await this.emailService.sendEmail({
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    });
  }

  private getDefaultInvitationContent(): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're invited to join our team!</h2>
        <p>Hi there,</p>
        <p>{inviterName} ({inviterEmail}) has invited you to join their team as a {role}.</p>
        {customMessage}
        <p>Click the button below to accept the invitation:</p>
        <a href="{inviteUrl}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="{inviteUrl}">{inviteUrl}</a></p>
        <p>This invitation will expire in 7 days.</p>
        <p>Best regards,<br>The Team</p>
      </div>
    `;
  }

  private mapToInvitationInfo(invitation: any & {
    id: string;
    tenantId: string;
    inviterUserId: string;
    inviter: {
      firstName: string;
      lastName: string;
      email: string;
    };
    email: string;
    role: string;
    token: string;
    status: string;
    expiresAt: Date;
    acceptedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }, request?: SendInvitationRequest): InvitationInfo {
    return {
      id: invitation.id,
      tenantId: invitation.tenantId,
      inviterUserId: invitation.inviterUserId,
      inviter: invitation.inviter,
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
      teamIds: request?.teamIds,
      permissions: request?.permissions,
      customMessage: request?.customMessage,
    };
  }

  private mapToInvitationTemplateInfo(template: any & {
    id: string;
    tenantId: string;
    name: string;
    role: string;
    subject: string;
    content: string;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): InvitationTemplateInfo {
    return {
      id: template.id,
      tenantId: template.tenantId,
      name: template.name,
      role: template.role,
      subject: template.subject,
      content: template.content,
      isDefault: template.isDefault,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}