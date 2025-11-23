import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

export interface CreateAgentGoalRequest {
  userId: string;
  type: 'daily' | 'weekly' | 'monthly';
  metric: 'tickets_resolved' | 'response_time' | 'csat_score';
  target: number;
  startDate: Date;
  endDate: Date;
}

export interface AgentGoalResponse {
  id: string;
  userId: string;
  type: string;
  metric: string;
  target: number;
  current: number;
  startDate: Date;
  endDate: Date;
  achieved: boolean;
  achievedAt: Date | null;
  progress: number;
  metadata?: Record<string, unknown>;
}

export interface AgentAchievementResponse {
  id: string;
  userId: string;
  badgeType: string;
  earnedAt: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AgentGoalsService {
  private readonly logger = new Logger(AgentGoalsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a new goal for an agent
   */
  async createGoal(request: CreateAgentGoalRequest): Promise<AgentGoalResponse> {
    try {
      const goal = await this.db.agentGoal.create({
        data: {
          userId: request.userId,
          type: request.type,
          metric: request.metric,
          target: request.target,
          startDate: request.startDate,
          endDate: request.endDate,
          current: 0,
        },
      });

      return this.mapToResponse(goal);
    } catch (error) {
      this.logger.error(`Failed to create goal: ${error}`);
      throw error;
    }
  }

  /**
   * Get all goals for an agent
   */
  async getGoals(userId: string, type?: string): Promise<AgentGoalResponse[]> {
    try {
      const goals = await this.db.agentGoal.findMany({
        where: {
          userId,
          ...(type ? { type } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      return goals.map((g) => this.mapToResponse(g));
    } catch (error) {
      this.logger.error(`Failed to get goals: ${error}`);
      return [];
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(goalId: string, current: number): Promise<AgentGoalResponse> {
    try {
      const goal = await this.db.agentGoal.findUnique({
        where: { id: goalId },
      });

      if (!goal) {
        throw new Error('Goal not found');
      }

      const achieved = current >= (goal.target as number);
      const update = await this.db.agentGoal.update({
        where: { id: goalId },
        data: {
          current,
          achieved,
          ...(achieved && !(goal.achievedAt as Date | null) ? { achievedAt: new Date() } : {}),
        },
      });

      // If goal just achieved, create achievement badge
      if (achieved && !(goal.achievedAt as Date | null)) {
        await this.createAchievementForGoal(update);
      }

      return this.mapToResponse(update);
    } catch (error) {
      this.logger.error(`Failed to update goal progress: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate and update progress for all active goals
   */
  async recalculateGoals(userId: string, tenantId: string): Promise<void> {
    try {
      const now = new Date();
      const goals = await this.db.agentGoal.findMany({
        where: {
          userId,
          achieved: false,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      });

      for (const goal of goals) {
        const current = await this.calculateCurrentValue(
          userId,
          tenantId,
          goal.metric as string,
          goal.startDate as Date,
          now,
        );

        await this.updateGoalProgress(goal.id as string, current);
      }
    } catch (error) {
      this.logger.error(`Failed to recalculate goals: ${error}`);
    }
  }

  /**
   * Get achievements for an agent
   */
  async getAchievements(userId: string): Promise<AgentAchievementResponse[]> {
    try {
      const achievements = await this.db.agentAchievement.findMany({
        where: { userId },
        orderBy: { earnedAt: 'desc' },
      });

      return achievements.map((a) => ({
        id: a.id as string,
        userId: a.userId as string,
        badgeType: a.badgeType as string,
        earnedAt: a.earnedAt as Date,
        metadata: a.metadata as Record<string, unknown> | undefined,
      }));
    } catch (error) {
      this.logger.error(`Failed to get achievements: ${error}`);
      return [];
    }
  }

  /**
   * Award achievement badge
   */
  async awardAchievement(
    userId: string,
    badgeType: string,
    metadata?: Record<string, unknown>,
  ): Promise<AgentAchievementResponse> {
    try {
      // Check if already awarded
      const existing = await this.db.agentAchievement.findFirst({
        where: { userId, badgeType },
      });

      if (existing) {
        return {
          id: existing.id as string,
          userId: existing.userId as string,
          badgeType: existing.badgeType as string,
          earnedAt: existing.earnedAt as Date,
          metadata: existing.metadata as Record<string, unknown> | undefined,
        };
      }

      const achievement = await this.db.agentAchievement.create({
        data: {
          userId,
          badgeType,
          metadata: metadata || {},
        },
      });

      return {
        id: achievement.id as string,
        userId: achievement.userId as string,
        badgeType: achievement.badgeType as string,
        earnedAt: achievement.earnedAt as Date,
        metadata: achievement.metadata as Record<string, unknown> | undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to award achievement: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate current value for a metric
   */
  private async calculateCurrentValue(
    userId: string,
    tenantId: string,
    metric: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    try {
      switch (metric) {
        case 'tickets_resolved':
          return await this.db.ticket.count({
            where: {
              tenantId,
              assignedAgentId: userId,
              status: 'resolved',
              resolvedAt: { gte: startDate, lte: endDate },
            },
          });

        case 'response_time': {
          const result = await (this.db.ticket as any).aggregate({
            where: {
              tenantId,
              assignedAgentId: userId,
              firstResponseAt: { not: null, gte: startDate, lte: endDate },
            },
            _avg: { firstResponseTime: true },
          });
          return result._avg?.firstResponseTime || 0;
        }

        case 'csat_score': {
          const result = await (this.db as any).customerSatisfactionSurvey?.aggregate({
            where: {
              tenantId,
              ticket: { assignedAgentId: userId },
              createdAt: { gte: startDate, lte: endDate },
            },
            _avg: { rating: true },
          });
          return result?._avg?.rating || 0;
        }

        default:
          return 0;
      }
    } catch (error) {
      this.logger.error(`Failed to calculate metric ${metric}: ${error}`);
      return 0;
    }
  }

  /**
   * Create achievement badge when goal is reached
   */
  private async createAchievementForGoal(goal: any): Promise<void> {
    try {
      let badgeType = 'goal_achiever';
      const metadata: Record<string, unknown> = {
        goalId: goal.id,
        metric: goal.metric,
        target: goal.target,
      };

      // Determine badge type based on metric and achievement
      if (goal.metric === 'tickets_resolved') {
        if (goal.target >= 50) {
          badgeType = 'productivity_champion';
        } else if (goal.target >= 20) {
          badgeType = 'efficient_solver';
        }
      } else if (goal.metric === 'response_time') {
        if (goal.current <= 5) {
          badgeType = 'speed_demon';
        } else if (goal.current <= 10) {
          badgeType = 'quick_responder';
        }
      } else if (goal.metric === 'csat_score') {
        if (goal.current >= 4.8) {
          badgeType = 'customer_champion';
        } else if (goal.current >= 4.5) {
          badgeType = 'satisfaction_star';
        }
      }

      await this.awardAchievement(goal.userId, badgeType, metadata);
    } catch (error) {
      this.logger.error(`Failed to create achievement for goal: ${error}`);
    }
  }

  /**
   * Map database model to response
   */
  private mapToResponse(goal: any): AgentGoalResponse {
    const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;

    return {
      id: goal.id,
      userId: goal.userId,
      type: goal.type,
      metric: goal.metric,
      target: goal.target,
      current: goal.current,
      startDate: goal.startDate,
      endDate: goal.endDate,
      achieved: goal.achieved,
      achievedAt: goal.achievedAt,
      progress: Math.min(100, Math.round(progress)),
      metadata: goal.metadata || {},
    };
  }
}
