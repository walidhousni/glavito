import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PredictiveLeadScoringService } from './predictive-lead-scoring.service';
import { AdvancedChurnPreventionService } from './advanced-churn-prevention.service';
import { AISalesOptimizationService } from './ai-sales-optimization.service';
import { IntelligentCustomerJourneyService } from './intelligent-customer-journey.service';
import { AIModelManagementService } from './ai-model-management.service';
import { TenantGuard } from '@glavito/shared-auth';

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
    private readonly modelManagementService: AIModelManagementService
  ) {}

  // Lead Scoring Endpoints
  @Post('lead-scoring/train')
  async trainLeadScoringModel(
    @Body() body: { modelName: string },
    @Param('tenantId') tenantId: string
  ) {
    return await this.leadScoringService.trainModel(tenantId, body.modelName);
  }

  @Get('lead-scoring/score/:leadId')
  async scoreLead(
    @Param('leadId') leadId: string,
    @Param('tenantId') tenantId: string
  ) {
    return await this.leadScoringService.scoreLead(tenantId, leadId);
  }

  @Post('lead-scoring/batch-score')
  async batchScoreLeads(
    @Body() body: { leadIds: string[] },
    @Param('tenantId') tenantId: string
  ) {
    return await this.leadScoringService.batchScoreLeads(tenantId, body.leadIds);
  }

  @Get('lead-scoring/performance')
  async getLeadScoringPerformance(
    @Query('modelId') modelId: string,
    @Param('tenantId') tenantId: string
  ) {
    return await this.leadScoringService.getModelPerformance(tenantId, modelId);
  }

  @Post('lead-scoring/ab-test')
  async createLeadScoringABTest(
    @Body() body: { modelIds: string[]; testDuration: number },
    @Param('tenantId') tenantId: string
  ) {
    return await this.leadScoringService.abTestModels(tenantId, body.modelIds, body.testDuration);
  }

  // Churn Prevention Endpoints
  @Get('churn-prevention/assess/:customerId')
  async assessChurnRisk(
    @Param('customerId') customerId: string,
    @Param('tenantId') tenantId: string
  ) {
    return await this.churnPreventionService.assessChurnRisk(tenantId, customerId);
  }

  @Post('churn-prevention/batch-assess')
  async batchAssessChurnRisk(
    @Body() body: { customerIds: string[] },
    @Param('tenantId') tenantId: string
  ) {
    return await this.churnPreventionService.batchAssessChurnRisk(tenantId, body.customerIds);
  }

  @Post('churn-prevention/campaign')
  async createRetentionCampaign(
    @Body() body: { customerId: string; campaignType: 'proactive' | 'reactive' | 'win_back' },
    @Param('tenantId') tenantId: string
  ) {
    return await this.churnPreventionService.createRetentionCampaign(
      tenantId, 
      body.customerId, 
      body.campaignType
    );
  }

  @Put('churn-prevention/campaign/:campaignId/action')
  async executeCampaignAction(
    @Param('campaignId') campaignId: string,
    @Body() body: { actionType: string; outcome?: string }
  ) {
    return await this.churnPreventionService.executeCampaignAction(
      campaignId, 
      body.actionType, 
      body.outcome
    );
  }

  @Get('churn-prevention/insights')
  async getChurnPreventionInsights(
    @Query('from') from: string,
    @Query('to') to: string,
    @Param('tenantId') tenantId: string
  ) {
    const timeRange = {
      from: new Date(from),
      to: new Date(to)
    };
    return await this.churnPreventionService.getChurnPreventionInsights(tenantId, timeRange);
  }

  @Post('churn-prevention/train')
  async trainChurnModel(
    @Body() body: { modelName: string },
    @Param('tenantId') tenantId: string
  ) {
    return await this.churnPreventionService.trainChurnModel(tenantId, body.modelName);
  }

  // Sales Optimization Endpoints
  @Get('sales-optimization/deal-win/:dealId')
  async predictDealWin(
    @Param('dealId') dealId: string,
    @Param('tenantId') tenantId: string
  ) {
    return await this.salesOptimizationService.predictDealWin(tenantId, dealId);
  }

  @Get('sales-optimization/pricing/:dealId')
  async getPricingRecommendation(
    @Param('dealId') dealId: string,
    @Param('tenantId') tenantId: string
  ) {
    return await this.salesOptimizationService.getPricingRecommendation(tenantId, dealId);
  }

  @Get('sales-optimization/process/:repId')
  async optimizeSalesProcess(
    @Param('repId') repId: string,
    @Param('tenantId') tenantId: string
  ) {
    return await this.salesOptimizationService.optimizeSalesProcess(tenantId, repId);
  }

  @Get('sales-optimization/territory/:territoryId')
  async optimizeTerritory(
    @Param('territoryId') territoryId: string,
    @Param('tenantId') tenantId: string
  ) {
    return await this.salesOptimizationService.optimizeTerritory(tenantId, territoryId);
  }

  @Get('sales-optimization/insights')
  async getSalesOptimizationInsights(
    @Query('from') from: string,
    @Query('to') to: string,
    @Param('tenantId') tenantId: string
  ) {
    const timeRange = {
      from: new Date(from),
      to: new Date(to)
    };
    return await this.salesOptimizationService.getSalesOptimizationInsights(tenantId, timeRange);
  }

  @Post('sales-optimization/train')
  async trainSalesModel(
    @Body() body: { modelType: string; modelName: string },
    @Param('tenantId') tenantId: string
  ) {
    return await this.salesOptimizationService.trainSalesModel(
      tenantId, 
      body.modelType, 
      body.modelName
    );
  }

  // Customer Journey Endpoints
  @Get('customer-journey/:customerId')
  async generateCustomerJourney(
    @Param('customerId') customerId: string,
    @Param('tenantId') tenantId: string
  ) {
    return await this.journeyService.generateCustomerJourney(tenantId, customerId);
  }

  @Get('customer-journey/:customerId/optimization')
  async generateJourneyOptimizationRecommendations(
    @Param('customerId') customerId: string,
    @Param('tenantId') tenantId: string
  ) {
    return await this.journeyService.generateJourneyOptimizationRecommendations(tenantId, customerId);
  }

  @Get('customer-journey/analytics')
  async getJourneyAnalytics(
    @Query('from') from: string,
    @Query('to') to: string,
    @Param('tenantId') tenantId: string
  ) {
    const timeRange = {
      from: new Date(from),
      to: new Date(to)
    };
    return await this.journeyService.getJourneyAnalytics(tenantId, timeRange);
  }

  @Get('customer-journey/segments')
  async createJourneySegments(@Param('tenantId') tenantId: string) {
    return await this.journeyService.createJourneySegments(tenantId);
  }

  @Get('customer-journey/:customerId/orchestration')
  async optimizeJourneyOrchestration(
    @Param('customerId') customerId: string,
    @Param('tenantId') tenantId: string
  ) {
    return await this.journeyService.optimizeJourneyOrchestration(tenantId, customerId);
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
    @Param('tenantId') tenantId: string
  ) {
    return await this.modelManagementService.createModelVersion(tenantId, body);
  }

  @Post('models/:modelId/train')
  async trainModel(
    @Param('modelId') modelId: string,
    @Body() body: { trainingData: unknown[]; hyperparameters?: Record<string, unknown> },
    @Param('tenantId') tenantId: string
  ) {
    return await this.modelManagementService.trainModel(
      tenantId, 
      modelId, 
      body.trainingData, 
      body.hyperparameters
    );
  }

  @Put('models/:modelId/deploy')
  async deployModel(
    @Param('modelId') modelId: string,
    @Body() body: { version: string },
    @Param('tenantId') tenantId: string
  ) {
    return await this.modelManagementService.deployModel(tenantId, modelId, body.version);
  }

  @Get('models/:modelId/performance')
  async getModelPerformance(
    @Param('modelId') modelId: string,
    @Param('tenantId') tenantId: string
  ) {
    return await this.modelManagementService.getModelPerformance(tenantId, modelId);
  }

  @Post('models/ab-test')
  async createABTest(
    @Body() body: {
      name: string;
      description: string;
      models: Array<{ modelId: string; version: string; trafficPercentage: number }>;
      duration: number;
    },
    @Param('tenantId') tenantId: string
  ) {
    return await this.modelManagementService.createABTest(tenantId, body);
  }

  @Get('models/ab-test/:testId/results')
  async getABTestResults(@Param('testId') testId: string) {
    return await this.modelManagementService.getABTestResults(testId);
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
    @Param('tenantId') tenantId: string
  ) {
    return await this.modelManagementService.setupRetrainingSchedule(
      tenantId, 
      modelId, 
      body.schedule, 
      body.conditions
    );
  }

  @Get('models/:modelId/monitor')
  async monitorModelPerformance(
    @Param('modelId') modelId: string,
    @Param('tenantId') tenantId: string
  ) {
    return await this.modelManagementService.monitorModelPerformance(tenantId, modelId);
  }

  @Get('models/:modelId/versions')
  async getModelVersionHistory(
    @Param('modelId') modelId: string,
    @Param('tenantId') tenantId: string
  ) {
    return await this.modelManagementService.getModelVersionHistory(tenantId, modelId);
  }

  @Put('models/:modelId/rollback')
  async rollbackModel(
    @Param('modelId') modelId: string,
    @Body() body: { targetVersion: string },
    @Param('tenantId') tenantId: string
  ) {
    return await this.modelManagementService.rollbackModel(tenantId, modelId, body.targetVersion);
  }

  // Combined Analytics Dashboard Endpoint
  @Get('dashboard/overview')
  async getPredictiveAnalyticsOverview(
    @Query('from') from: string,
    @Query('to') to: string,
    @Param('tenantId') tenantId: string
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

    return {
      churnPrevention: churnInsights,
      salesOptimization: salesInsights,
      customerJourney: journeyAnalytics,
      summary: {
        totalAtRiskCustomers: churnInsights.totalAtRisk,
        avgWinRate: salesInsights.overallPerformance.winRate,
        avgJourneyDuration: journeyAnalytics.overallMetrics.avgJourneyDuration,
        overallHealth: this.calculateOverallHealth(churnInsights, salesInsights, journeyAnalytics)
      }
    };
  }

  private calculateOverallHealth(churnInsights: ChurnInsights, salesInsights: SalesInsights, journeyAnalytics: JourneyAnalytics): number {
    // Calculate overall system health based on all metrics
    const churnHealth = 1 - (churnInsights.totalAtRisk / 100); // Assuming 100 is max at-risk
    const salesHealth = salesInsights.overallPerformance.winRate;
    const journeyHealth = journeyAnalytics.overallMetrics.satisfactionScore / 5; // Normalize to 0-1
    
    return (churnHealth + salesHealth + journeyHealth) / 3;
  }
}
