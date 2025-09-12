/**
 * Agent Profile Service
 * Handles agent profiles, skills, availability, and performance tracking
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@glavito/shared-database';

export interface CreateAgentProfileRequest {
  userId: string;
  displayName?: string;
  bio?: string;
  skills?: string[];
  languages?: string[];
  timezone?: string;
  workingHours?: Record<string, { start: string; end: string }>;
  maxConcurrentTickets?: number;
  autoAssign?: boolean;
  notificationSettings?: Record<string, any>;
}

export interface UpdateAgentProfileRequest {
  displayName?: string;
  bio?: string;
  skills?: string[];
  languages?: string[];
  timezone?: string;
  workingHours?: Record<string, { start: string; end: string }>;
  availability?: 'available' | 'busy' | 'away' | 'offline';
  maxConcurrentTickets?: number;
  autoAssign?: boolean;
  notificationSettings?: Record<string, any>;
}

export interface AgentProfileInfo {
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
  displayName?: string;
  bio?: string;
  skills: string[];
  languages: string[];
  timezone?: string;
  workingHours?: Record<string, { start: string; end: string }>;
  availability: string;
  maxConcurrentTickets: number;
  autoAssign: boolean;
  notificationSettings: Record<string, any>;
  performanceMetrics: {
    ticketsAssigned: number;
    ticketsCompleted: number;
    averageResolutionTime: number;
    customerSatisfaction: number;
    responseTime: number;
    activeTickets: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentAvailabilityRequest {
  availability: 'available' | 'busy' | 'away' | 'offline';
  message?: string;
  autoReturn?: Date;
}

export interface SkillsAnalytics {
  topSkills: Array<{
    skill: string;
    agentCount: number;
    averagePerformance: number;
  }>;
  skillGaps: Array<{
    skill: string;
    demandScore: number;
    availableAgents: number;
  }>;
  languageCoverage: Array<{
    language: string;
    agentCount: number;
    coverage: number;
  }>;
}

@Injectable()
export class AgentProfileService {
  private readonly logger = new Logger(AgentProfileService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create agent profile
   */
  async createAgentProfile(
    tenantId: string,
    request: CreateAgentProfileRequest
  ): Promise<AgentProfileInfo> {
    try {
      this.logger.log(`Creating agent profile for user: ${request.userId}`);

      // Verify user exists and belongs to tenant
      const user = await this.databaseService.user.findFirst({
        where: {
          id: request.userId,
          tenantId,
          role: { in: ['agent', 'admin'] },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found or not eligible for agent profile');
      }

      // Check if profile already exists
      const existingProfile = await this.databaseService.agentProfile.findUnique({
        where: { userId: request.userId },
      });

      if (existingProfile) {
        throw new BadRequestException('Agent profile already exists for this user');
      }

      const profile = await this.databaseService.agentProfile.create({
        data: {
          userId: request.userId,
          displayName: request.displayName,
          bio: request.bio,
          skills: request.skills || [],
          languages: request.languages || [],
          timezone: request.timezone,
          workingHours: request.workingHours,
          maxConcurrentTickets: request.maxConcurrentTickets || 5,
          autoAssign: request.autoAssign ?? true,
          notificationSettings: request.notificationSettings || {},
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

      return this.mapToAgentProfileInfo(profile);
    } catch (error) {
      this.logger.error(`Failed to create agent profile: ${error.message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException('Failed to create agent profile');
    }
  }

  /**
   * Top performers computed from ticket activity.
   * Sorted by ticketsResolved desc, then resolutionRate desc, then avg first response asc.
   */
  async getTopAgents(
    tenantId: string,
    opts?: { limit?: number; from?: Date; to?: Date }
  ): Promise<Array<{
    userId: string;
    name: string;
    avatar?: string;
    ticketsResolved: number;
    ticketsAssigned: number;
    resolutionRate: number;
    averageFirstResponseMinutes: number;
  }>> {
    const limit = Math.max(1, Math.min(50, opts?.limit ?? 3));
    const to = opts?.to ?? new Date();
    const from = opts?.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      // Total assigned per agent in range
      const assigned = await this.databaseService.ticket.groupBy({
        by: ['assignedAgentId'],
        where: {
          tenantId,
          assignedAgentId: { not: null },
          createdAt: { gte: from, lte: to },
        },
        _count: { _all: true },
      });

      // Resolved and averages per agent in range
      const resolved = await this.databaseService.ticket.groupBy({
        by: ['assignedAgentId'],
        where: {
          tenantId,
          assignedAgentId: { not: null },
          resolvedAt: { not: null, gte: from, lte: to },
        },
        _count: { _all: true },
        _avg: { firstResponseTime: true },
      });

      const byAgent: Record<string, { assigned: number; resolved: number; avgFirstResp: number }> = {};
      for (const row of assigned) {
        const key = (row as any).assignedAgentId as string;
        if (!key) continue;
        byAgent[key] = byAgent[key] || { assigned: 0, resolved: 0, avgFirstResp: 0 };
        byAgent[key].assigned = (row as any)._count?._all || 0;
      }
      for (const row of resolved) {
        const key = (row as any).assignedAgentId as string;
        if (!key) continue;
        byAgent[key] = byAgent[key] || { assigned: 0, resolved: 0, avgFirstResp: 0 };
        byAgent[key].resolved = (row as any)._count?._all || 0;
        const avg = (row as any)._avg?.firstResponseTime ?? null;
        byAgent[key].avgFirstResp = typeof avg === 'number' ? avg : 0;
      }

      const agentIds = Object.keys(byAgent).filter(Boolean);
      if (agentIds.length === 0) return [];

      const users = await this.databaseService.user.findMany({
        where: { id: { in: agentIds }, tenantId, role: { in: ['agent', 'admin'] } },
        select: { id: true, firstName: true, lastName: true, avatar: true },
      });

      const list = users.map((u) => {
        const agg = byAgent[u.id] || { assigned: 0, resolved: 0, avgFirstResp: 0 };
        const resolutionRate = agg.assigned > 0 ? Math.round((agg.resolved / agg.assigned) * 100) : 0;
        return {
          userId: u.id,
          name: `${u.firstName} ${u.lastName}`.trim(),
          avatar: (u as any).avatar || undefined,
          ticketsResolved: agg.resolved,
          ticketsAssigned: agg.assigned,
          resolutionRate,
          averageFirstResponseMinutes: Math.round(agg.avgFirstResp || 0),
        };
      });

      list.sort((a, b) => (
        b.ticketsResolved - a.ticketsResolved ||
        b.resolutionRate - a.resolutionRate ||
        a.averageFirstResponseMinutes - b.averageFirstResponseMinutes
      ));

      return list.slice(0, limit);
    } catch (error) {
      this.logger.error(`Failed to compute top agents: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * Get agent profile
   */
  async getAgentProfile(tenantId: string, userId: string): Promise<AgentProfileInfo> {
    try {
      const profile = await this.databaseService.agentProfile.findFirst({
        where: {
          userId,
          user: { tenantId },
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

      if (!profile) {
        throw new NotFoundException('Agent profile not found');
      }

      return this.mapToAgentProfileInfo(profile);
    } catch (error) {
      this.logger.error(`Failed to get agent profile: ${error.message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to get agent profile');
    }
  }

  /**
   * Update agent profile
   */
  async updateAgentProfile(
    tenantId: string,
    userId: string,
    request: UpdateAgentProfileRequest
  ): Promise<AgentProfileInfo> {
    try {
      const existingProfile = await this.databaseService.agentProfile.findFirst({
        where: {
          userId,
          user: { tenantId },
        },
      });

      if (!existingProfile) {
        throw new NotFoundException('Agent profile not found');
      }

      const updatedProfile = await this.databaseService.agentProfile.update({
        where: { userId },
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

      return this.mapToAgentProfileInfo(updatedProfile);
    } catch (error) {
      this.logger.error(`Failed to update agent profile: ${error.message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to update agent profile');
    }
  }

  /**
   * Get all agent profiles for a tenant
   */
  async getAgentProfiles(
    tenantId: string,
    filters?: {
      availability?: string;
      skills?: string[];
      languages?: string[];
      autoAssign?: boolean;
    }
  ): Promise<AgentProfileInfo[]> {
    try {
      const where: any = {
        user: { tenantId },
      };

      if (filters?.availability) {
        where.availability = filters.availability;
      }

      if (filters?.skills && filters.skills.length > 0) {
        where.skills = { hasSome: filters.skills };
      }

      if (filters?.languages && filters.languages.length > 0) {
        where.languages = { hasSome: filters.languages };
      }

      if (filters?.autoAssign !== undefined) {
        where.autoAssign = filters.autoAssign;
      }

      const profiles = await this.databaseService.agentProfile.findMany({
        where,
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
        orderBy: [
          { availability: 'asc' },
          { user: { firstName: 'asc' } },
        ],
      });

      return profiles.map(profile => this.mapToAgentProfileInfo(profile));
    } catch (error) {
      this.logger.error(`Failed to get agent profiles: ${error.message}`);
      throw new BadRequestException('Failed to get agent profiles');
    }
  }

  /**
   * Update agent availability
   */
  async updateAgentAvailability(
    tenantId: string,
    userId: string,
    request: AgentAvailabilityRequest
  ): Promise<void> {
    try {
      const profile = await this.databaseService.agentProfile.findFirst({
        where: {
          userId,
          user: { tenantId },
        },
      });

      if (!profile) {
        throw new NotFoundException('Agent profile not found');
      }

      await this.databaseService.agentProfile.update({
        where: { userId },
        data: {
          availability: request.availability,
          // Store availability message and auto-return in notification settings
          notificationSettings: {
            ...profile.notificationSettings,
            availabilityMessage: request.message,
            autoReturn: request.autoReturn,
          },
        },
      });

      this.logger.log(`Updated availability for agent: ${userId} to ${request.availability}`);
    } catch (error) {
      this.logger.error(`Failed to update agent availability: ${error.message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to update agent availability');
    }
  }

  /**
   * Get available agents for ticket assignment
   */
  async getAvailableAgents(
    tenantId: string,
    filters?: {
      skills?: string[];
      languages?: string[];
      maxLoad?: boolean;
    }
  ): Promise<AgentProfileInfo[]> {
    try {
      const where: any = {
        user: { tenantId, status: 'active' },
        availability: 'available',
        autoAssign: true,
      };

      if (filters?.skills && filters.skills.length > 0) {
        where.skills = { hasSome: filters.skills };
      }

      if (filters?.languages && filters.languages.length > 0) {
        where.languages = { hasSome: filters.languages };
      }

      const profiles = await this.databaseService.agentProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              status: true,
              assignedTickets: {
                where: {
                  status: { in: ['open', 'pending'] },
                },
                select: { id: true },
              },
            },
          },
        },
      });

      let availableProfiles = profiles.map(profile => {
        const profileInfo = this.mapToAgentProfileInfo(profile);
        profileInfo.performanceMetrics.activeTickets = profile.user.assignedTickets.length;
        return profileInfo;
      });

      // Filter by max concurrent tickets if requested
      if (filters?.maxLoad) {
        availableProfiles = availableProfiles.filter(
          profile => profile.performanceMetrics.activeTickets < profile.maxConcurrentTickets
        );
      }

      // Sort by current load (ascending)
      availableProfiles.sort((a, b) => 
        a.performanceMetrics.activeTickets - b.performanceMetrics.activeTickets
      );

      return availableProfiles;
    } catch (error) {
      this.logger.error(`Failed to get available agents: ${error.message}`);
      throw new BadRequestException('Failed to get available agents');
    }
  }

  /**
   * Get skills analytics
   */
  async getSkillsAnalytics(tenantId: string): Promise<SkillsAnalytics> {
    try {
      const profiles = await this.databaseService.agentProfile.findMany({
        where: {
          user: { tenantId },
        },
        select: {
          skills: true,
          languages: true,
          performanceMetrics: true,
        },
      });

      // Analyze skills
      const skillMap = new Map<string, { count: number; totalPerformance: number }>();
      const languageMap = new Map<string, number>();

      profiles.forEach(profile => {
        // Count skills
        profile.skills.forEach(skill => {
          const current = skillMap.get(skill) || { count: 0, totalPerformance: 0 };
          skillMap.set(skill, {
            count: current.count + 1,
            totalPerformance: current.totalPerformance + (profile.performanceMetrics?.customerSatisfaction || 0),
          });
        });

        // Count languages
        profile.languages.forEach(language => {
          languageMap.set(language, (languageMap.get(language) || 0) + 1);
        });
      });

      // Calculate top skills
      const topSkills = Array.from(skillMap.entries())
        .map(([skill, data]) => ({
          skill,
          agentCount: data.count,
          averagePerformance: data.count > 0 ? data.totalPerformance / data.count : 0,
        }))
        .sort((a, b) => b.agentCount - a.agentCount)
        .slice(0, 10);

      // Calculate language coverage
      const totalAgents = profiles.length;
      const languageCoverage = Array.from(languageMap.entries())
        .map(([language, count]) => ({
          language,
          agentCount: count,
          coverage: totalAgents > 0 ? (count / totalAgents) * 100 : 0,
        }))
        .sort((a, b) => b.coverage - a.coverage);

      // Mock skill gaps (in a real implementation, this would be based on ticket analysis)
      const skillGaps = [
        { skill: 'Technical Support', demandScore: 85, availableAgents: skillMap.get('Technical Support')?.count || 0 },
        { skill: 'Billing', demandScore: 70, availableAgents: skillMap.get('Billing')?.count || 0 },
        { skill: 'Product Knowledge', demandScore: 60, availableAgents: skillMap.get('Product Knowledge')?.count || 0 },
      ];

      return {
        topSkills,
        skillGaps,
        languageCoverage,
      };
    } catch (error) {
      this.logger.error(`Failed to get skills analytics: ${error.message}`);
      throw new BadRequestException('Failed to get skills analytics');
    }
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformanceMetrics(tenantId: string, userId: string): Promise<{
    ticketsAssigned: number;
    ticketsCompleted: number;
    averageResolutionTime: number;
    customerSatisfaction: number;
    responseTime: number;
    activeTickets: number;
    weeklyStats: Array<{
      week: string;
      ticketsCompleted: number;
      averageResolutionTime: number;
    }>;
  }> {
    try {
      // In a real implementation, these would be calculated from actual ticket data
      // For now, we'll return mock data
      const mockMetrics = {
        ticketsAssigned: 45,
        ticketsCompleted: 42,
        averageResolutionTime: 2.5, // hours
        customerSatisfaction: 4.2, // out of 5
        responseTime: 15, // minutes
        activeTickets: 3,
        weeklyStats: [
          { week: '2024-01-01', ticketsCompleted: 8, averageResolutionTime: 2.2 },
          { week: '2024-01-08', ticketsCompleted: 12, averageResolutionTime: 2.8 },
          { week: '2024-01-15', ticketsCompleted: 10, averageResolutionTime: 2.1 },
          { week: '2024-01-22', ticketsCompleted: 12, averageResolutionTime: 2.9 },
        ],
      };

      return mockMetrics;
    } catch (error) {
      this.logger.error(`Failed to get agent performance metrics: ${error.message}`);
      throw new BadRequestException('Failed to get agent performance metrics');
    }
  }

  // Private helper methods

  private mapToAgentProfileInfo(profile: any): AgentProfileInfo {
    // In a real implementation, performance metrics would be calculated from actual data
    const performanceMetrics = {
      ticketsAssigned: 0,
      ticketsCompleted: 0,
      averageResolutionTime: 0,
      customerSatisfaction: 0,
      responseTime: 0,
      activeTickets: profile.user?.assignedTickets?.length || 0,
    };

    return {
      id: profile.id,
      userId: profile.userId,
      user: profile.user,
      displayName: profile.displayName,
      bio: profile.bio,
      skills: profile.skills,
      languages: profile.languages,
      timezone: profile.timezone,
      workingHours: profile.workingHours,
      availability: profile.availability,
      maxConcurrentTickets: profile.maxConcurrentTickets,
      autoAssign: profile.autoAssign,
      notificationSettings: profile.notificationSettings,
      performanceMetrics,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}