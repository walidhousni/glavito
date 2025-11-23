import { PrismaService } from '@glavito/shared-database';
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';


export interface MetricDefinition {
  field: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';
  label: string;
  format?: 'number' | 'currency' | 'percent' | 'duration';
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'between';
  value: any;
}

export interface VisualizationConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'table' | 'number' | 'gauge';
  xAxis?: string;
  yAxis?: string[];
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
}

export interface CreateReportDto {
  name: string;
  description?: string;
  category: string;
  industry?: string;
  metrics: MetricDefinition[];
  filters?: FilterCondition[];
  groupBy?: string[];
  visualization: VisualizationConfig;
  isPublic?: boolean;
  isFavorite?: boolean;
}

export interface UpdateReportDto extends Partial<CreateReportDto> {}

export interface CreateScheduleDto {
  reportId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number; // 0-6, for weekly
  dayOfMonth?: number; // 1-31, for monthly
  time: string; // HH:mm format
  timezone?: string;
  recipients: string[]; // email addresses
  format: 'pdf' | 'csv' | 'excel' | 'json';
  isActive?: boolean;
}

export interface UpdateScheduleDto extends Partial<CreateScheduleDto> {}

@Injectable()
export class ReportBuilderService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new custom report
   */
  async createReport(
    tenantId: string,
    userId: string,
    data: CreateReportDto
  ): Promise<any> {
    const report = await this.prisma.customReport.create({
      data: {
        tenantId,
        createdBy: userId,
        name: data.name,
        description: data.description,
        category: data.category,
        industry: data.industry,
        metrics: data.metrics,
        filters: data.filters || {},
        groupBy: data.groupBy || [],
        visualization: data.visualization,
        isPublic: data.isPublic || false,
        isFavorite: data.isFavorite || false,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        schedules: true,
      },
    });

    return report;
  }

  /**
   * Get report by ID
   */
  async getReport(reportId: string, tenantId: string, userId: string): Promise<any> {
    const report = await this.prisma.customReport.findUnique({
      where: { id: reportId },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        schedules: true,
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    // Check if user has access (creator or public report)
    if (report.createdBy !== userId && !report.isPublic) {
      throw new ForbiddenException('Access denied');
    }

    // Increment view count
    await this.prisma.customReport.update({
      where: { id: reportId },
      data: { viewCount: { increment: 1 } },
    });

    return report;
  }

  /**
   * List reports for tenant
   */
  async listReports(
    tenantId: string,
    userId: string,
    filters?: {
      category?: string;
      industry?: string;
      createdBy?: string;
      isFavorite?: boolean;
    }
  ): Promise<any[]> {
    const reports = await this.prisma.customReport.findMany({
      where: {
        tenantId,
        ...(filters?.category && { category: filters.category }),
        ...(filters?.industry && { industry: filters.industry }),
        ...(filters?.createdBy && { createdBy: filters.createdBy }),
        ...(filters?.isFavorite !== undefined && { isFavorite: filters.isFavorite }),
        OR: [{ createdBy: userId }, { isPublic: true }],
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        schedules: {
          where: { isActive: true },
        },
      },
      orderBy: [{ isFavorite: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
    });

    return reports;
  }

  /**
   * Update report
   */
  async updateReport(
    reportId: string,
    tenantId: string,
    userId: string,
    data: UpdateReportDto
  ): Promise<any> {
    const report = await this.prisma.customReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.tenantId !== tenantId || report.createdBy !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.prisma.customReport.update({
      where: { id: reportId },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        industry: data.industry,
        metrics: data.metrics !== undefined ? data.metrics : undefined,
        filters: data.filters !== undefined ? data.filters : undefined,
        groupBy: data.groupBy !== undefined ? data.groupBy : undefined,
        visualization: data.visualization !== undefined ? data.visualization : undefined,
        isPublic: data.isPublic,
        isFavorite: data.isFavorite,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        schedules: true,
      },
    });

    return updated;
  }

  /**
   * Delete report
   */
  async deleteReport(reportId: string, tenantId: string, userId: string): Promise<void> {
    const report = await this.prisma.customReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.tenantId !== tenantId || report.createdBy !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.customReport.delete({
      where: { id: reportId },
    });
  }

  /**
   * Generate report data
   */
  async generateReport(reportId: string, tenantId: string, userId: string): Promise<any> {
    const report = await this.getReport(reportId, tenantId, userId);

    // Update last generated timestamp
    await this.prisma.customReport.update({
      where: { id: reportId },
      data: { lastGeneratedAt: new Date() },
    });

    // This is a placeholder. Actual implementation would:
    // 1. Parse metrics, filters, and groupBy
    // 2. Build appropriate queries
    // 3. Execute queries against the database
    // 4. Apply aggregations
    // 5. Format data according to visualization type
    // 6. Return formatted data

    return {
      reportId,
      name: report.name,
      generatedAt: new Date(),
      data: [], // Actual data would be generated here
      metadata: {
        metrics: report.metrics,
        filters: report.filters,
        groupBy: report.groupBy,
        visualization: report.visualization,
      },
    };
  }

  /**
   * Create report schedule
   */
  async createSchedule(
    tenantId: string,
    userId: string,
    data: CreateScheduleDto
  ): Promise<any> {
    // Verify report exists and user has access
    await this.getReport(data.reportId, tenantId, userId);

    // Calculate next run time
    const nextRun = this.calculateNextRun(
      data.frequency,
      data.dayOfWeek,
      data.dayOfMonth,
      data.time,
      data.timezone || 'UTC'
    );

    const schedule = await this.prisma.reportSchedule.create({
      data: {
        reportId: data.reportId,
        tenantId,
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek,
        dayOfMonth: data.dayOfMonth,
        time: data.time,
        timezone: data.timezone || 'UTC',
        recipients: data.recipients,
        format: data.format,
        isActive: data.isActive !== undefined ? data.isActive : true,
        nextRun,
      },
    });

    return schedule;
  }

  /**
   * Update schedule
   */
  async updateSchedule(
    scheduleId: string,
    tenantId: string,
    userId: string,
    data: UpdateScheduleDto
  ): Promise<any> {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
      include: { report: true },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    // Verify user has access to the report
    await this.getReport(schedule.reportId, tenantId, userId);

    // Recalculate next run if timing changed
    let nextRun = schedule.nextRun;
    if (
      data.frequency ||
      data.dayOfWeek !== undefined ||
      data.dayOfMonth !== undefined ||
      data.time ||
      data.timezone
    ) {
      nextRun = this.calculateNextRun(
        data.frequency || schedule.frequency,
        data.dayOfWeek !== undefined ? data.dayOfWeek : schedule.dayOfWeek,
        data.dayOfMonth !== undefined ? data.dayOfMonth : schedule.dayOfMonth,
        data.time || schedule.time,
        data.timezone || schedule.timezone
      );
    }

    const updated = await this.prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: {
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek,
        dayOfMonth: data.dayOfMonth,
        time: data.time,
        timezone: data.timezone,
        recipients: data.recipients,
        format: data.format,
        isActive: data.isActive,
        nextRun,
      },
    });

    return updated;
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(
    scheduleId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    if (schedule.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    // Verify user has access to the report
    await this.getReport(schedule.reportId, tenantId, userId);

    await this.prisma.reportSchedule.delete({
      where: { id: scheduleId },
    });
  }

  /**
   * Get schedules for a report
   */
  async getReportSchedules(
    reportId: string,
    tenantId: string,
    userId: string
  ): Promise<any[]> {
    // Verify user has access to the report
    await this.getReport(reportId, tenantId, userId);

    return this.prisma.reportSchedule.findMany({
      where: {
        reportId,
        tenantId,
      },
      orderBy: {
        nextRun: 'asc',
      },
    });
  }

  /**
   * Get due schedules (for cron job)
   */
  async getDueSchedules(): Promise<any[]> {
    return this.prisma.reportSchedule.findMany({
      where: {
        isActive: true,
        nextRun: {
          lte: new Date(),
        },
      },
      include: {
        report: true,
      },
    });
  }

  /**
   * Mark schedule as executed
   */
  async markScheduleExecuted(
    scheduleId: string,
    status: 'success' | 'error',
    error?: string
  ): Promise<void> {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      return;
    }

    // Calculate next run
    const nextRun = this.calculateNextRun(
      schedule.frequency,
      schedule.dayOfWeek,
      schedule.dayOfMonth,
      schedule.time,
      schedule.timezone
    );

    await this.prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: {
        lastRun: new Date(),
        lastStatus: status,
        lastError: error,
        nextRun,
        runCount: { increment: 1 },
      },
    });
  }

  /**
   * Get available report categories
   */
  getAvailableCategories(): Array<{ value: string; label: string }> {
    return [
      { value: 'performance', label: 'Performance' },
      { value: 'customer_satisfaction', label: 'Customer Satisfaction' },
      { value: 'efficiency', label: 'Efficiency' },
      { value: 'financial', label: 'Financial' },
      { value: 'team', label: 'Team Analytics' },
      { value: 'sla', label: 'SLA Compliance' },
      { value: 'channel', label: 'Channel Performance' },
      { value: 'product', label: 'Product Analytics' },
      { value: 'custom', label: 'Custom' },
    ];
  }

  /**
   * Get available metrics by category
   */
  getAvailableMetrics(category: string): MetricDefinition[] {
    const metricsMap: Record<string, MetricDefinition[]> = {
      performance: [
        {
          field: 'tickets.resolvedCount',
          aggregation: 'count',
          label: 'Tickets Resolved',
          format: 'number',
        },
        {
          field: 'tickets.avgResolutionTime',
          aggregation: 'avg',
          label: 'Avg Resolution Time',
          format: 'duration',
        },
        {
          field: 'tickets.firstResponseTime',
          aggregation: 'avg',
          label: 'Avg First Response Time',
          format: 'duration',
        },
      ],
      customer_satisfaction: [
        {
          field: 'surveys.csatScore',
          aggregation: 'avg',
          label: 'CSAT Score',
          format: 'percent',
        },
        {
          field: 'surveys.npsScore',
          aggregation: 'avg',
          label: 'NPS Score',
          format: 'number',
        },
      ],
      financial: [
        {
          field: 'deals.revenue',
          aggregation: 'sum',
          label: 'Total Revenue',
          format: 'currency',
        },
        {
          field: 'deals.avgDealValue',
          aggregation: 'avg',
          label: 'Avg Deal Value',
          format: 'currency',
        },
      ],
      // Add more categories as needed
    };

    return metricsMap[category] || [];
  }

  /**
   * Calculate next run time for a schedule
   */
  private calculateNextRun(
    frequency: string,
    dayOfWeek?: number | null,
    dayOfMonth?: number | null,
    time: string,
    timezone: string = 'UTC'
  ): Date {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);

    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    // If the scheduled time has already passed today, start from tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    switch (frequency) {
      case 'daily':
        // Already set to next occurrence
        break;

      case 'weekly':
        if (dayOfWeek !== null && dayOfWeek !== undefined) {
          while (nextRun.getDay() !== dayOfWeek) {
            nextRun.setDate(nextRun.getDate() + 1);
          }
        }
        break;

      case 'monthly':
        if (dayOfMonth !== null && dayOfMonth !== undefined) {
          nextRun.setDate(dayOfMonth);
          if (nextRun <= now) {
            nextRun.setMonth(nextRun.getMonth() + 1);
          }
        }
        break;

      case 'quarterly':
        // Set to first day of next quarter
        const currentMonth = nextRun.getMonth();
        const nextQuarterMonth = Math.ceil((currentMonth + 1) / 3) * 3;
        nextRun.setMonth(nextQuarterMonth);
        nextRun.setDate(1);
        break;
    }

    return nextRun;
  }
}

