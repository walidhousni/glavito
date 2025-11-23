import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PredictiveLeadScoringService } from './predictive-lead-scoring.service';
import { AdvancedChurnPreventionService } from './advanced-churn-prevention.service';
import { AISalesOptimizationService } from './ai-sales-optimization.service';
import { IntelligentCustomerJourneyService } from './intelligent-customer-journey.service';
import { AIModelManagementService } from './ai-model-management.service';
import { TenantGuard, CurrentTenant } from '@glavito/shared-auth';
import { DatabaseService } from '@glavito/shared-database';
import { ok, fail } from '../../common/api-response';

interface ChurnInsights {
  totalAtRisk: number;
}

interface SalesInsights {
  overallPerformance: {
    winRate: number;
  };
}

interface JourneyAnalytics {
  overallMetrics: {
    satisfactionScore: number;
  };
}

@Controller('ai/predictive')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PredictiveAnalyticsController {
  constructor(
    private readonly leadScoringService: PredictiveLeadScoringService,
    private readonly churnPreventionService: AdvancedChurnPreventionService,
    private readonly salesOptimizationService: AISalesOptimizationService,
    private readonly journeyService: IntelligentCustomerJourneyService,
    private readonly modelManagementService: AIModelManagementService,
    private readonly db: DatabaseService,
  ) {}

  // Lead Scoring Endpoints
  @Post('lead-scoring/train')
  async trainLeadScoringModel(
    @Body() body: { modelName: string },
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.leadScoringService.trainModel(tenantId, body.modelName);
    return ok(data);
  }

  @Get('lead-scoring/score/:leadId')
  async scoreLead(
    @Param('leadId') leadId: string,
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.leadScoringService.scoreLead(tenantId, leadId);
    return ok(data);
  }

  @Post('lead-scoring/batch-score')
  async batchScoreLeads(
    @Body() body: { leadIds: string[] },
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.leadScoringService.batchScoreLeads(tenantId, body.leadIds);
    return ok(data);
  }

  @Get('lead-scoring/performance')
  async getLeadScoringPerformance(
    @Query('modelId') modelId: string,
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.leadScoringService.getModelPerformance(tenantId, modelId);
    return ok(data);
  }

  @Post('lead-scoring/ab-test')
  async createLeadScoringABTest(
    @Body() body: { modelIds: string[]; testDuration: number },
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.leadScoringService.abTestModels(tenantId, body.modelIds, body.testDuration);
    return ok(data);
  }

  // Churn Prevention Endpoints
  @Get('churn-prevention/assess/:customerId')
  async assessChurnRisk(
    @Param('customerId') customerId: string,
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.churnPreventionService.assessChurnRisk(tenantId, customerId);
    return ok(data);
  }

  @Post('churn-prevention/batch-assess')
  async batchAssessChurnRisk(
    @Body() body: { customerIds: string[] },
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.churnPreventionService.batchAssessChurnRisk(tenantId, body.customerIds);
    return ok(data);
  }

  @Post('churn-prevention/campaign')
  async createRetentionCampaign(
    @Body() body: { customerId: string; campaignType: 'proactive' | 'reactive' | 'win_back' },
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.churnPreventionService.createRetentionCampaign(
      tenantId,
      body.customerId,
      body.campaignType
    );
    return ok(data);
  }

  @Put('churn-prevention/campaign/:campaignId/action')
  async executeCampaignAction(
    @Param('campaignId') campaignId: string,
    @Body() body: { actionType: string; outcome?: string }
  ) {
    const data = await this.churnPreventionService.executeCampaignAction(
      campaignId, 
      body.actionType, 
      body.outcome
    );
    return ok(data);
  }

  @Get('churn-prevention/insights')
  async getChurnPreventionInsights(
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentTenant() tenantId: string
  ) {
    const timeRange = {
      from: new Date(from),
      to: new Date(to)
    };
    const data = await this.churnPreventionService.getChurnPreventionInsights(tenantId, timeRange);
    return ok(data);
  }

  @Post('churn-prevention/train')
  async trainChurnModel(
    @Body() body: { modelName: string },
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.churnPreventionService.trainChurnModel(tenantId, body.modelName);
    return ok(data);
  }

  // Sales Optimization Endpoints
  @Get('sales-optimization/deal-win/:dealId')
  async predictDealWin(
    @Param('dealId') dealId: string,
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.salesOptimizationService.predictDealWin(tenantId, dealId);
    return ok(data);
  }

  @Get('sales-optimization/pricing/:dealId')
  async getPricingRecommendation(
    @Param('dealId') dealId: string,
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.salesOptimizationService.getPricingRecommendation(tenantId, dealId);
    return ok(data);
  }

  @Get('sales-optimization/process/:repId')
  async optimizeSalesProcess(
    @Param('repId') repId: string,
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.salesOptimizationService.optimizeSalesProcess(tenantId, repId);
    return ok(data);
  }

  @Get('sales-optimization/territory/:territoryId')
  async optimizeTerritory(
    @Param('territoryId') territoryId: string,
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.salesOptimizationService.optimizeTerritory(tenantId, territoryId);
    return ok(data);
  }

  @Get('sales-optimization/insights')
  async getSalesOptimizationInsights(
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentTenant() tenantId: string
  ) {
    const timeRange = {
      from: new Date(from),
      to: new Date(to)
    };
    const data = await this.salesOptimizationService.getSalesOptimizationInsights(tenantId, timeRange);
    return ok(data);
  }

  @Post('sales-optimization/train')
  async trainSalesModel(
    @Body() body: { modelType: string; modelName: string },
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.salesOptimizationService.trainSalesModel(
      tenantId, 
      body.modelType, 
      body.modelName
    );
    return ok(data);
  }

  // Customer Journey Endpoints
  @Get('customer-journey/:customerId')
  async generateCustomerJourney(
    @Param('customerId') customerId: string,
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.journeyService.generateCustomerJourney(tenantId, customerId);
    return ok(data);
  }

  // --- Convenience endpoints expected by frontend client ---
  @Get('lead-scoring/scores')
  async listLeadScores(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10)));
    const leads = await (this.db as any).lead.findMany({
      where: { tenantId },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take,
    }).catch(() => []);
    const leadIds = Array.isArray(leads) ? leads.map((l: any) => l.id) : [];
    const scores = leadIds.length
      ? await this.leadScoringService.batchScoreLeads(tenantId, leadIds)
      : [];
    return ok(scores);
  }

  @Get('churn-prevention/assessments')
  async listChurnAssessments(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10)));
    const customers = await (this.db as any).customer.findMany({
      where: { tenantId },
      select: { id: true },
      orderBy: { updatedAt: 'desc' },
      take,
    }).catch(() => []);
    const customerIds = Array.isArray(customers) ? customers.map((c: any) => c.id) : [];
    const assessments = customerIds.length
      ? await this.churnPreventionService.batchAssessChurnRisk(tenantId, customerIds)
      : [];
    return ok(assessments);
  }

  @Get('sales-optimization/deal-predictions')
  async listDealPredictions(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(200, Math.max(1, parseInt(String(limit || '50'), 10)));
    const deals = await (this.db as any).deal.findMany({
      where: { tenantId },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take,
    }).catch(() => []);
    const predictions = await Promise.all(
      (Array.isArray(deals) ? deals : []).map(async (d: any) => {
        try { return await this.salesOptimizationService.predictDealWin(tenantId, d.id) } catch { return null }
      })
    );
    return ok(predictions.filter(Boolean));
  }

  @Get('models')
  async listModels(@CurrentTenant() tenantId: string) {
    const models = await (this.db as any).aIModel.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }).catch(() => []);
    return ok(models);
  }

  @Get('models/training-jobs')
  async listTrainingJobs(@CurrentTenant() tenantId: string) {
    // Prefer dedicated training jobs table if present
    const jobs = await (this.db as any).modelTrainingJob?.findMany?.({
      where: { tenantId },
      orderBy: { startTime: 'desc' },
      take: 200,
    }).catch(() => []);
    return ok(Array.isArray(jobs) ? jobs : []);
  }

  @Get('customer-journey/:customerId/optimization')
  async generateJourneyOptimizationRecommendations(
    @Param('customerId') customerId: string,
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.journeyService.generateJourneyOptimizationRecommendations(tenantId, customerId);
    return ok(data);
  }

  @Get('customer-journey/analytics')
  async getJourneyAnalytics(
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentTenant() tenantId: string
  ) {
    const timeRange = {
      from: new Date(from),
      to: new Date(to)
    };
    const data = await this.journeyService.getJourneyAnalytics(tenantId, timeRange);
    return ok(data);
  }

  @Get('customer-journey/segments')
  async createJourneySegments(@CurrentTenant() tenantId: string) {
    const data = await this.journeyService.createJourneySegments(tenantId);
    return ok(data);
  }

  @Get('customer-journey/:customerId/orchestration')
  async optimizeJourneyOrchestration(
    @Param('customerId') customerId: string,
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.journeyService.optimizeJourneyOrchestration(tenantId, customerId);
    return ok(data);
  }

  // Model Management Endpoints
  @Post('models/version')
  async createModelVersion(
    @Body() body: {
      name: string;
      type: string;
      description?: string;
      configuration: Record<string, unknown>;
    },
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.modelManagementService.createModelVersion(tenantId, body);
    return ok(data);
  }

  @Post('models/:modelId/train')
  async trainModel(
    @Param('modelId') modelId: string,
    @Body() body: { trainingData: unknown[]; hyperparameters?: Record<string, unknown> },
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.modelManagementService.trainModel(
      tenantId, 
      modelId, 
      body.trainingData, 
      body.hyperparameters
    );
    return ok(data);
  }

  @Put('models/:modelId/deploy')
  async deployModel(
    @Param('modelId') modelId: string,
    @Body() body: { version: string },
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.modelManagementService.deployModel(tenantId, modelId, body.version);
    return ok(data);
  }

  @Get('models/:modelId/performance')
  async getModelPerformance(
    @Param('modelId') modelId: string,
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.modelManagementService.getModelPerformance(tenantId, modelId);
    return ok(data);
  }

  @Post('models/ab-test')
  async createABTest(
    @Body() body: {
      name: string;
      description: string;
      models: Array<{ modelId: string; version: string; trafficPercentage: number }>;
      duration: number;
    },
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.modelManagementService.createABTest(tenantId, body);
    return ok(data);
  }

  @Get('models/ab-test/:testId/results')
  async getABTestResults(@Param('testId') testId: string) {
    const data = await this.modelManagementService.getABTestResults(testId);
    return ok(data);
  }

  @Post('models/:modelId/retraining-schedule')
  async setupRetrainingSchedule(
    @Param('modelId') modelId: string,
    @Body() body: {
      schedule: {
        frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
        dayOfWeek?: number;
        dayOfMonth?: number;
        time: string;
      };
      conditions: {
        minDataSize: number;
        maxDriftThreshold: number;
        minPerformanceThreshold: number;
      };
    },
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.modelManagementService.setupRetrainingSchedule(
      tenantId, 
      modelId, 
      body.schedule, 
      body.conditions
    );
    return ok(data);
  }

  @Get('models/:modelId/monitor')
  async monitorModelPerformance(
    @Param('modelId') modelId: string,
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.modelManagementService.monitorModelPerformance(tenantId, modelId);
    return ok(data);
  }

  @Get('models/:modelId/versions')
  async getModelVersionHistory(
    @Param('modelId') modelId: string,
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.modelManagementService.getModelVersionHistory(tenantId, modelId);
    return ok(data);
  }

  @Put('models/:modelId/rollback')
  async rollbackModel(
    @Param('modelId') modelId: string,
    @Body() body: { targetVersion: string },
    @CurrentTenant() tenantId: string
  ) {
    const data = await this.modelManagementService.rollbackModel(tenantId, modelId, body.targetVersion);
    return ok(data);
  }

  // Combined Analytics Dashboard Endpoint
  @Get('dashboard/overview')
  async getPredictiveAnalyticsOverview(
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentTenant() tenantId: string
  ) {
    const timeRange = {
      from: new Date(from),
      to: new Date(to)
    };

    // Get insights from all services
    const [churnInsights, salesInsights, journeyAnalytics] = await Promise.all([
      this.churnPreventionService.getChurnPreventionInsights(tenantId, timeRange),
      this.salesOptimizationService.getSalesOptimizationInsights(tenantId, timeRange),
      this.journeyService.getJourneyAnalytics(tenantId, timeRange)
    ]);

    return ok({
      churnPrevention: churnInsights,
      salesOptimization: salesInsights,
      customerJourney: journeyAnalytics,
      summary: {
        totalAtRiskCustomers: churnInsights.totalAtRisk,
        avgWinRate: salesInsights.overallPerformance.winRate,
        avgJourneyDuration: journeyAnalytics.overallMetrics.avgJourneyDuration,
        overallHealth: this.calculateOverallHealth(churnInsights, salesInsights, journeyAnalytics)
      }
    });
  }

  private calculateOverallHealth(churnInsights: ChurnInsights, salesInsights: SalesInsights, journeyAnalytics: JourneyAnalytics): number {
    // Calculate overall system health based on all metrics
    const churnHealth = 1 - (churnInsights.totalAtRisk / 100); // Assuming 100 is max at-risk
    const salesHealth = salesInsights.overallPerformance.winRate;
    const journeyHealth = journeyAnalytics.overallMetrics.satisfactionScore / 5; // Normalize to 0-1
    
    return (churnHealth + salesHealth + journeyHealth) / 3;
  }
}
