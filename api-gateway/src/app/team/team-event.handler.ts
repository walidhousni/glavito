/**
 * Team Event Handler
 * Handles team-related events and triggers appropriate actions
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DatabaseService } from '@glavito/shared-database';

@Injectable()
export class TeamEventHandler {
  private readonly logger = new Logger(TeamEventHandler.name);

  constructor(private readonly databaseService: DatabaseService) {}

  @OnEvent('team.member.updated')
  async handleTeamMemberUpdated(payload: {
    tenantId: string;
    memberId: string;
    actorId: string;
    changes: any;
    previousData: any;
  }) {
    try {
      this.logger.log(`Team member updated: ${payload.memberId} by ${payload.actorId}`);

      // Create audit log
      await this.databaseService.auditLog.create({
        data: {
          tenantId: payload.tenantId,
          userId: payload.actorId,
          resource: 'team',
          resourceId: payload.memberId,
          action: 'member.updated',
          oldValues: payload.previousData,
          newValues: payload.changes,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to handle team member updated event: ${error.message}`);
    }
  }

  @OnEvent('team.member.removed')
  async handleTeamMemberRemoved(payload: {
    tenantId: string;
    memberId: string;
    actorId: string;
    memberData: any;
  }) {
    try {
      this.logger.log(`Team member removed: ${payload.memberId} by ${payload.actorId}`);

      // Create audit log
      await this.databaseService.auditLog.create({
        data: {
          tenantId: payload.tenantId,
          userId: payload.actorId,
          resource: 'team',
          resourceId: payload.memberId,
          action: 'member.removed',
          oldValues: payload.memberData,
          newValues: { status: 'removed' },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to handle team member removed event: ${error.message}`);
    }
  }

  @OnEvent('invitation.sent')
  async handleInvitationSent(payload: {
    tenantId: string;
    invitationId: string;
    email: string;
    role: string;
    inviterId: string;
  }) {
    try {
      this.logger.log(`Invitation sent: ${payload.email} for role ${payload.role}`);

      // Create audit log
      await this.databaseService.auditLog.create({
        data: {
          tenantId: payload.tenantId,
          userId: payload.inviterId,
          resource: 'team',
          resourceId: payload.invitationId,
          action: 'invitation.sent',
          newValues: {
            email: payload.email,
            role: payload.role,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to handle invitation sent event: ${error.message}`);
    }
  }

  @OnEvent('invitation.bulk.sent')
  async handleBulkInvitationSent(payload: {
    tenantId: string;
    inviterId: string;
    totalSent: number;
    totalFailed: number;
    successful: string[];
    failed: string[];
  }) {
    try {
      this.logger.log(`Bulk invitations sent: ${payload.totalSent} successful, ${payload.totalFailed} failed`);

      // Create audit log
      await this.databaseService.auditLog.create({
        data: {
          tenantId: payload.tenantId,
          userId: payload.inviterId,
          resource: 'team',
          action: 'invitation.bulk.sent',
          newValues: {
            totalSent: payload.totalSent,
            totalFailed: payload.totalFailed,
            successful: payload.successful,
            failed: payload.failed,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to handle bulk invitation sent event: ${error.message}`);
    }
  }

  @OnEvent('invitation.resent')
  async handleInvitationResent(payload: {
    tenantId: string;
    invitationId: string;
    email: string;
    actorId: string;
  }) {
    try {
      this.logger.log(`Invitation resent: ${payload.email}`);

      // Create audit log
      await this.databaseService.auditLog.create({
        data: {
          tenantId: payload.tenantId,
          userId: payload.actorId,
          resource: 'team',
          resourceId: payload.invitationId,
          action: 'invitation.resent',
          newValues: {
            email: payload.email,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to handle invitation resent event: ${error.message}`);
    }
  }

  @OnEvent('invitation.cancelled')
  async handleInvitationCancelled(payload: {
    tenantId: string;
    invitationId: string;
    email: string;
    actorId: string;
  }) {
    try {
      this.logger.log(`Invitation cancelled: ${payload.email}`);

      // Create audit log
      await this.databaseService.auditLog.create({
        data: {
          tenantId: payload.tenantId,
          userId: payload.actorId,
          resource: 'team',
          resourceId: payload.invitationId,
          action: 'invitation.cancelled',
          newValues: {
            email: payload.email,
            status: 'cancelled',
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to handle invitation cancelled event: ${error.message}`);
    }
  }

  @OnEvent('invitation.accepted')
  async handleInvitationAccepted(payload: {
    tenantId: string;
    invitationId: string;
    userId: string;
    email: string;
    role: string;
  }) {
    try {
      this.logger.log(`Invitation accepted: ${payload.email} joined as ${payload.role}`);

      // Create audit log
      await this.databaseService.auditLog.create({
        data: {
          tenantId: payload.tenantId,
          userId: payload.userId,
          resource: 'team',
          resourceId: payload.invitationId,
          action: 'invitation.accepted',
          newValues: {
            email: payload.email,
            role: payload.role,
            status: 'accepted',
          },
        },
      });

      // Update tenant member count
      await this.updateTenantMemberCount(payload.tenantId);
    } catch (error) {
      this.logger.error(`Failed to handle invitation accepted event: ${error.message}`);
    }
  }

  private async updateTenantMemberCount(tenantId: string): Promise<void> {
    try {
      const memberCount = await this.databaseService.user.count({
        where: {
          tenantId,
          status: { not: 'removed' },
        },
      });

      await this.databaseService.tenant.update({
        where: { id: tenantId },
        data: { memberCount },
      });
    } catch (error) {
      this.logger.error(`Failed to update tenant member count: ${error.message}`);
    }
  }
}