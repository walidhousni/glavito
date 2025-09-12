/**
 * Analytics Service
 * Handles dashboard setup, KPI configuration, and automated reporting
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@glavito/shared-database';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface AnalyticsDashboard {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  isDefault: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gridSize: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'auto';
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'gauge' | 'progress' | 'text';
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: WidgetConfig;
  dataSource: DataSource;
  refreshInterval: number; // seconds
  isVisible: boolean;
}

export interface WidgetConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  format?: 'number' | 'percentage' | 'currency' | 'duration';
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface DataSource {
  type: 'metric' | 'query' | 'external';
  source: string;
  query?: string;
  parameters?: Record<string, any>;
  transformations?: DataTransformation[];
}

export interface DataTransformation {
  type: 'filter' | 'group' | 'sort' | 'calculate' | 'format';
  config: Record<string, any>;
}

export interface DashboardFilter {
  id: string;
  name: string;
  type: 'date' | 'select' | 'multiselect' | 'text' | 'number';
  field: string;
  defaultValue?: any;
  options?: FilterOption[];
  isRequired: boolean;
}

export interface FilterOption {
  label: string;
  value: any;
}

export interface KPIMetric {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  category: 'onboarding' | 'performance' | 'satisfaction' | 'efficiency' | 'growth';
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  unit: string;
  target?: number;
  threshold?: {
    warning: number;
    critical: number;
  };
  calculation: MetricCalculation;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetricCalculation {
  formula: string;
  dataSources: string[];
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'percentile';
  timeWindow: string;
  filters?: Record<string, any>;
}

export interface SatisfactionSurvey {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'nps' | 'csat' | 'ces' | 'custom';
  questions: SurveyQuestion[];
  triggers: SurveyTrigger[];
  settings: SurveySettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyQuestion {
  id: string;
  type: 'rating' | 'text' | 'choice' | 'multiChoice' | 'boolean';
  question: string;
  description?: string;
  required: boolean;
  options?: string[];
  scale?: {
    min: number;
    max: number;
    labels?: string[];
  };
  order: number;
}

export interface SurveyTrigger {
  type: 'time' | 'event' | 'manual';
  condition: string;
  delay?: number; // minutes
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
}

export interface SurveySettings {
  theme: 'light' | 'dark';
  branding: {
    logo?: string;
    colors?: {
      primary: string;
      secondary: string;
    };
  };
  notifications: {
    email: boolean;
    webhook?: string;
  };
  anonymization: boolean;
  responseLimit?: number;
}

export interface ReportSchedule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'dashboard' | 'metric' | 'survey' | 'custom';
  source: string; // dashboard ID, metric ID, etc.
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    time: string; // HH:mm format
    timezone: string;
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  recipients: ReportRecipient[];
  format: 'pdf' | 'excel' | 'csv' | 'json';
  filters?: Record<string, any>;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportRecipient {
  type: 'email' | 'webhook' | 'slack' | 'teams';
  address: string;
  name?: string;
}

export interface AnalyticsIntegration {
  id: string;
  tenantId: string;
  type: 'google_analytics' | 'mixpanel' | 'amplitude' | 'segment' | 'custom';
  name: string;
  config: IntegrationConfig;
  isActive: boolean;
  lastSync?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationConfig {
  apiKey?: string;
  trackingId?: string;
  projectId?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  mappings?: Record<string, string>;
  filters?: Record<string, any>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create analytics dashboard
   */
  async createDashboard(
    tenantId: string,
    userId: string,
    dashboardData: Partial<AnalyticsDashboard>
  ): Promise<AnalyticsDashboard> {
    try {
      this.logger.log(`Creating dashboard for tenant: ${tenantId}`);

      const dashboard: AnalyticsDashboard = {
        id: `dashboard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        name: dashboardData.name || 'New Dashboard',
        description: dashboardData.description,
        layout: dashboardData.layout || {
          columns: 12,
          rows: 8,
          gridSize: 'medium',
          theme: 'light',
        },
        widgets: dashboardData.widgets || [],
        filters: dashboardData.filters || [],
        isDefault: dashboardData.isDefault || false,
        isPublic: dashboardData.isPublic || false,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to database (placeholder)
      await this.saveDashboard(dashboard);

      this.eventEmitter.emit('analytics.dashboard.created', {
        tenantId,
        dashboardId: dashboard.id,
        userId,
      });

      this.logger.log(`Dashboard created successfully: ${dashboard.id}`);
      return dashboard;
    } catch (error) {
      this.logger.error(`Failed to create dashboard: ${error.message}`);
      throw new BadRequestException('Failed to create dashboard');
    }
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    tenantId: string,
    dashboardId: string,
    updates: Partial<AnalyticsDashboard>
  ): Promise<AnalyticsDashboard> {
    try {
      const dashboard = await this.getDashboard(tenantId, dashboardId);
      
      const updatedDashboard = {
        ...dashboard,
        ...updates,
        updatedAt: new Date(),
      };

      await this.saveDashboard(updatedDashboard);

      this.eventEmitter.emit('analytics.dashboard.updated', {
        tenantId,
        dashboardId,
        changes: Object.keys(updates),
      });

      return updatedDashboard;
    } catch (error) {
      this.logger.error(`Failed to update dashboard: ${error.message}`);
      throw new BadRequestException('Failed to update dashboard');
    }
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(tenantId: string, dashboardId: string): Promise<AnalyticsDashboard> {
    try {
      const dashboard = await this.loadDashboard(dashboardId);
      
      if (!dashboard || dashboard.tenantId !== tenantId) {
        throw new NotFoundException('Dashboard not found');
      }

      return dashboard;
    } catch (error) {
      this.logger.error(`Failed to get dashboard: ${error.message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to get dashboard');
    }
  }

  /**
   * Get dashboards for tenant
   */
  async getDashboards(tenantId: string): Promise<AnalyticsDashboard[]> {
    try {
      const rows = await (this.databaseService as any).analyticsDashboard.findMany({ where: { tenantId }, include: { widgets: { orderBy: { sortOrder: 'asc' } } }, orderBy: { updatedAt: 'desc' } })
      return rows.map((d: any) => ({
        id: d.id,
        tenantId: d.tenantId,
        name: d.name,
        description: d.description || undefined,
        layout: (d.layout || {}) as any,
        widgets: (d.widgets || []).map((w: any) => ({ id: w.id, type: w.type, title: w.title, position: w.position as any, size: (w.size || {}) as any, config: (w.configuration || {}) as any, dataSource: (w.dataSource || {}) as any, refreshInterval: w.refreshInterval || 0, isVisible: w.isVisible !== false })),
        filters: [],
        isDefault: d.isDefault,
        isPublic: d.isPublic,
        createdBy: d.createdById || 'system',
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      })) as any
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to get dashboards: ${msg}`);
      throw new BadRequestException('Failed to get dashboards');
    }
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(tenantId: string, dashboardId: string): Promise<void> {
    try {
      const dashboard = await this.getDashboard(tenantId, dashboardId);
      
      await this.removeDashboard(dashboardId);

      this.eventEmitter.emit('analytics.dashboard.deleted', {
        tenantId,
        dashboardId,
      });

      this.logger.log(`Dashboard deleted: ${dashboardId}`);
    } catch (error) {
      this.logger.error(`Failed to delete dashboard: ${error.message}`);
      throw new BadRequestException('Failed to delete dashboard');
    }
  }

  /**
   * Create KPI metric
   */
  async createKPIMetric(
    tenantId: string,
    metricData: Partial<KPIMetric>
  ): Promise<KPIMetric> {
    try {
      this.logger.log(`Creating KPI metric for tenant: ${tenantId}`);

      const metric: KPIMetric = {
        id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        name: metricData.name || 'New Metric',
        description: metricData.description || '',
        category: metricData.category || 'performance',
        type: metricData.type || 'gauge',
        unit: metricData.unit || 'count',
        target: metricData.target,
        threshold: metricData.threshold,
        calculation: metricData.calculation || {
          formula: 'COUNT(*)',
          dataSources: [],
          aggregation: 'count',
          timeWindow: '1d',
        },
        isActive: metricData.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.saveKPIMetric(metric);

      this.eventEmitter.emit('analytics.metric.created', {
        tenantId,
        metricId: metric.id,
      });

      return metric;
    } catch (error) {
      this.logger.error(`Failed to create KPI metric: ${error.message}`);
      throw new BadRequestException('Failed to create KPI metric');
    }
  }

  /**
   * Get KPI metrics
   */
  async getKPIMetrics(tenantId: string, category?: string): Promise<KPIMetric[]> {
    try {
      // In a real implementation, this would query the database
      const defaultMetrics: KPIMetric[] = [
        {
          id: 'onboarding-completion-rate',
          tenantId,
          name: 'Onboarding Completion Rate',
          description: 'Percentage of users who complete the onboarding process',
          category: 'onboarding',
          type: 'gauge',
          unit: 'percentage',
          target: 85,
          threshold: {
            warning: 70,
            critical: 50,
          },
          calculation: {
            formula: '(completed_onboardings / total_onboardings) * 100',
            dataSources: ['onboarding_sessions'],
            aggregation: 'avg',
            timeWindow: '7d',
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'time-to-value',
          tenantId,
          name: 'Time to Value',
          description: 'Average time for users to complete onboarding',
          category: 'efficiency',
          type: 'gauge',
          unit: 'minutes',
          target: 30,
          threshold: {
            warning: 45,
            critical: 60,
          },
          calculation: {
            formula: 'AVG(completion_time)',
            dataSources: ['onboarding_sessions'],
            aggregation: 'avg',
            timeWindow: '7d',
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user-satisfaction',
          tenantId,
          name: 'User Satisfaction Score',
          description: 'Average satisfaction rating from onboarding surveys',
          category: 'satisfaction',
          type: 'gauge',
          unit: 'rating',
          target: 4.5,
          threshold: {
            warning: 4.0,
            critical: 3.5,
          },
          calculation: {
            formula: 'AVG(satisfaction_rating)',
            dataSources: ['survey_responses'],
            aggregation: 'avg',
            timeWindow: '30d',
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      return category 
        ? defaultMetrics.filter(m => m.category === category)
        : defaultMetrics;
    } catch (error) {
      this.logger.error(`Failed to get KPI metrics: ${error.message}`);
      throw new BadRequestException('Failed to get KPI metrics');
    }
  }

  /**
   * Create satisfaction survey
   */
  async createSatisfactionSurvey(
    tenantId: string,
    surveyData: Partial<SatisfactionSurvey>
  ): Promise<SatisfactionSurvey> {
    try {
      this.logger.log(`Creating satisfaction survey for tenant: ${tenantId}`);

      const survey: SatisfactionSurvey = {
        id: `survey-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        name: surveyData.name || 'Onboarding Satisfaction Survey',
        description: surveyData.description,
        type: surveyData.type || 'csat',
        questions: surveyData.questions || this.getDefaultSurveyQuestions(surveyData.type || 'csat'),
        triggers: surveyData.triggers || [
          {
            type: 'event',
            condition: 'onboarding_completed',
            delay: 5, // 5 minutes after completion
          },
        ],
        settings: surveyData.settings || {
          theme: 'light',
          branding: {
            colors: {
              primary: '#3b82f6',
              secondary: '#64748b',
            },
          },
          notifications: {
            email: true,
          },
          anonymization: false,
        },
        isActive: surveyData.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.saveSatisfactionSurvey(survey);

      this.eventEmitter.emit('analytics.survey.created', {
        tenantId,
        surveyId: survey.id,
      });

      return survey;
    } catch (error) {
      this.logger.error(`Failed to create satisfaction survey: ${error.message}`);
      throw new BadRequestException('Failed to create satisfaction survey');
    }
  }

  /**
   * Get satisfaction surveys
   */
  async getSatisfactionSurveys(tenantId: string): Promise<SatisfactionSurvey[]> {
    try {
      // In a real implementation, this would query the database
      return [];
    } catch (error) {
      this.logger.error(`Failed to get satisfaction surveys: ${error.message}`);
      throw new BadRequestException('Failed to get satisfaction surveys');
    }
  }

  /**
   * Create report schedule
   */
  async createReportSchedule(
    tenantId: string,
    scheduleData: Partial<ReportSchedule>
  ): Promise<ReportSchedule> {
    try {
      this.logger.log(`Creating report schedule for tenant: ${tenantId}`);

      const schedule: ReportSchedule = {
        id: `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        name: scheduleData.name || 'Weekly Analytics Report',
        description: scheduleData.description,
        type: scheduleData.type || 'dashboard',
        source: scheduleData.source || '',
        schedule: scheduleData.schedule || {
          frequency: 'weekly',
          time: '09:00',
          timezone: 'UTC',
          dayOfWeek: 1, // Monday
        },
        recipients: scheduleData.recipients || [],
        format: scheduleData.format || 'pdf',
        filters: scheduleData.filters,
        isActive: scheduleData.isActive !== false,
        nextRun: this.calculateNextRun(scheduleData.schedule || {
          frequency: 'weekly',
          time: '09:00',
          timezone: 'UTC',
          dayOfWeek: 1,
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.saveReportSchedule(schedule);

      this.eventEmitter.emit('analytics.schedule.created', {
        tenantId,
        scheduleId: schedule.id,
      });

      return schedule;
    } catch (error) {
      this.logger.error(`Failed to create report schedule: ${error.message}`);
      throw new BadRequestException('Failed to create report schedule');
    }
  }

  /**
   * Setup analytics integration
   */
  async setupAnalyticsIntegration(
    tenantId: string,
    integrationData: Partial<AnalyticsIntegration>
  ): Promise<AnalyticsIntegration> {
    try {
      this.logger.log(`Setting up analytics integration for tenant: ${tenantId}`);

      const integration: AnalyticsIntegration = {
        id: `integration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        type: integrationData.type || 'google_analytics',
        name: integrationData.name || 'Analytics Integration',
        config: integrationData.config || {},
        isActive: integrationData.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Test integration
      await this.testAnalyticsIntegration(integration);

      await this.saveAnalyticsIntegration(integration);

      this.eventEmitter.emit('analytics.integration.created', {
        tenantId,
        integrationId: integration.id,
        type: integration.type,
      });

      return integration;
    } catch (error) {
      this.logger.error(`Failed to setup analytics integration: ${error.message}`);
      throw new BadRequestException('Failed to setup analytics integration');
    }
  }

  /**
   * Generate analytics report
   */
  async generateReport(
    tenantId: string,
    reportType: 'dashboard' | 'metric' | 'survey',
    sourceId: string,
    format: 'pdf' | 'excel' | 'csv' | 'json' = 'pdf'
  ): Promise<Buffer> {
    try {
      this.logger.log(`Generating ${reportType} report for tenant: ${tenantId}`);

      // Get data based on report type
      let data: any;
      switch (reportType) {
        case 'dashboard':
          data = await this.getDashboardData(tenantId, sourceId);
          break;
        case 'metric':
          data = await this.getMetricData(tenantId, sourceId);
          break;
        case 'survey':
          data = await this.getSurveyData(tenantId, sourceId);
          break;
        default:
          throw new BadRequestException('Invalid report type');
      }

      // Generate report in requested format
      const report = await this.formatReport(data, format);

      this.eventEmitter.emit('analytics.report.generated', {
        tenantId,
        reportType,
        sourceId,
        format,
      });

      return report;
    } catch (error) {
      this.logger.error(`Failed to generate report: ${error.message}`);
      throw new BadRequestException('Failed to generate report');
    }
  }

  /**
   * Get analytics insights
   */
  async getAnalyticsInsights(tenantId: string): Promise<any> {
    try {
      const insights = {
        onboardingMetrics: {
          completionRate: 78.5,
          averageTime: 32, // minutes
          dropOffPoints: [
            { step: 'Channel Configuration', dropOffRate: 15.2 },
            { step: 'Team Setup', dropOffRate: 8.7 },
            { step: 'Payment Setup', dropOffRate: 12.1 },
          ],
        },
        userEngagement: {
          dailyActiveUsers: 145,
          weeklyActiveUsers: 892,
          monthlyActiveUsers: 2341,
          sessionDuration: 18.5, // minutes
        },
        satisfactionScores: {
          overall: 4.2,
          nps: 67,
          csat: 4.1,
          ces: 3.8,
        },
        trends: {
          completionRate: { trend: 'up', change: 5.2 },
          satisfactionScore: { trend: 'stable', change: 0.1 },
          timeToValue: { trend: 'down', change: -3.1 },
        },
        recommendations: [
          {
            type: 'improvement',
            priority: 'high',
            title: 'Optimize Channel Configuration Step',
            description: 'This step has the highest drop-off rate. Consider simplifying the UI or adding more guidance.',
            impact: 'Could improve completion rate by 8-12%',
          },
          {
            type: 'opportunity',
            priority: 'medium',
            title: 'Implement Progressive Onboarding',
            description: 'Break down complex steps into smaller, manageable tasks.',
            impact: 'Could reduce average completion time by 15-20%',
          },
        ],
      };

      return insights;
    } catch (error) {
      this.logger.error(`Failed to get analytics insights: ${error.message}`);
      throw new BadRequestException('Failed to get analytics insights');
    }
  }

  /**
   * Run scheduled reports
   */
  @Cron(CronExpression.EVERY_HOUR)
  async runScheduledReports(): Promise<void> {
    try {
      this.logger.debug('Running scheduled reports check');

      // Get all active schedules that are due
      const dueSchedules = await this.getDueReportSchedules();

      for (const schedule of dueSchedules) {
        try {
          await this.executeReportSchedule(schedule);
        } catch (error) {
          this.logger.error(`Failed to execute report schedule ${schedule.id}: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to run scheduled reports: ${error.message}`);
    }
  }

  // Private helper methods

  private getDefaultSurveyQuestions(type: string): SurveyQuestion[] {
    switch (type) {
      case 'nps':
        return [
          {
            id: 'nps-score',
            type: 'rating',
            question: 'How likely are you to recommend our onboarding process to a colleague?',
            required: true,
            scale: { min: 0, max: 10, labels: ['Not at all likely', 'Extremely likely'] },
            order: 1,
          },
          {
            id: 'nps-reason',
            type: 'text',
            question: 'What is the primary reason for your score?',
            required: false,
            order: 2,
          },
        ];
      case 'csat':
        return [
          {
            id: 'satisfaction',
            type: 'rating',
            question: 'How satisfied are you with the onboarding experience?',
            required: true,
            scale: { min: 1, max: 5, labels: ['Very dissatisfied', 'Very satisfied'] },
            order: 1,
          },
          {
            id: 'feedback',
            type: 'text',
            question: 'What could we improve about the onboarding process?',
            required: false,
            order: 2,
          },
        ];
      case 'ces':
        return [
          {
            id: 'effort',
            type: 'rating',
            question: 'How easy was it to complete the onboarding process?',
            required: true,
            scale: { min: 1, max: 7, labels: ['Very difficult', 'Very easy'] },
            order: 1,
          },
        ];
      default:
        return [];
    }
  }

  private calculateNextRun(schedule: ReportSchedule['schedule']): Date {
    const now = new Date();
    const nextRun = new Date();

    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1);
        break;
      case 'weekly': {
        const daysUntilNext = (schedule.dayOfWeek! - now.getDay() + 7) % 7;
        nextRun.setDate(now.getDate() + (daysUntilNext || 7));
        break;
      }
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1);
        nextRun.setDate(schedule.dayOfMonth || 1);
        break;
      case 'quarterly':
        nextRun.setMonth(now.getMonth() + 3);
        nextRun.setDate(1);
        break;
    }

    const [hours, minutes] = schedule.time.split(':');
    nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    return nextRun;
  }

  private async testAnalyticsIntegration(integration: AnalyticsIntegration): Promise<void> {
    // Test the integration based on type
    switch (integration.type) {
      case 'google_analytics':
        await this.testGoogleAnalyticsIntegration(integration.config);
        break;
      case 'mixpanel':
        await this.testMixpanelIntegration(integration.config);
        break;
      // Add other integration tests
    }
  }

  private async testGoogleAnalyticsIntegration(config: IntegrationConfig): Promise<void> {
    if (!config.trackingId) {
      throw new BadRequestException('Google Analytics tracking ID is required');
    }
    // Test GA integration
  }

  private async testMixpanelIntegration(config: IntegrationConfig): Promise<void> {
    if (!config.projectId || !config.apiKey) {
      throw new BadRequestException('Mixpanel project ID and API key are required');
    }
    // Test Mixpanel integration
  }

  private async getDashboardData(tenantId: string, dashboardId: string): Promise<any> {
    // Get dashboard data for report generation
    return {};
  }

  private async getMetricData(tenantId: string, metricId: string): Promise<any> {
    // Get metric data for report generation
    return {};
  }

  private async getSurveyData(tenantId: string, surveyId: string): Promise<any> {
    // Get survey data for report generation
    return {};
  }

  private async formatReport(data: any, format: string): Promise<Buffer> {
    // Format report based on requested format
    switch (format) {
      case 'pdf':
        return this.generatePDFReport(data);
      case 'excel':
        return this.generateExcelReport(data);
      case 'csv':
        return this.generateCSVReport(data);
      case 'json':
        return Buffer.from(JSON.stringify(data, null, 2));
      default:
        throw new BadRequestException('Unsupported report format');
    }
  }

  private async generatePDFReport(data: any): Promise<Buffer> {
    // Generate PDF report
    return Buffer.from('PDF report placeholder');
  }

  private async generateExcelReport(data: any): Promise<Buffer> {
    // Generate Excel report
    return Buffer.from('Excel report placeholder');
  }

  private async generateCSVReport(data: any): Promise<Buffer> {
    // Generate CSV report
    return Buffer.from('CSV report placeholder');
  }

  private async getDueReportSchedules(): Promise<ReportSchedule[]> {
    // Get report schedules that are due to run
    return [];
  }

  private async executeReportSchedule(schedule: ReportSchedule): Promise<void> {
    try {
      // Generate report
      const report = await this.generateReport(
        schedule.tenantId,
        schedule.type as any,
        schedule.source,
        schedule.format
      );

      // Send to recipients
      for (const recipient of schedule.recipients) {
        await this.sendReport(recipient, report, schedule);
      }

      // Update schedule
      schedule.lastRun = new Date();
      schedule.nextRun = this.calculateNextRun(schedule.schedule);
      await this.saveReportSchedule(schedule);

    } catch (error) {
      this.logger.error(`Failed to execute report schedule: ${error.message}`);
    }
  }

  private async sendReport(
    recipient: ReportRecipient,
    report: Buffer,
    schedule: ReportSchedule
  ): Promise<void> {
    switch (recipient.type) {
      case 'email':
        await this.sendEmailReport(recipient.address, report, schedule);
        break;
      case 'webhook':
        await this.sendWebhookReport(recipient.address, report, schedule);
        break;
      case 'slack':
        await this.sendSlackReport(recipient.address, report, schedule);
        break;
      case 'teams':
        await this.sendTeamsReport(recipient.address, report, schedule);
        break;
    }
  }

  private async sendEmailReport(email: string, report: Buffer, schedule: ReportSchedule): Promise<void> {
    // Send email with report attachment
    this.eventEmitter.emit('notification.send', {
      type: 'email',
      to: email,
      subject: `${schedule.name} - ${new Date().toLocaleDateString()}`,
      body: `Please find attached your scheduled ${schedule.name} report.`,
      attachments: [
        {
          filename: `${schedule.name}.${schedule.format}`,
          content: report,
        },
      ],
    });
  }

  private async sendWebhookReport(url: string, report: Buffer, schedule: ReportSchedule): Promise<void> {
    // Send report via webhook
    await this.httpService.post(url, {
      schedule: schedule.name,
      format: schedule.format,
      data: report.toString('base64'),
    }).toPromise();
  }

  private async sendSlackReport(webhook: string, report: Buffer, schedule: ReportSchedule): Promise<void> {
    // Send report to Slack
    await this.httpService.post(webhook, {
      text: `📊 Your scheduled report "${schedule.name}" is ready!`,
      attachments: [
        {
          title: schedule.name,
          text: `Generated on ${new Date().toLocaleDateString()}`,
          color: 'good',
        },
      ],
    }).toPromise();
  }

  private async sendTeamsReport(webhook: string, report: Buffer, schedule: ReportSchedule): Promise<void> {
    // Send report to Microsoft Teams
    await this.httpService.post(webhook, {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary: `Report: ${schedule.name}`,
      themeColor: '0076D7',
      sections: [
        {
          activityTitle: `📊 ${schedule.name}`,
          activitySubtitle: `Generated on ${new Date().toLocaleDateString()}`,
          text: 'Your scheduled analytics report is ready for review.',
        },
      ],
    }).toPromise();
  }

  // Database operations (placeholders)
  private async saveDashboard(dashboard: AnalyticsDashboard): Promise<void> {
    const db = this.databaseService as any
    const saved = await db.analyticsDashboard.upsert({
      where: { id: dashboard.id },
      create: {
        id: dashboard.id,
        tenantId: dashboard.tenantId,
        name: dashboard.name,
        description: dashboard.description || null,
        layout: (dashboard.layout || {}) as any,
        isDefault: dashboard.isDefault || false,
        isPublic: dashboard.isPublic || false,
        createdById: dashboard.createdBy || null,
      },
      update: {
        name: dashboard.name,
        description: dashboard.description || null,
        layout: (dashboard.layout || {}) as any,
        isDefault: dashboard.isDefault || false,
        isPublic: dashboard.isPublic || false,
      },
    })

    // Replace widgets for simplicity
    await db.analyticsDashboardWidget.deleteMany({ where: { dashboardId: saved.id } })
    const widgets = (dashboard.widgets || [])
    for (let idx = 0; idx < widgets.length; idx++) {
      const w = widgets[idx] as any
      await db.analyticsDashboardWidget.create({
        data: {
          dashboardId: saved.id,
          type: w.type,
          title: w.title,
          position: (w.position || {}) as any,
          size: (w.size || {}) as any,
          configuration: (w.config || w.configuration || {}) as any,
          dataSource: (w.dataSource || {}) as any,
          refreshInterval: w.refreshInterval || null,
          isVisible: w.isVisible !== false,
          sortOrder: typeof w.sortOrder === 'number' ? w.sortOrder : idx,
        },
      })
    }
  }

  private async loadDashboard(dashboardId: string): Promise<AnalyticsDashboard | null> {
    const db = this.databaseService as any
    const d = await db.analyticsDashboard.findUnique({
      where: { id: dashboardId },
      include: { widgets: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!d) return null
    return {
      id: d.id,
      tenantId: d.tenantId,
      name: d.name,
      description: d.description || undefined,
      layout: (d.layout || {}) as any,
      widgets: (d.widgets || []).map((w: any) => ({
        id: w.id,
        type: w.type,
        title: w.title,
        position: (w.position || {}) as any,
        size: (w.size || {}) as any,
        config: (w.configuration || {}) as any,
        dataSource: (w.dataSource || {}) as any,
        refreshInterval: w.refreshInterval || 0,
        isVisible: w.isVisible !== false,
      })),
      filters: [],
      isDefault: d.isDefault,
      isPublic: d.isPublic,
      createdBy: d.createdById || 'system',
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    } as any
  }

  private async removeDashboard(dashboardId: string): Promise<void> {
    const db = this.databaseService as any
    await db.analyticsDashboard.delete({ where: { id: dashboardId } })
  }

  private async saveKPIMetric(metric: KPIMetric): Promise<void> {
    // Save KPI metric to database
  }

  private async saveSatisfactionSurvey(survey: SatisfactionSurvey): Promise<void> {
    // Save satisfaction survey to database
  }

  private async saveReportSchedule(schedule: ReportSchedule): Promise<void> {
    const db = this.databaseService as any
    // Persist as an export job template (basic scheduling placeholder)
    await db.analyticsExportJob.create({
      data: {
        tenantId: 'unknown',
        type: schedule.type || 'dashboard',
        sourceId: schedule.source || null,
        templateId: null,
        format: schedule.format || 'pdf',
        status: 'pending',
      },
    })
  }

  private async saveAnalyticsIntegration(integration: AnalyticsIntegration): Promise<void> {
    // Save analytics integration to database
  }
}