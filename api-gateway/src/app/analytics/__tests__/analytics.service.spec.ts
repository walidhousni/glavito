/**
 * Analytics Service Tests
 * Unit tests for analytics dashboard, KPI, and reporting functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AnalyticsService, AnalyticsDashboard, KPIMetric, SatisfactionSurvey } from '../analytics.service';
import { DatabaseService } from '@glavito/shared-database';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let databaseService: jest.Mocked<DatabaseService>;
  let configService: jest.Mocked<ConfigService>;
  let httpService: jest.Mocked<HttpService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  beforeEach(async () => {
    const mockDatabaseService = {
      // Add any database methods that would be used
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
      toPromise: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    databaseService = module.get(DatabaseService);
    configService = module.get(ConfigService);
    httpService = module.get(HttpService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDashboard', () => {
    it('should create dashboard successfully', async () => {
      const dashboardData: Partial<AnalyticsDashboard> = {
        name: 'Test Dashboard',
        description: 'Test dashboard description',
        layout: {
          columns: 12,
          rows: 8,
          gridSize: 'medium',
          theme: 'light',
        },
        widgets: [],
        filters: [],
      };

      jest.spyOn(service as any, 'saveDashboard').mockResolvedValue(undefined);

      const result = await service.createDashboard(mockTenantId, mockUserId, dashboardData);

      expect(result).toBeDefined();
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.name).toBe(dashboardData.name);
      expect(result.description).toBe(dashboardData.description);
      expect(result.createdBy).toBe(mockUserId);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);

      expect(eventEmitter.emit).toHaveBeenCalledWith('analytics.dashboard.created', {
        tenantId: mockTenantId,
        dashboardId: result.id,
        userId: mockUserId,
      });
    });

    it('should create dashboard with default values', async () => {
      jest.spyOn(service as any, 'saveDashboard').mockResolvedValue(undefined);

      const result = await service.createDashboard(mockTenantId, mockUserId, {});

      expect(result.name).toBe('New Dashboard');
      expect(result.layout).toEqual({
        columns: 12,
        rows: 8,
        gridSize: 'medium',
        theme: 'light',
      });
      expect(result.widgets).toEqual([]);
      expect(result.filters).toEqual([]);
      expect(result.isDefault).toBe(false);
      expect(result.isPublic).toBe(false);
    });

    it('should handle dashboard creation error', async () => {
      jest.spyOn(service as any, 'saveDashboard').mockRejectedValue(new Error('Database error'));

      await expect(
        service.createDashboard(mockTenantId, mockUserId, { name: 'Test Dashboard' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateDashboard', () => {
    const mockDashboard: AnalyticsDashboard = {
      id: 'dashboard-123',
      tenantId: mockTenantId,
      name: 'Original Dashboard',
      layout: {
        columns: 12,
        rows: 8,
        gridSize: 'medium',
        theme: 'light',
      },
      widgets: [],
      filters: [],
      isDefault: false,
      isPublic: false,
      createdBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update dashboard successfully', async () => {
      const updates = {
        name: 'Updated Dashboard',
        description: 'Updated description',
      };

      jest.spyOn(service, 'getDashboard').mockResolvedValue(mockDashboard);
      jest.spyOn(service as any, 'saveDashboard').mockResolvedValue(undefined);

      const result = await service.updateDashboard(mockTenantId, 'dashboard-123', updates);

      expect(result.name).toBe(updates.name);
      expect(result.description).toBe(updates.description);
      expect(result.updatedAt).toBeInstanceOf(Date);

      expect(eventEmitter.emit).toHaveBeenCalledWith('analytics.dashboard.updated', {
        tenantId: mockTenantId,
        dashboardId: 'dashboard-123',
        changes: ['name', 'description'],
      });
    });

    it('should handle dashboard not found', async () => {
      jest.spyOn(service, 'getDashboard').mockRejectedValue(new NotFoundException('Dashboard not found'));

      await expect(
        service.updateDashboard(mockTenantId, 'non-existent', { name: 'Updated' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard successfully', async () => {
      const mockDashboard: AnalyticsDashboard = {
        id: 'dashboard-123',
        tenantId: mockTenantId,
        name: 'Test Dashboard',
        layout: {
          columns: 12,
          rows: 8,
          gridSize: 'medium',
          theme: 'light',
        },
        widgets: [],
        filters: [],
        isDefault: false,
        isPublic: false,
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service as any, 'loadDashboard').mockResolvedValue(mockDashboard);

      const result = await service.getDashboard(mockTenantId, 'dashboard-123');

      expect(result).toEqual(mockDashboard);
    });

    it('should throw error for non-existent dashboard', async () => {
      jest.spyOn(service as any, 'loadDashboard').mockResolvedValue(null);

      await expect(
        service.getDashboard(mockTenantId, 'non-existent')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error for dashboard from different tenant', async () => {
      const mockDashboard = {
        id: 'dashboard-123',
        tenantId: 'different-tenant',
        name: 'Test Dashboard',
      };

      jest.spyOn(service as any, 'loadDashboard').mockResolvedValue(mockDashboard);

      await expect(
        service.getDashboard(mockTenantId, 'dashboard-123')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDashboard', () => {
    const mockDashboard: AnalyticsDashboard = {
      id: 'dashboard-123',
      tenantId: mockTenantId,
      name: 'Test Dashboard',
      layout: {
        columns: 12,
        rows: 8,
        gridSize: 'medium',
        theme: 'light',
      },
      widgets: [],
      filters: [],
      isDefault: false,
      isPublic: false,
      createdBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should delete dashboard successfully', async () => {
      jest.spyOn(service, 'getDashboard').mockResolvedValue(mockDashboard);
      jest.spyOn(service as any, 'removeDashboard').mockResolvedValue(undefined);

      await service.deleteDashboard(mockTenantId, 'dashboard-123');

      expect(service as any).toHaveProperty('removeDashboard');
      expect(eventEmitter.emit).toHaveBeenCalledWith('analytics.dashboard.deleted', {
        tenantId: mockTenantId,
        dashboardId: 'dashboard-123',
      });
    });

    it('should handle dashboard not found during deletion', async () => {
      jest.spyOn(service, 'getDashboard').mockRejectedValue(new NotFoundException('Dashboard not found'));

      await expect(
        service.deleteDashboard(mockTenantId, 'non-existent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createKPIMetric', () => {
    it('should create KPI metric successfully', async () => {
      const metricData: Partial<KPIMetric> = {
        name: 'Test Metric',
        description: 'Test metric description',
        category: 'performance',
        type: 'gauge',
        unit: 'percentage',
        target: 85,
        threshold: {
          warning: 70,
          critical: 50,
        },
      };

      jest.spyOn(service as any, 'saveKPIMetric').mockResolvedValue(undefined);

      const result = await service.createKPIMetric(mockTenantId, metricData);

      expect(result).toBeDefined();
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.name).toBe(metricData.name);
      expect(result.description).toBe(metricData.description);
      expect(result.category).toBe(metricData.category);
      expect(result.type).toBe(metricData.type);
      expect(result.unit).toBe(metricData.unit);
      expect(result.target).toBe(metricData.target);
      expect(result.threshold).toEqual(metricData.threshold);
      expect(result.isActive).toBe(true);

      expect(eventEmitter.emit).toHaveBeenCalledWith('analytics.metric.created', {
        tenantId: mockTenantId,
        metricId: result.id,
      });
    });

    it('should create KPI metric with default values', async () => {
      jest.spyOn(service as any, 'saveKPIMetric').mockResolvedValue(undefined);

      const result = await service.createKPIMetric(mockTenantId, {});

      expect(result.name).toBe('New Metric');
      expect(result.description).toBe('');
      expect(result.category).toBe('performance');
      expect(result.type).toBe('gauge');
      expect(result.unit).toBe('count');
      expect(result.isActive).toBe(true);
      expect(result.calculation).toEqual({
        formula: 'COUNT(*)',
        dataSources: [],
        aggregation: 'count',
        timeWindow: '1d',
      });
    });
  });

  describe('getKPIMetrics', () => {
    it('should return all KPI metrics', async () => {
      const result = await service.getKPIMetrics(mockTenantId);

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Onboarding Completion Rate');
      expect(result[1].name).toBe('Time to Value');
      expect(result[2].name).toBe('User Satisfaction Score');
    });

    it('should return filtered KPI metrics by category', async () => {
      const result = await service.getKPIMetrics(mockTenantId, 'onboarding');

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('onboarding');
      expect(result[0].name).toBe('Onboarding Completion Rate');
    });

    it('should return empty array for non-existent category', async () => {
      const result = await service.getKPIMetrics(mockTenantId, 'non-existent');

      expect(result).toHaveLength(0);
    });
  });

  describe('createSatisfactionSurvey', () => {
    it('should create satisfaction survey successfully', async () => {
      const surveyData: Partial<SatisfactionSurvey> = {
        name: 'Test Survey',
        description: 'Test survey description',
        type: 'nps',
      };

      jest.spyOn(service as any, 'saveSatisfactionSurvey').mockResolvedValue(undefined);

      const result = await service.createSatisfactionSurvey(mockTenantId, surveyData);

      expect(result).toBeDefined();
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.name).toBe(surveyData.name);
      expect(result.description).toBe(surveyData.description);
      expect(result.type).toBe(surveyData.type);
      expect(result.isActive).toBe(true);
      expect(result.questions).toHaveLength(2); // Default NPS questions
      expect(result.triggers).toHaveLength(1);

      expect(eventEmitter.emit).toHaveBeenCalledWith('analytics.survey.created', {
        tenantId: mockTenantId,
        surveyId: result.id,
      });
    });

    it('should create survey with default values', async () => {
      jest.spyOn(service as any, 'saveSatisfactionSurvey').mockResolvedValue(undefined);

      const result = await service.createSatisfactionSurvey(mockTenantId, {});

      expect(result.name).toBe('Onboarding Satisfaction Survey');
      expect(result.type).toBe('csat');
      expect(result.isActive).toBe(true);
      expect(result.settings.theme).toBe('light');
      expect(result.settings.notifications.email).toBe(true);
      expect(result.settings.anonymization).toBe(false);
    });
  });

  describe('createReportSchedule', () => {
    it('should create report schedule successfully', async () => {
      const scheduleData = {
        name: 'Weekly Report',
        description: 'Weekly analytics report',
        type: 'dashboard' as const,
        source: 'dashboard-123',
        recipients: [
          { type: 'email' as const, address: 'admin@example.com', name: 'Admin' },
        ],
        format: 'pdf' as const,
      };

      jest.spyOn(service as any, 'saveReportSchedule').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'calculateNextRun').mockReturnValue(new Date());

      const result = await service.createReportSchedule(mockTenantId, scheduleData);

      expect(result).toBeDefined();
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.name).toBe(scheduleData.name);
      expect(result.type).toBe(scheduleData.type);
      expect(result.source).toBe(scheduleData.source);
      expect(result.recipients).toEqual(scheduleData.recipients);
      expect(result.format).toBe(scheduleData.format);
      expect(result.isActive).toBe(true);

      expect(eventEmitter.emit).toHaveBeenCalledWith('analytics.schedule.created', {
        tenantId: mockTenantId,
        scheduleId: result.id,
      });
    });

    it('should create schedule with default values', async () => {
      jest.spyOn(service as any, 'saveReportSchedule').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'calculateNextRun').mockReturnValue(new Date());

      const result = await service.createReportSchedule(mockTenantId, {});

      expect(result.name).toBe('Weekly Analytics Report');
      expect(result.type).toBe('dashboard');
      expect(result.format).toBe('pdf');
      expect(result.schedule.frequency).toBe('weekly');
      expect(result.schedule.time).toBe('09:00');
      expect(result.schedule.timezone).toBe('UTC');
      expect(result.schedule.dayOfWeek).toBe(1);
    });
  });

  describe('setupAnalyticsIntegration', () => {
    it('should setup Google Analytics integration successfully', async () => {
      const integrationData = {
        type: 'google_analytics' as const,
        name: 'GA Integration',
        config: {
          trackingId: 'UA-123456789-1',
        },
      };

      jest.spyOn(service as any, 'testAnalyticsIntegration').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'saveAnalyticsIntegration').mockResolvedValue(undefined);

      const result = await service.setupAnalyticsIntegration(mockTenantId, integrationData);

      expect(result).toBeDefined();
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.type).toBe(integrationData.type);
      expect(result.name).toBe(integrationData.name);
      expect(result.config).toEqual(integrationData.config);
      expect(result.isActive).toBe(true);

      expect(eventEmitter.emit).toHaveBeenCalledWith('analytics.integration.created', {
        tenantId: mockTenantId,
        integrationId: result.id,
        type: result.type,
      });
    });

    it('should handle integration test failure', async () => {
      const integrationData = {
        type: 'google_analytics' as const,
        config: {
          trackingId: 'invalid-id',
        },
      };

      jest.spyOn(service as any, 'testAnalyticsIntegration').mockRejectedValue(
        new BadRequestException('Invalid tracking ID')
      );

      await expect(
        service.setupAnalyticsIntegration(mockTenantId, integrationData)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateReport', () => {
    it('should generate dashboard report successfully', async () => {
      const mockData = { dashboard: 'data' };
      const mockReport = Buffer.from('PDF report content');

      jest.spyOn(service as any, 'getDashboardData').mockResolvedValue(mockData);
      jest.spyOn(service as any, 'formatReport').mockResolvedValue(mockReport);

      const result = await service.generateReport(mockTenantId, 'dashboard', 'dashboard-123', 'pdf');

      expect(result).toEqual(mockReport);
      expect(eventEmitter.emit).toHaveBeenCalledWith('analytics.report.generated', {
        tenantId: mockTenantId,
        reportType: 'dashboard',
        sourceId: 'dashboard-123',
        format: 'pdf',
      });
    });

    it('should generate metric report successfully', async () => {
      const mockData = { metric: 'data' };
      const mockReport = Buffer.from('Excel report content');

      jest.spyOn(service as any, 'getMetricData').mockResolvedValue(mockData);
      jest.spyOn(service as any, 'formatReport').mockResolvedValue(mockReport);

      const result = await service.generateReport(mockTenantId, 'metric', 'metric-123', 'excel');

      expect(result).toEqual(mockReport);
    });

    it('should generate survey report successfully', async () => {
      const mockData = { survey: 'data' };
      const mockReport = Buffer.from('CSV report content');

      jest.spyOn(service as any, 'getSurveyData').mockResolvedValue(mockData);
      jest.spyOn(service as any, 'formatReport').mockResolvedValue(mockReport);

      const result = await service.generateReport(mockTenantId, 'survey', 'survey-123', 'csv');

      expect(result).toEqual(mockReport);
    });

    it('should handle invalid report type', async () => {
      await expect(
        service.generateReport(mockTenantId, 'invalid' as any, 'source-123')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAnalyticsInsights', () => {
    it('should return analytics insights successfully', async () => {
      const result = await service.getAnalyticsInsights(mockTenantId);

      expect(result).toBeDefined();
      expect(result.onboardingMetrics).toBeDefined();
      expect(result.onboardingMetrics.completionRate).toBe(78.5);
      expect(result.onboardingMetrics.averageTime).toBe(32);
      expect(result.onboardingMetrics.dropOffPoints).toHaveLength(3);

      expect(result.userEngagement).toBeDefined();
      expect(result.userEngagement.dailyActiveUsers).toBe(145);

      expect(result.satisfactionScores).toBeDefined();
      expect(result.satisfactionScores.overall).toBe(4.2);

      expect(result.trends).toBeDefined();
      expect(result.trends.completionRate.trend).toBe('up');

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0].priority).toBe('high');
    });
  });

  describe('helper methods', () => {
    describe('getDefaultSurveyQuestions', () => {
      it('should return NPS questions', () => {
        const questions = (service as any).getDefaultSurveyQuestions('nps');

        expect(questions).toHaveLength(2);
        expect(questions[0].type).toBe('rating');
        expect(questions[0].scale.min).toBe(0);
        expect(questions[0].scale.max).toBe(10);
        expect(questions[1].type).toBe('text');
      });

      it('should return CSAT questions', () => {
        const questions = (service as any).getDefaultSurveyQuestions('csat');

        expect(questions).toHaveLength(2);
        expect(questions[0].type).toBe('rating');
        expect(questions[0].scale.min).toBe(1);
        expect(questions[0].scale.max).toBe(5);
      });

      it('should return CES questions', () => {
        const questions = (service as any).getDefaultSurveyQuestions('ces');

        expect(questions).toHaveLength(1);
        expect(questions[0].type).toBe('rating');
        expect(questions[0].scale.min).toBe(1);
        expect(questions[0].scale.max).toBe(7);
      });

      it('should return empty array for unknown type', () => {
        const questions = (service as any).getDefaultSurveyQuestions('unknown');

        expect(questions).toHaveLength(0);
      });
    });

    describe('calculateNextRun', () => {
      it('should calculate next daily run', () => {
        const schedule = {
          frequency: 'daily' as const,
          time: '09:00',
          timezone: 'UTC',
        };

        const nextRun = (service as any).calculateNextRun(schedule);

        expect(nextRun).toBeInstanceOf(Date);
        expect(nextRun.getHours()).toBe(9);
        expect(nextRun.getMinutes()).toBe(0);
      });

      it('should calculate next weekly run', () => {
        const schedule = {
          frequency: 'weekly' as const,
          time: '10:30',
          timezone: 'UTC',
          dayOfWeek: 1, // Monday
        };

        const nextRun = (service as any).calculateNextRun(schedule);

        expect(nextRun).toBeInstanceOf(Date);
        expect(nextRun.getHours()).toBe(10);
        expect(nextRun.getMinutes()).toBe(30);
      });

      it('should calculate next monthly run', () => {
        const schedule = {
          frequency: 'monthly' as const,
          time: '08:00',
          timezone: 'UTC',
          dayOfMonth: 15,
        };

        const nextRun = (service as any).calculateNextRun(schedule);

        expect(nextRun).toBeInstanceOf(Date);
        expect(nextRun.getDate()).toBe(15);
        expect(nextRun.getHours()).toBe(8);
        expect(nextRun.getMinutes()).toBe(0);
      });
    });

    describe('testGoogleAnalyticsIntegration', () => {
      it('should pass with valid tracking ID', async () => {
        const config = { trackingId: 'UA-123456789-1' };

        await expect(
          (service as any).testGoogleAnalyticsIntegration(config)
        ).resolves.not.toThrow();
      });

      it('should fail without tracking ID', async () => {
        const config = {};

        await expect(
          (service as any).testGoogleAnalyticsIntegration(config)
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('testMixpanelIntegration', () => {
      it('should pass with valid credentials', async () => {
        const config = {
          projectId: 'project-123',
          apiKey: 'api-key-123',
        };

        await expect(
          (service as any).testMixpanelIntegration(config)
        ).resolves.not.toThrow();
      });

      it('should fail without project ID', async () => {
        const config = { apiKey: 'api-key-123' };

        await expect(
          (service as any).testMixpanelIntegration(config)
        ).rejects.toThrow(BadRequestException);
      });

      it('should fail without API key', async () => {
        const config = { projectId: 'project-123' };

        await expect(
          (service as any).testMixpanelIntegration(config)
        ).rejects.toThrow(BadRequestException);
      });
    });
  });
});