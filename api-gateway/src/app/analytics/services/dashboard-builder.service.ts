import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';

export interface WidgetConfig {
  id: string;
  type: string; // metric-card, line-chart, bar-chart, pie-chart, table, gauge, etc.
  title: string;
  metric: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  filters?: Record<string, unknown>;
  timeRange?: string;
  groupBy?: string;
  refreshInterval?: number; // seconds
  size?: { w: number; h: number };
  position?: { x: number; y: number };
  config?: Record<string, unknown>; // Widget-specific configuration
}

export interface DashboardLayoutConfig {
  id: string;
  name: string;
  description?: string;
  role?: string;
  industry?: string;
  isDefault?: boolean;
  isPublic?: boolean;
  layout: Array<{ i: string; x: number; y: number; w: number; h: number }>;
  widgets: WidgetConfig[];
}

export interface CreateDashboardDto {
  name: string;
  description?: string;
  role?: string;
  industry?: string;
  isDefault?: boolean;
  isPublic?: boolean;
  layout?: Array<{ i: string; x: number; y: number; w: number; h: number }>;
  widgets?: WidgetConfig[];
}

export interface UpdateDashboardDto extends Partial<CreateDashboardDto> {
  viewCount?: number;
}

@Injectable()
export class DashboardBuilderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new custom dashboard
   */
  async createDashboard(
    tenantId: string,
    userId: string,
    data: CreateDashboardDto
  ): Promise<DashboardLayoutConfig> {
    // Check if a dashboard with the same name exists for this user
    const existing = await this.prisma.dashboardLayout.findUnique({
      where: {
        tenantId_userId_name: {
          tenantId,
          userId,
          name: data.name,
        },
      },
    });

    if (existing) {
      throw new ForbiddenException(
        `A dashboard with the name "${data.name}" already exists`
      );
    }

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.dashboardLayout.updateMany({
        where: {
          tenantId,
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const dashboard = await this.prisma.dashboardLayout.create({
      data: {
        tenantId,
        userId,
        name: data.name,
        description: data.description,
        role: data.role,
        industry: data.industry,
        isDefault: data.isDefault || false,
        isPublic: data.isPublic || false,
        layout: data.layout || [],
        widgets: data.widgets || [],
      },
    });

    return this.toDashboardConfig(dashboard);
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(
    dashboardId: string,
    tenantId: string,
    userId: string
  ): Promise<DashboardLayoutConfig> {
    const dashboard = await this.prisma.dashboardLayout.findUnique({
      where: { id: dashboardId },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    if (dashboard.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    // Check if user has access (owner or public dashboard)
    if (dashboard.userId !== userId && !dashboard.isPublic) {
      throw new ForbiddenException('Access denied');
    }

    // Increment view count
    await this.prisma.dashboardLayout.update({
      where: { id: dashboardId },
      data: { viewCount: { increment: 1 } },
    });

    return this.toDashboardConfig(dashboard);
  }

  /**
   * Get all dashboards for a user
   */
  async getUserDashboards(
    tenantId: string,
    userId: string
  ): Promise<DashboardLayoutConfig[]> {
    const dashboards = await this.prisma.dashboardLayout.findMany({
      where: {
        tenantId,
        OR: [{ userId }, { isPublic: true }],
      },
      orderBy: [{ isDefault: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
    });

    return dashboards.map((d) => this.toDashboardConfig(d));
  }

  /**
   * Get dashboards by role
   */
  async getDashboardsByRole(
    tenantId: string,
    role: string
  ): Promise<DashboardLayoutConfig[]> {
    const dashboards = await this.prisma.dashboardLayout.findMany({
      where: {
        tenantId,
        role,
        isPublic: true,
      },
      orderBy: [{ isDefault: 'desc' }, { viewCount: 'desc' }],
    });

    return dashboards.map((d) => this.toDashboardConfig(d));
  }

  /**
   * Get dashboards by industry
   */
  async getDashboardsByIndustry(
    tenantId: string,
    industry: string
  ): Promise<DashboardLayoutConfig[]> {
    const dashboards = await this.prisma.dashboardLayout.findMany({
      where: {
        tenantId,
        industry,
        isPublic: true,
      },
      orderBy: [{ isDefault: 'desc' }, { viewCount: 'desc' }],
    });

    return dashboards.map((d) => this.toDashboardConfig(d));
  }

  /**
   * Get default dashboard for user
   */
  async getDefaultDashboard(
    tenantId: string,
    userId: string
  ): Promise<DashboardLayoutConfig | null> {
    const dashboard = await this.prisma.dashboardLayout.findFirst({
      where: {
        tenantId,
        userId,
        isDefault: true,
      },
    });

    if (!dashboard) {
      return null;
    }

    return this.toDashboardConfig(dashboard);
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    dashboardId: string,
    tenantId: string,
    userId: string,
    data: UpdateDashboardDto
  ): Promise<DashboardLayoutConfig> {
    const dashboard = await this.prisma.dashboardLayout.findUnique({
      where: { id: dashboardId },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    if (dashboard.tenantId !== tenantId || dashboard.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.dashboardLayout.updateMany({
        where: {
          tenantId,
          userId,
          isDefault: true,
          id: { not: dashboardId },
        },
        data: {
          isDefault: false,
        },
      });
    }

    const updated = await this.prisma.dashboardLayout.update({
      where: { id: dashboardId },
      data: {
        name: data.name,
        description: data.description,
        role: data.role,
        industry: data.industry,
        isDefault: data.isDefault,
        isPublic: data.isPublic,
        layout: data.layout !== undefined ? data.layout : undefined,
        widgets: data.widgets !== undefined ? data.widgets : undefined,
      },
    });

    return this.toDashboardConfig(updated);
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(
    dashboardId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const dashboard = await this.prisma.dashboardLayout.findUnique({
      where: { id: dashboardId },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    if (dashboard.tenantId !== tenantId || dashboard.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.dashboardLayout.delete({
      where: { id: dashboardId },
    });
  }

  /**
   * Duplicate dashboard
   */
  async duplicateDashboard(
    dashboardId: string,
    tenantId: string,
    userId: string,
    newName: string
  ): Promise<DashboardLayoutConfig> {
    const original = await this.getDashboard(dashboardId, tenantId, userId);

    return this.createDashboard(tenantId, userId, {
      name: newName,
      description: original.description,
      role: original.role,
      industry: original.industry,
      isDefault: false,
      isPublic: false,
      layout: original.layout,
      widgets: original.widgets,
    });
  }

  /**
   * Clone dashboard to another user (admin only)
   */
  async cloneDashboard(
    dashboardId: string,
    targetTenantId: string,
    targetUserId: string
  ): Promise<DashboardLayoutConfig> {
    const original = await this.prisma.dashboardLayout.findUnique({
      where: { id: dashboardId },
    });

    if (!original) {
      throw new NotFoundException('Dashboard not found');
    }

    const cloned = await this.prisma.dashboardLayout.create({
      data: {
        tenantId: targetTenantId,
        userId: targetUserId,
        name: original.name,
        description: original.description,
        role: original.role,
        industry: original.industry,
        isDefault: false,
        isPublic: false,
        layout: original.layout,
        widgets: original.widgets,
      },
    });

    return this.toDashboardConfig(cloned);
  }

  /**
   * Get widget data (to be implemented with actual metrics calculation)
   */
  async getWidgetData(
    tenantId: string,
    widgetId: string,
    widgetConfig: WidgetConfig
  ): Promise<any> {
    // This is a placeholder. Actual implementation would:
    // 1. Parse widget config (metric, filters, timeRange, etc.)
    // 2. Query appropriate data sources
    // 3. Apply aggregations
    // 4. Return formatted data for the widget type

    return {
      widgetId,
      type: widgetConfig.type,
      data: [], // Actual data would be fetched here
      lastUpdated: new Date(),
    };
  }

  /**
   * Get available widget types
   */
  getAvailableWidgetTypes(): Array<{
    type: string;
    name: string;
    description: string;
    defaultSize: { w: number; h: number };
  }> {
    return [
      {
        type: 'metric-card',
        name: 'Metric Card',
        description: 'Display a single metric with trend',
        defaultSize: { w: 2, h: 2 },
      },
      {
        type: 'line-chart',
        name: 'Line Chart',
        description: 'Time series data visualization',
        defaultSize: { w: 4, h: 3 },
      },
      {
        type: 'bar-chart',
        name: 'Bar Chart',
        description: 'Compare values across categories',
        defaultSize: { w: 4, h: 3 },
      },
      {
        type: 'pie-chart',
        name: 'Pie Chart',
        description: 'Show proportions and percentages',
        defaultSize: { w: 3, h: 3 },
      },
      {
        type: 'table',
        name: 'Data Table',
        description: 'Detailed data in tabular format',
        defaultSize: { w: 6, h: 4 },
      },
      {
        type: 'gauge',
        name: 'Gauge',
        description: 'Display progress towards a goal',
        defaultSize: { w: 2, h: 2 },
      },
      {
        type: 'heatmap',
        name: 'Heatmap',
        description: 'Visualize patterns over time',
        defaultSize: { w: 6, h: 3 },
      },
      {
        type: 'leaderboard',
        name: 'Leaderboard',
        description: 'Rank agents or teams by performance',
        defaultSize: { w: 3, h: 4 },
      },
    ];
  }

  /**
   * Convert database model to DashboardLayoutConfig
   */
  private toDashboardConfig(dashboard: any): DashboardLayoutConfig {
    return {
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      role: dashboard.role,
      industry: dashboard.industry,
      isDefault: dashboard.isDefault,
      isPublic: dashboard.isPublic,
      layout: dashboard.layout as any,
      widgets: dashboard.widgets as any,
    };
  }
}

