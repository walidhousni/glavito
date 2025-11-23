/**
 * Team Management Service
 * Handles team creation, member management, role assignments, and team-based ticket routing
 */

import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@glavito/shared-database';
import { SubscriptionService } from '../subscriptions/subscriptions.service';

export interface CreateTeamRequest {
  name: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
}

export interface AddTeamMemberRequest {
  userId: string;
  role?: 'member' | 'lead' | 'admin';
  permissions?: string[];
  skills?: string[];
  availability?: Record<string, any>;
}

export interface UpdateTeamMemberRequest {
  role?: 'member' | 'lead' | 'admin';
  permissions?: string[];
  skills?: string[];
  availability?: Record<string, any>;
  isActive?: boolean;
}

export interface TeamMemberInfo {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    status: string;
  };
  role: string;
  permissions: string[];
  skills: string[];
  availability?: Record<string, any>;
  isActive: boolean;
  joinedAt: Date;
  performanceMetrics?: {
    ticketsAssigned: number;
    ticketsCompleted: number;
    averageResolutionTime: number;
    customerSatisfaction: number;
  };
}

export interface TeamInfo {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  color?: string;
  isDefault: boolean;
  memberCount: number;
  activeMembers: number;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  members?: TeamMemberInfo[];
}

export interface TeamStats {
  totalTeams: number;
  totalMembers: number;
  activeMembers: number;
  averageTeamSize: number;
  teamPerformance: {
    teamId: string;
    teamName: string;
    ticketsAssigned: number;
    ticketsCompleted: number;
    averageResolutionTime: number;
    memberCount: number;
  }[];
}

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Create a new team
   */
  async createTeam(tenantId: string, request: CreateTeamRequest): Promise<TeamInfo> {
    try {
      this.logger.log(`Creating team for tenant: ${tenantId}`);

      // Check subscription limits for teams
      const currentTeamCount = await this.databaseService.team.count({
        where: { tenantId },
      });

      const limitCheck = await this.subscriptionService.checkUsageLimits(
        tenantId,
        'teams',
        currentTeamCount
      );

      if (!limitCheck.allowed) {
        throw new ForbiddenException(
          limitCheck.message || `You've reached your plan limit of ${limitCheck.limit} teams. Please upgrade to add more teams.`
        );
      }

      // Check if team name already exists
      const existingTeam = await this.databaseService.team.findFirst({
        where: {
          tenantId,
          name: request.name,
        },
      });

      if (existingTeam) {
        throw new BadRequestException('Team name already exists');
      }

      // If this is set as default, unset other default teams
      if (request.isDefault) {
        await this.databaseService.team.updateMany({
          where: {
            tenantId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const team = await this.databaseService.team.create({
        data: {
          tenantId,
          name: request.name,
          description: request.description,
          color: request.color || this.generateRandomColor(),
          isDefault: request.isDefault || false,
        },
      });

      return this.mapToTeamInfo(team);
    } catch (error) {
      this.logger.error(`Failed to create team: ${error.message}`);
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException('Failed to create team');
    }
  }

  /**
   * Get all teams for a tenant
   * If userId is provided, only return teams the user is a member of (for agents)
   */
  async getTeams(
    tenantId: string,
    includeMembers = false,
    userId?: string
  ): Promise<TeamInfo[]> {
    try {
      const where: any = { tenantId };
      
      // If userId is provided, filter to only teams the user is a member of
      if (userId) {
        where.members = {
          some: {
            userId,
            isActive: true,
          },
        };
      }

      const teams = await this.databaseService.team.findMany({
        where,
        include: {
          members: includeMembers ? {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  status: true,
                },
              },
            },
          } : false,
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' },
        ],
      });

      return Promise.all(teams.map(async (team) => {
        const teamInfo = this.mapToTeamInfo(team);
        
        if (includeMembers && team.members) {
          teamInfo.members = await Promise.all(
            team.members.map(member => this.mapToTeamMemberInfo(member))
          );
        }

        return teamInfo;
      }));
    } catch (error) {
      this.logger.error(`Failed to get teams: ${error.message}`);
      throw new BadRequestException('Failed to get teams');
    }
  }

  /**
   * Get team by ID
   */
  async getTeam(tenantId: string, teamId: string): Promise<TeamInfo> {
    try {
      const team = await this.databaseService.team.findFirst({
        where: {
          id: teamId,
          tenantId,
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  status: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      const teamInfo = this.mapToTeamInfo(team);
      teamInfo.members = await Promise.all(
        team.members.map(member => this.mapToTeamMemberInfo(member))
      );

      return teamInfo;
    } catch (error) {
      this.logger.error(`Failed to get team: ${error.message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to get team');
    }
  }

  /**
   * Get team members only
   */
  async getTeamMembers(tenantId: string, teamId: string): Promise<TeamMemberInfo[]> {
    try {
      const team = await this.databaseService.team.findFirst({
        where: { id: teamId, tenantId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  status: true,
                },
              },
            },
          },
        },
      });
      if (!team) {
        throw new NotFoundException('Team not found');
      }
      return Promise.all(team.members.map(member => this.mapToTeamMemberInfo(member)));
    } catch (error) {
      this.logger.error(`Failed to get team members: ${error.message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to get team members');
    }
  }

  /**
   * Update team
   */
  async updateTeam(
    tenantId: string,
    teamId: string,
    request: UpdateTeamRequest
  ): Promise<TeamInfo> {
    try {
      const existingTeam = await this.databaseService.team.findFirst({
        where: {
          id: teamId,
          tenantId,
        },
      });

      if (!existingTeam) {
        throw new NotFoundException('Team not found');
      }

      // Check if new name conflicts with existing team
      if (request.name && request.name !== existingTeam.name) {
        const nameConflict = await this.databaseService.team.findFirst({
          where: {
            tenantId,
            name: request.name,
            id: { not: teamId },
          },
        });

        if (nameConflict) {
          throw new BadRequestException('Team name already exists');
        }
      }

      // If setting as default, unset other default teams
      if (request.isDefault && !existingTeam.isDefault) {
        await this.databaseService.team.updateMany({
          where: {
            tenantId,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const updatedTeam = await this.databaseService.team.update({
        where: { id: teamId },
        data: request,
      });

      return this.mapToTeamInfo(updatedTeam);
    } catch (error) {
      this.logger.error(`Failed to update team: ${error.message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to update team');
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(tenantId: string, teamId: string): Promise<void> {
    try {
      const team = await this.databaseService.team.findFirst({
        where: {
          id: teamId,
          tenantId,
        },
        include: {
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      if (team.isDefault) {
        throw new BadRequestException('Cannot delete default team');
      }

      if (team._count.members > 0) {
        throw new BadRequestException('Cannot delete team with members. Remove all members first.');
      }

      await this.databaseService.team.delete({
        where: { id: teamId },
      });

      this.logger.log(`Deleted team: ${teamId}`);
    } catch (error) {
      this.logger.error(`Failed to delete team: ${error.message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to delete team');
    }
  }

  /**
   * Add member to team
   */
  async addTeamMember(
    tenantId: string,
    teamId: string,
    request: AddTeamMemberRequest
  ): Promise<TeamMemberInfo> {
    try {
      // Verify team exists and belongs to tenant
      const team = await this.databaseService.team.findFirst({
        where: {
          id: teamId,
          tenantId,
        },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      // Verify user exists and belongs to tenant
      const user = await this.databaseService.user.findFirst({
        where: {
          id: request.userId,
          tenantId,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user is already a member
      const existingMember = await this.databaseService.teamMember.findFirst({
        where: {
          teamId,
          userId: request.userId,
        },
      });

      if (existingMember) {
        throw new BadRequestException('User is already a team member');
      }

      const teamMember = await this.databaseService.teamMember.create({
        data: {
          teamId,
          userId: request.userId,
          role: request.role || 'member',
          permissions: request.permissions || [],
          skills: request.skills || [],
          availability: request.availability,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              status: true,
            },
          },
        },
      });

      return this.mapToTeamMemberInfo(teamMember);
    } catch (error) {
      this.logger.error(`Failed to add team member: ${error.message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to add team member');
    }
  }

  /**
   * Update team member
   */
  async updateTeamMember(
    tenantId: string,
    teamId: string,
    memberId: string,
    request: UpdateTeamMemberRequest
  ): Promise<TeamMemberInfo> {
    try {
      // Verify team exists and belongs to tenant
      const team = await this.databaseService.team.findFirst({
        where: {
          id: teamId,
          tenantId,
        },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      const existingMember = await this.databaseService.teamMember.findFirst({
        where: {
          id: memberId,
          teamId,
        },
      });

      if (!existingMember) {
        throw new NotFoundException('Team member not found');
      }

      const updatedMember = await this.databaseService.teamMember.update({
        where: { id: memberId },
        data: request,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              status: true,
            },
          },
        },
      });

      return this.mapToTeamMemberInfo(updatedMember);
    } catch (error) {
      this.logger.error(`Failed to update team member: ${error.message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to update team member');
    }
  }

  /**
   * Remove team member
   */
  async removeTeamMember(tenantId: string, teamId: string, memberId: string): Promise<void> {
    try {
      // Verify team exists and belongs to tenant
      const team = await this.databaseService.team.findFirst({
        where: {
          id: teamId,
          tenantId,
        },
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      const member = await this.databaseService.teamMember.findFirst({
        where: {
          id: memberId,
          teamId,
        },
      });

      if (!member) {
        throw new NotFoundException('Team member not found');
      }

      await this.databaseService.teamMember.delete({
        where: { id: memberId },
      });

      this.logger.log(`Removed team member: ${memberId} from team: ${teamId}`);
    } catch (error) {
      this.logger.error(`Failed to remove team member: ${error.message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to remove team member');
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStats(tenantId: string): Promise<TeamStats> {
    try {
      const teams = await this.databaseService.team.findMany({
        where: { tenantId },
        include: {
          members: {
            where: { isActive: true },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      const totalTeams = teams.length;
      const totalMembers = teams.reduce((sum, team) => sum + team._count.members, 0);
      const activeMembers = teams.reduce((sum, team) => sum + team.members.length, 0);
      const averageTeamSize = totalTeams > 0 ? totalMembers / totalTeams : 0;

      // Get team performance metrics (simplified for now)
      const teamPerformance = teams.map(team => ({
        teamId: team.id,
        teamName: team.name,
        ticketsAssigned: 0, // Would be calculated from actual ticket assignments
        ticketsCompleted: 0,
        averageResolutionTime: 0,
        memberCount: team._count.members,
      }));

      return {
        totalTeams,
        totalMembers,
        activeMembers,
        averageTeamSize: Math.round(averageTeamSize * 100) / 100,
        teamPerformance,
      };
    } catch (error) {
      this.logger.error(`Failed to get team stats: ${error.message}`);
      throw new BadRequestException('Failed to get team statistics');
    }
  }

  /**
   * Verify that a user is a member of a team
   */
  async verifyTeamMembership(tenantId: string, teamId: string, userId: string): Promise<void> {
    try {
      const membership = await this.databaseService.teamMember.findFirst({
        where: {
          teamId,
          userId,
          isActive: true,
          team: {
            tenantId,
          },
        },
      });

      if (!membership) {
        throw new ForbiddenException('You are not a member of this team');
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error(`Failed to verify team membership: ${error.message}`);
      throw new ForbiddenException('Failed to verify team membership');
    }
  }

  /**
   * Get available users for team assignment
   */
  async getAvailableUsers(tenantId: string, teamId?: string): Promise<Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: string;
    status: string;
    isTeamMember: boolean;
  }>> {
    try {
      const users = await this.databaseService.user.findMany({
        where: {
          tenantId,
          status: 'active',
          role: { in: ['agent', 'admin'] },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          status: true,
          teamMemberships: teamId ? {
            where: { teamId },
          } : true,
        },
      });

      return users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        isTeamMember: user.teamMemberships.length > 0,
      }));
    } catch (error) {
      this.logger.error(`Failed to get available users: ${error.message}`);
      throw new BadRequestException('Failed to get available users');
    }
  }

  // Private helper methods

  private mapToTeamInfo(team: any): TeamInfo {
    return {
      id: team.id,
      tenantId: team.tenantId,
      name: team.name,
      description: team.description,
      color: team.color,
      isDefault: team.isDefault,
      memberCount: team._count?.members || 0,
      activeMembers: team.members?.filter((m: any) => m.isActive).length || 0,
      settings: team.settings,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  private async mapToTeamMemberInfo(member: any): Promise<TeamMemberInfo> {
    // In a real implementation, you'd fetch performance metrics from the database
    const performanceMetrics = {
      ticketsAssigned: 0,
      ticketsCompleted: 0,
      averageResolutionTime: 0,
      customerSatisfaction: 0,
    };

    return {
      id: member.id,
      userId: member.userId,
      user: member.user,
      role: member.role,
      permissions: member.permissions,
      skills: member.skills,
      availability: member.availability,
      isActive: member.isActive,
      joinedAt: member.joinedAt,
      performanceMetrics,
    };
  }

  private generateRandomColor(): string {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#F97316', // Orange
      '#84CC16', // Lime
      '#EC4899', // Pink
      '#6B7280', // Gray
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}