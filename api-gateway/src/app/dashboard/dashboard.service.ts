import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Get real-time dashboard metrics for admin/agent
   */
  async getRealTimeMetrics(tenantId: string, userId?: string) {
    try {
      const [
        activeConversations,
        pendingTickets,
        slaAtRisk,
        agentsOnline,
        resolvedToday,
      ] = await Promise.all([
        // Active conversations count
        this.db.conversationAdvanced.count({
          where: { tenantId, status: 'active' },
        }).catch(() => 0),
        
        // Pending tickets count
        this.db.ticket.count({
          where: {
            tenantId,
            status: { in: ['open', 'pending', 'in_progress'] },
          },
        }).catch(() => 0),
        
        // SLA at risk count
        this.db.ticket.count({
          where: {
            tenantId,
            slaInstance: {
              status: 'active',
              OR: [
                {
                  firstResponseDue: {
                    lt: new Date(Date.now() + 2 * 60 * 60 * 1000),
                  },
                  firstResponseAt: null,
                },
                {
                  resolutionDue: {
                    lt: new Date(Date.now() + 4 * 60 * 60 * 1000),
                  },
                  resolutionAt: null,
                },
              ],
            },
          },
        }).catch(() => 0),
        
        // Agents online (from agent profiles with recent activity)
        this.db.agentProfile.count({
          where: {
            user: { tenantId },
            availability: { in: ['available', 'busy'] },
            updatedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
          },
        }).catch(() => 0),
        
        // Resolved today
        this.db.ticket.count({
          where: {
            tenantId,
            status: 'resolved',
            resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }).catch(() => 0),
      ]);

      return {
        activeConversations,
        pendingTickets,
        slaAtRisk,
        agentsOnline,
        resolvedToday,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get real-time metrics: ${error}`);
      return {
        activeConversations: 0,
        pendingTickets: 0,
        slaAtRisk: 0,
        agentsOnline: 0,
        resolvedToday: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get agent-specific dashboard metrics
   */
  async getAgentMetrics(userId: string, tenantId: string) {
    try {
      const today = new Date(new Date().setHours(0, 0, 0, 0));
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [
        assignedTickets,
        resolvedToday,
        resolvedThisWeek,
        avgResponseTime,
        csatScore,
      ] = await Promise.all([
        // Assigned tickets
        this.db.ticket.count({
          where: {
            tenantId,
            assignedAgentId: userId,
            status: { in: ['open', 'pending', 'in_progress', 'waiting'] },
          },
        }).catch(() => 0),
        
        // Resolved today
        this.db.ticket.count({
          where: {
            tenantId,
            assignedAgentId: userId,
            status: 'resolved',
            resolvedAt: { gte: today },
          },
        }).catch(() => 0),
        
        // Resolved this week
        this.db.ticket.count({
          where: {
            tenantId,
            assignedAgentId: userId,
            status: 'resolved',
            resolvedAt: { gte: weekAgo },
          },
        }).catch(() => 0),
        
        // Average response time
        (this.db.ticket as any).aggregate({
          where: {
            tenantId,
            assignedAgentId: userId,
            firstResponseAt: { not: null },
            createdAt: { gte: weekAgo },
          },
          _avg: { firstResponseTime: true },
        }).then((res: any) => res?._avg?.firstResponseTime || 0).catch(() => 0),
        
        // CSAT score
        (this.db as any).customerSatisfactionSurvey?.aggregate({
          where: {
            tenantId,
            ticket: { assignedAgentId: userId },
            createdAt: { gte: weekAgo },
          },
          _avg: { rating: true },
        }).then((res: any) => res?._avg?.rating || 0).catch(() => 0),
      ]);

      return {
        assignedTickets,
        resolvedToday,
        resolvedThisWeek,
        avgResponseTime: Math.round(avgResponseTime),
        csatScore: Number((csatScore || 0).toFixed(2)),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get agent metrics: ${error}`);
      return {
        assignedTickets: 0,
        resolvedToday: 0,
        resolvedThisWeek: 0,
        avgResponseTime: 0,
        csatScore: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get dashboard configuration for a user
   */
  async getDashboardConfig(userId: string) {
    try {
      const config = await this.db.dashboardConfig.findUnique({
        where: { userId },
      });

      return config || this.createDefaultConfig(userId);
    } catch (error) {
      this.logger.error(`Failed to get dashboard config: ${error}`);
      return this.createDefaultConfig(userId);
    }
  }

  /**
   * Save dashboard configuration
   */
  async saveDashboardConfig(
    userId: string,
    config: {
      layout?: Record<string, unknown>;
      widgets?: string[];
      theme?: string;
      settings?: Record<string, unknown>;
    },
  ) {
    try {
      return await this.db.dashboardConfig.upsert({
        where: { userId },
        update: config,
        create: {
          userId,
          layout: config.layout || {},
          widgets: config.widgets || [],
          theme: config.theme,
          settings: config.settings || {},
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save dashboard config: ${error}`);
      throw error;
    }
  }

  /**
   * Create default dashboard configuration
   */
  private createDefaultConfig(userId: string) {
    return {
      id: 'default',
      userId,
      layout: {},
      widgets: [
        'stats',
        'activity-feed',
        'performance-overview',
        'analytics-chart',
        'quick-actions',
      ],
      theme: 'auto',
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
