import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { AuthInvitation, AuthUser } from '@glavito/shared-auth';

export interface CreateInvitationRequest {
  email: string;
  role: 'admin' | 'agent' | 'viewer';
  invitedBy: string;
  tenantId: string;
  expiresIn?: number; // in hours, default 24h
  message?: string;
}

export interface InvitationResponse {
  invitation: AuthInvitation;
  inviteUrl: string;
}

export interface AcceptInvitationRequest {
  token: string;
  userId: string;
  firstName: string;
  lastName: string;
  password?: string;
}

@Injectable()
export class InvitationService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async createInvitation(request: CreateInvitationRequest): Promise<InvitationResponse> {
    // Check if user already exists
    const existingUser = await this.databaseService.user.findUnique({
      where: { email: request.email },
    });

    if (existingUser && existingUser.tenantId === request.tenantId) {
      throw new BadRequestException('User already belongs to this tenant');
    }

    // Check for existing active invitations
    const existingInvitation = await this.databaseService.invitation.findFirst({
      where: {
        email: request.email,
        tenantId: request.tenantId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      throw new BadRequestException('Active invitation already exists for this email');
    }

    const token = this.generateInvitationToken();
    const expiresAt = new Date(Date.now() + (request.expiresIn || 24) * 60 * 60 * 1000);

    const invitation = await this.databaseService.invitation.create({
      data: {
        email: request.email,
        token,
        role: request.role,
        tenantId: request.tenantId,
        invitedBy: request.invitedBy,
        status: 'pending',
        expiresAt,
        message: request.message,
      },
    }) as AuthInvitation;

    const inviteUrl = `${this.configService.get<string>('FRONTEND_URL')}/accept-invitation?token=${token}`;

    // Send invitation email
    await this.emailService.sendInvitationEmail({
      to: request.email,
      invitation: {
        token,
        role: request.role,
        tenantName: (await this.getTenantName(request.tenantId)),
        inviteUrl,
        expiresAt,
        message: request.message,
      },
    });

    return {
      invitation,
      inviteUrl,
    };
  }

  async getInvitationByToken(token: string): Promise<AuthInvitation> {
    const invitation = await this.databaseService.invitation.findUnique({
      where: { token },
      include: {
        invitedByUser: true,
        tenant: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation has already been used');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    return invitation as AuthInvitation;
  }

  async acceptInvitation(request: AcceptInvitationRequest): Promise<{
    user: AuthUser;
    tenant: any;
  }> {
    const invitation = await this.getInvitationByToken(request.token);

    // Check if user already exists
    let user = await this.databaseService.user.findUnique({
      where: { email: invitation.email },
    });

    if (user) {
      // User exists - just update tenant and role
      if (user.tenantId && user.tenantId !== invitation.tenantId) {
        throw new BadRequestException('User already belongs to another tenant');
      }

      user = await this.databaseService.user.update({
        where: { id: user.id },
        data: {
          tenantId: invitation.tenantId,
          role: invitation.role,
        },
        include: { tenant: true },
      });
    } else {
      // Create new user
      user = await this.databaseService.user.create({
        data: {
          email: invitation.email,
          firstName: request.firstName,
          lastName: request.lastName,
          passwordHash: request.password || '', // SSO users may not have password
          role: invitation.role,
          status: 'active',
          emailVerified: true,
          tenantId: invitation.tenantId,
        },
        include: { tenant: true },
      });
    }

    // Update invitation status
    await this.databaseService.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedBy: user.id,
      },
    });

    return {
      user: user as AuthUser,
      tenant: user.tenant,
    };
  }

  async declineInvitation(token: string, userId?: string): Promise<void> {
    const invitation = await this.getInvitationByToken(token);

    await this.databaseService.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'declined',
        declinedAt: new Date(),
        acceptedBy: userId || null,
      },
    });
  }

  async cancelInvitation(invitationId: string, requestedBy: string): Promise<void> {
    const invitation = await this.databaseService.invitation.findUnique({
      where: { id: invitationId },
      include: { invitedByUser: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.invitedBy !== requestedBy && invitation.invitedByUser.role !== 'owner') {
      throw new BadRequestException('Only the inviter or owner can cancel invitations');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Can only cancel pending invitations');
    }

    await this.databaseService.invitation.update({
      where: { id: invitationId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });
  }

  async getPendingInvitations(tenantId: string): Promise<AuthInvitation[]> {
    const invitations = await this.databaseService.invitation.findMany({
      where: {
        tenantId,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      include: {
        invitedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations as AuthInvitation[];
  }

  async getInvitationsByEmail(email: string): Promise<AuthInvitation[]> {
    const invitations = await this.databaseService.invitation.findMany({
      where: { email },
      include: {
        tenant: true,
        invitedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations as AuthInvitation[];
  }

  async resendInvitation(invitationId: string, requestedBy: string): Promise<void> {
    const invitation = await this.databaseService.invitation.findUnique({
      where: { id: invitationId },
      include: { invitedByUser: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.invitedBy !== requestedBy && invitation.invitedByUser.role !== 'owner') {
      throw new BadRequestException('Only the inviter or owner can resend invitations');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Can only resend pending invitations');
    }

    // Extend expiration and send new email
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.databaseService.invitation.update({
      where: { id: invitationId },
      data: {
        expiresAt: newExpiresAt,
      },
    });

    const inviteUrl = `${this.configService.get<string>('FRONTEND_URL')}/accept-invitation?token=${invitation.token}`;

    await this.emailService.sendInvitationEmail({
      to: invitation.email,
      invitation: {
        token: invitation.token,
        role: invitation.role,
        tenantName: (await this.getTenantName(invitation.tenantId)),
        inviteUrl,
        expiresAt: newExpiresAt,
        message: invitation.message || undefined,
      },
    });
  }

  async cleanupExpiredInvitations(): Promise<number> {
    const result = await this.databaseService.invitation.updateMany({
      where: {
        status: 'pending',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'expired',
      },
    });

    return result.count;
  }

  private generateInvitationToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async getTenantName(tenantId: string): Promise<string> {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    return tenant?.name || 'Unknown Organization';
  }
}