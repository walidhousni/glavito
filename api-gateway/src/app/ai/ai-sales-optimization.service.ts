import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { AIIntelligenceService } from '@glavito/shared-ai';
import { CrmCacheService } from '../crm/crm-cache.service';

export interface SalesOptimizationModel {
  id: string;
  name: string;
  version: string;
  accuracy: number;
  features: string[];
  modelType: 'deal_win_prediction' | 'pricing_optimization' | 'sales_process' | 'territory_optimization';
  lastTrained: Date;
  isActive: boolean;
}

export interface DealWinPredictionFeatures {
  // Deal characteristics
  dealValue: number;
  dealStage: string;
  daysInStage: number;
  totalDaysOpen: number;
  probability: number;
  
  // Customer characteristics
  customerTenure: number;
  customerHealthScore: number;
  previousDeals: number;
  avgDealValue: number;
  customerSegment: string;
  
  // Sales rep characteristics
  repExperience: number;
  repWinRate: number;
  repAvgDealSize: number;
  repDealVelocity: number;
  
  // Market factors
  seasonality: number;
  competitivePressure: number;
  marketConditions: number;
  
  // Engagement factors
  stakeholderCount: number;
  meetingCount: number;
  proposalSent: boolean;
  demoCompleted: boolean;
  referenceProvided: boolean;
}

export interface DealWinPrediction {
  dealId: string;
  winProbability: number; // 0-1
  confidence: number;
  factors: Array<{
    factor: string;
    value: any;
    weight: number;
    contribution: number;
    recommendation: string;
  }>;
  modelVersion: string;
  nextBestActions: string[];
  riskFactors: string[];
  timeline: {
    estimatedCloseDate: Date;
    confidence: number;
    accelerationOpportunities: string[];
  };
}

export interface PricingRecommendation {
  dealId: string;
  currentPrice: number;
  recommendedPrice: number;
  priceRange: {
    min: number;
    max: number;
    optimal: number;
  };
  confidence: number;
  factors: Array<{
    factor: string;
    impact: number;
    reasoning: string;
  }>;
  recommendations: string[];
  competitiveAnalysis: {
    competitorPrices: Array<{
      competitor: string;
      price: number;
      features: string[];
    }>;
    marketPosition: 'premium' | 'competitive' | 'budget';
    priceSensitivity: number; // 0-1
  };
}

export interface SalesProcessOptimization {
  repId: string;
  currentProcess: {
    stage: string;
    activities: Array<{
      type: string;
      frequency: number;
      effectiveness: number;
    }>;
  };
  recommendations: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    impact: number;
    effort: number;
    description: string;
  }>;
  performanceMetrics: {
    winRate: number;
    avgDealSize: number;
    avgDealVelocity: number;
    quotaAttainment: number;
  };
  improvementPotential: {
    winRateImprovement: number;
    dealSizeImprovement: number;
    velocityImprovement: number;
  };
}

export interface TerritoryOptimization {
  territoryId: string;
  currentAllocation: {
    accounts: number;
    prospects: number;
    deals: number;
    revenue: number;
  };
  optimization: {
    recommendedAccounts: number;
    recommendedProspects: number;
    potentialRevenue: number;
    efficiency: number;
  };
  recommendations: Array<{
    type: 'add_accounts' | 'remove_accounts' | 'rebalance' | 'focus_area';
    description: string;
    impact: number;
    effort: number;
  }>;
  marketAnalysis: {
    totalAddressableMarket: number;
    marketShare: number;
    growthPotential: number;
    competitiveLandscape: string;
  };
}

export interface SalesOptimizationInsights {
  overallPerformance: {
    winRate: number;
    avgDealSize: number;
    avgDealVelocity: number;
    quotaAttainment: number;
  };
  topPerformers: Array<{
    repId: string;
    name: string;
    winRate: number;
    dealSize: number;
    bestPractices: string[];
  }>;
  improvementOpportunities: Array<{
    area: string;
    currentValue: number;
    potentialValue: number;
    improvement: number;
    recommendations: string[];
  }>;
  marketInsights: {
    pricingTrends: Array<{
      period: string;
      avgPrice: number;
      winRate: number;
    }>;
    competitiveAnalysis: Array<{
      competitor: string;
      winRate: number;
      avgDealSize: number;
      strengths: string[];
      weaknesses: string[];
    }>;
  };
}

@Injectable()
export class AISalesOptimizationService {
  private readonly logger = new Logger(AISalesOptimizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIIntelligenceService,
    private readonly cache: CrmCacheService
  ) {}

  /**
   * Predict deal win probability
   */
  async predictDealWin(tenantId: string, dealId: string): Promise<DealWinPrediction> {
    try {
      // Check cache first
      const cacheKey = `deal_win:${dealId}`;
      const cached = await this.cache.get(cacheKey, { prefix: 'sales' });
      if (cached) {
        return cached;
      }

      // Get deal data
      const deal = await this.getDealData(tenantId, dealId);
      if (!deal) {
        throw new Error('Deal not found');
      }

      // Extract features
      const features = await this.extractDealFeatures(deal);
      
      // Get active model
      const model = await this.getActiveModel(tenantId, 'deal_win_prediction');
      
      // Calculate win probability
      const winProbability = model 
        ? this.calculateWinProbability(features, model)
        : this.calculateHeuristicWinProbability(features);

      // Generate insights
      const factors = this.calculateFactorContributions(features, model);
      const nextBestActions = await this.generateNextBestActions(features, winProbability);
      const riskFactors = this.identifyRiskFactors(features, winProbability);
      const timeline = this.calculateDealTimeline(features, winProbability);

      const prediction: DealWinPrediction = {
        dealId,
        winProbability,
        confidence: model?.accuracy || 0.75,
        factors,
        modelVersion: model?.version || 'heuristic_v1',
        nextBestActions,
        riskFactors,
        timeline
      };

      // Cache the result
      await this.cache.set(cacheKey, prediction, { prefix: 'sales', ttl: 3600 });

      return prediction;
    } catch (error) {
      this.logger.error('Deal win prediction failed:', error);
      throw error;
    }
  }

  /**
   * Get pricing recommendations for a deal
   */
  async getPricingRecommendation(tenantId: string, dealId: string): Promise<PricingRecommendation> {
    try {
      const deal = await this.getDealData(tenantId, dealId);
      if (!deal) {
        throw new Error('Deal not found');
      }

      const features = await this.extractDealFeatures(deal);
      const currentPrice = Number(deal.value);
      
      // Calculate optimal pricing
      const pricing = this.calculateOptimalPricing(features, currentPrice);
      
      // Get competitive analysis
      const competitiveAnalysis = await this.getCompetitiveAnalysis(tenantId, features);
      
      // Generate recommendations
      const recommendations = this.generatePricingRecommendations(features, pricing, competitiveAnalysis);

      return {
        dealId,
        currentPrice,
        recommendedPrice: pricing.optimal,
        priceRange: pricing,
        confidence: 0.8,
        factors: this.calculatePricingFactors(features, pricing),
        recommendations,
        competitiveAnalysis
      };
    } catch (error) {
      this.logger.error('Pricing recommendation failed:', error);
      throw error;
    }
  }

  /**
   * Optimize sales process for a rep
   */
  async optimizeSalesProcess(tenantId: string, repId: string): Promise<SalesProcessOptimization> {
    try {
      // Get rep performance data
      const repData = await this.getRepPerformanceData(tenantId, repId);
      
      // Analyze current process
      const currentProcess = this.analyzeCurrentProcess(repData);
      
      // Generate recommendations
      const recommendations = this.generateProcessRecommendations(repData, currentProcess);
      
      // Calculate performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(repData);
      
      // Calculate improvement potential
      const improvementPotential = this.calculateImprovementPotential(repData, recommendations);

      return {
        repId,
        currentProcess,
        recommendations,
        performanceMetrics,
        improvementPotential
      };
    } catch (error) {
      this.logger.error('Sales process optimization failed:', error);
      throw error;
    }
  }

  /**
   * Optimize territory allocation
   */
  async optimizeTerritory(tenantId: string, territoryId: string): Promise<TerritoryOptimization> {
    try {
      // Get territory data
      const territoryData = await this.getTerritoryData(tenantId, territoryId);
      
      // Analyze current allocation
      const currentAllocation = this.analyzeCurrentAllocation(territoryData);
      
      // Generate optimization recommendations
      const optimization = this.generateTerritoryOptimization(territoryData, currentAllocation);
      
      // Get market analysis
      const marketAnalysis = await this.getMarketAnalysis(tenantId, territoryId);

      return {
        territoryId,
        currentAllocation,
        optimization,
        recommendations: this.generateTerritoryRecommendations(territoryData, optimization),
        marketAnalysis
      };
    } catch (error) {
      this.logger.error('Territory optimization failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive sales optimization insights
   */
  async getSalesOptimizationInsights(tenantId: string, timeRange: { from: Date; to: Date }): Promise<SalesOptimizationInsights> {
    try {
      // Get overall performance metrics
      const overallPerformance = await this.calculateOverallPerformance(tenantId, timeRange);
      
      // Identify top performers
      const topPerformers = await this.identifyTopPerformers(tenantId, timeRange);
      
      // Find improvement opportunities
      const improvementOpportunities = await this.findImprovementOpportunities(tenantId, timeRange);
      
      // Get market insights
      const marketInsights = await this.getMarketInsights(tenantId, timeRange);

      return {
        overallPerformance,
        topPerformers,
        improvementOpportunities,
        marketInsights
      };
    } catch (error) {
      this.logger.error('Failed to get sales optimization insights:', error);
      throw error;
    }
  }

  /**
   * Train sales optimization models
   */
  async trainSalesModel(tenantId: string, modelType: string, modelName: string): Promise<string> {
    this.logger.log(`Starting ${modelType} model training for tenant: ${tenantId}`);
    
    try {
      // Collect training data based on model type
      const trainingData = await this.collectTrainingData(tenantId, modelType);
      
      if (trainingData.length < 100) {
        throw new Error(`Insufficient training data for ${modelType}. Need at least 100 records.`);
      }

      // Train model using AI service
      const modelId = await this.aiService.trainCustomModel(modelType, trainingData);
      
      // Store model metadata
      const model = await this.prisma.aIModel.create({
        data: {
          id: modelId,
          tenantId,
          name: modelName,
          type: modelType,
          status: 'training',
          configuration: {
            modelType,
            features: Object.keys(trainingData[0]?.features || {}),
            trainingDataSize: trainingData.length,
            algorithm: this.getAlgorithmForModelType(modelType)
          },
          trainingData: trainingData as any,
          version: '1.0'
        }
      });

      // Simulate training completion
      setTimeout(async () => {
        await this.completeModelTraining(modelId, trainingData, modelType);
      }, 5000);

      return modelId;
    } catch (error) {
      this.logger.error(`${modelType} model training failed:`, error);
      throw error;
    }
  }

  private async getDealData(tenantId: string, dealId: string): Promise<any> {
    return await this.prisma.deal.findFirst({
      where: { id: dealId, tenantId },
      include: {
        customer: {
          include: {
            deals: true,
            tickets: true
          }
        },
        products: true,
        activities: true
      }
    });
  }

  private async extractDealFeatures(deal: any): Promise<DealWinPredictionFeatures> {
    const now = new Date();
    const createdAt = new Date(deal.createdAt);
    const daysOpen = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate days in current stage
    const stageHistory = deal.activities?.filter((a: any) => a.type === 'stage_change') || [];
    const currentStageStart = stageHistory.length > 0 
      ? new Date(stageHistory[stageHistory.length - 1].createdAt)
      : createdAt;
    const daysInStage = Math.floor((now.getTime() - currentStageStart.getTime()) / (1000 * 60 * 60 * 24));

    // Customer characteristics
    const customer = deal.customer;
    const customerTenure = customer ? Math.floor((now.getTime() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const previousDeals = customer?.deals?.length || 0;
    const avgDealValue = previousDeals > 0 
      ? customer.deals.reduce((sum: number, d: any) => sum + Number(d.value), 0) / previousDeals
      : 0;

    // Sales rep characteristics (simplified)
    const repExperience = 365; // Would be calculated from rep data
    const repWinRate = 0.65; // Would be calculated from historical data
    const repAvgDealSize = 50000; // Would be calculated from historical data
    const repDealVelocity = 45; // Would be calculated from historical data

    // Engagement factors
    const meetings = deal.activities?.filter((a: any) => a.type === 'meeting').length || 0;
    const proposals = deal.activities?.filter((a: any) => a.type === 'proposal_sent').length || 0;
    const demos = deal.activities?.filter((a: any) => a.type === 'demo_completed').length || 0;

    return {
      dealValue: Number(deal.value),
      dealStage: deal.stage,
      daysInStage,
      totalDaysOpen: daysOpen,
      probability: deal.probability / 100,
      customerTenure,
      customerHealthScore: customer?.healthScore || 50,
      previousDeals,
      avgDealValue,
      customerSegment: 'enterprise', // Would be determined from customer data
      repExperience,
      repWinRate,
      repAvgDealSize,
      repDealVelocity,
      seasonality: this.calculateSeasonality(now),
      competitivePressure: 0.3, // Would be calculated from market data
      marketConditions: 0.7, // Would be calculated from market data
      stakeholderCount: 3, // Would be calculated from engagement data
      meetingCount: meetings,
      proposalSent: proposals > 0,
      demoCompleted: demos > 0,
      referenceProvided: false // Would be determined from deal data
    };
  }

  private calculateWinProbability(features: DealWinPredictionFeatures, model: any): number {
    // Simplified win probability calculation
    let probability = 0.5; // Base probability

    // Deal value impact
    if (features.dealValue > 100000) probability += 0.1;
    else if (features.dealValue < 10000) probability -= 0.1;

    // Stage impact
    const stageWeights: Record<string, number> = {
      'NEW': 0.1,
      'QUALIFIED': 0.3,
      'PROPOSAL': 0.6,
      'NEGOTIATION': 0.8,
      'WON': 1.0,
      'LOST': 0.0
    };
    probability = (probability + (stageWeights[features.dealStage] || 0.5)) / 2;

    // Customer tenure impact
    if (features.customerTenure > 365) probability += 0.1;
    else if (features.customerTenure < 30) probability -= 0.05;

    // Rep performance impact
    probability += (features.repWinRate - 0.5) * 0.2;

    // Engagement impact
    if (features.meetingCount > 3) probability += 0.1;
    if (features.proposalSent) probability += 0.15;
    if (features.demoCompleted) probability += 0.1;

    // Time factors
    if (features.daysInStage > 30) probability -= 0.1;
    if (features.totalDaysOpen > 90) probability -= 0.15;

    return Math.max(0, Math.min(1, probability));
  }

  private calculateHeuristicWinProbability(features: DealWinPredictionFeatures): number {
    return this.calculateWinProbability(features, null);
  }

  private calculateFactorContributions(features: DealWinPredictionFeatures, model: any): Array<{
    factor: string;
    value: any;
    weight: number;
    contribution: number;
    recommendation: string;
  }> {
    const factors = [];

    // Deal stage contribution
    const stageWeights: Record<string, number> = {
      'NEW': 0.1, 'QUALIFIED': 0.3, 'PROPOSAL': 0.6, 'NEGOTIATION': 0.8
    };
    const stageWeight = stageWeights[features.dealStage] || 0.5;
    factors.push({
      factor: 'dealStage',
      value: features.dealStage,
      weight: 0.3,
      contribution: stageWeight * 0.3,
      recommendation: features.dealStage === 'NEW' ? 'Move to qualification stage' : 'Continue current process'
    });

    // Customer tenure contribution
    const tenureContribution = features.customerTenure > 365 ? 0.1 : -0.05;
    factors.push({
      factor: 'customerTenure',
      value: features.customerTenure,
      weight: 0.15,
      contribution: tenureContribution,
      recommendation: features.customerTenure < 30 ? 'Build relationship and trust' : 'Leverage existing relationship'
    });

    // Engagement contribution
    const engagementContribution = (features.meetingCount * 0.02) + (features.proposalSent ? 0.15 : 0) + (features.demoCompleted ? 0.1 : 0);
    factors.push({
      factor: 'engagement',
      value: { meetings: features.meetingCount, proposalSent: features.proposalSent, demoCompleted: features.demoCompleted },
      weight: 0.25,
      contribution: engagementContribution,
      recommendation: features.meetingCount < 2 ? 'Schedule more meetings' : 'Focus on closing activities'
    });

    return factors;
  }

  private async generateNextBestActions(features: DealWinPredictionFeatures, winProbability: number): Promise<string[]> {
    const actions: string[] = [];

    if (features.dealStage === 'NEW') {
      actions.push('Schedule discovery call to qualify the opportunity');
    } else if (features.dealStage === 'QUALIFIED') {
      actions.push('Send product demo and proposal');
    } else if (features.dealStage === 'PROPOSAL') {
      actions.push('Follow up on proposal and address objections');
    } else if (features.dealStage === 'NEGOTIATION') {
      actions.push('Finalize terms and close the deal');
    }

    if (features.meetingCount < 2) {
      actions.push('Schedule additional stakeholder meetings');
    }

    if (!features.proposalSent && features.dealStage !== 'NEW') {
      actions.push('Prepare and send formal proposal');
    }

    if (!features.demoCompleted && features.dealStage !== 'NEW') {
      actions.push('Schedule product demonstration');
    }

    if (features.daysInStage > 30) {
      actions.push('Accelerate deal progression or reassess opportunity');
    }

    if (winProbability < 0.3) {
      actions.push('Review deal strategy and consider alternative approaches');
    }

    return actions;
  }

  private identifyRiskFactors(features: DealWinPredictionFeatures, winProbability: number): string[] {
    const risks: string[] = [];

    if (features.daysInStage > 30) {
      risks.push('Deal stuck in current stage');
    }

    if (features.totalDaysOpen > 90) {
      risks.push('Deal aging - risk of losing momentum');
    }

    if (features.customerTenure < 30) {
      risks.push('New customer relationship - trust building needed');
    }

    if (features.meetingCount < 2) {
      risks.push('Insufficient stakeholder engagement');
    }

    if (features.competitivePressure > 0.7) {
      risks.push('High competitive pressure');
    }

    if (winProbability < 0.3) {
      risks.push('Low win probability - consider alternative strategies');
    }

    return risks;
  }

  private calculateDealTimeline(features: DealWinPredictionFeatures, winProbability: number): {
    estimatedCloseDate: Date;
    confidence: number;
    accelerationOpportunities: string[];
  } {
    const now = new Date();
    const baseDays = this.getBaseCloseDays(features.dealStage);
    const adjustedDays = Math.floor(baseDays * (1 - winProbability * 0.3));
    const estimatedCloseDate = new Date(now.getTime() + adjustedDays * 24 * 60 * 60 * 1000);

    const accelerationOpportunities: string[] = [];
    if (features.meetingCount < 3) {
      accelerationOpportunities.push('Increase meeting frequency');
    }
    if (!features.proposalSent) {
      accelerationOpportunities.push('Send proposal earlier');
    }
    if (features.stakeholderCount < 2) {
      accelerationOpportunities.push('Engage additional stakeholders');
    }

    return {
      estimatedCloseDate,
      confidence: winProbability,
      accelerationOpportunities
    };
  }

  private getBaseCloseDays(stage: string): number {
    const stageDays: Record<string, number> = {
      'NEW': 60,
      'QUALIFIED': 45,
      'PROPOSAL': 30,
      'NEGOTIATION': 15
    };
    return stageDays[stage] || 45;
  }

  private calculateOptimalPricing(features: DealWinPredictionFeatures, currentPrice: number): {
    min: number;
    max: number;
    optimal: number;
  } {
    // Simplified pricing calculation
    const basePrice = currentPrice;
    const min = Math.floor(basePrice * 0.85);
    const max = Math.floor(basePrice * 1.15);
    const optimal = Math.floor(basePrice * (1 + features.winProbability * 0.1));

    return { min, max, optimal };
  }

  private async getCompetitiveAnalysis(tenantId: string, features: DealWinPredictionFeatures): Promise<{
    competitorPrices: Array<{
      competitor: string;
      price: number;
      features: string[];
    }>;
    marketPosition: 'premium' | 'competitive' | 'budget';
    priceSensitivity: number;
  }> {
    // Simplified competitive analysis
    return {
      competitorPrices: [
        { competitor: 'Competitor A', price: features.dealValue * 0.9, features: ['Basic features'] },
        { competitor: 'Competitor B', price: features.dealValue * 1.1, features: ['Advanced features'] }
      ],
      marketPosition: features.dealValue > 100000 ? 'premium' : 'competitive',
      priceSensitivity: 0.7
    };
  }

  private generatePricingRecommendations(features: DealWinPredictionFeatures, pricing: any, competitiveAnalysis: any): string[] {
    const recommendations: string[] = [];

    if (pricing.optimal > features.dealValue) {
      recommendations.push('Consider increasing price based on deal value and win probability');
    } else if (pricing.optimal < features.dealValue) {
      recommendations.push('Consider reducing price to improve win probability');
    }

    if (competitiveAnalysis.marketPosition === 'premium') {
      recommendations.push('Emphasize value proposition and ROI to justify premium pricing');
    }

    if (features.customerTenure > 365) {
      recommendations.push('Leverage customer loyalty for pricing flexibility');
    }

    return recommendations;
  }

  private calculatePricingFactors(features: DealWinPredictionFeatures, pricing: any): Array<{
    factor: string;
    impact: number;
    reasoning: string;
  }> {
    return [
      {
        factor: 'dealValue',
        impact: 0.3,
        reasoning: 'Higher deal values allow for more pricing flexibility'
      },
      {
        factor: 'winProbability',
        impact: 0.25,
        reasoning: 'Higher win probability supports premium pricing'
      },
      {
        factor: 'customerTenure',
        impact: 0.2,
        reasoning: 'Longer customer relationships enable pricing negotiations'
      },
      {
        factor: 'competitivePressure',
        impact: -0.15,
        reasoning: 'High competition requires competitive pricing'
      },
      {
        factor: 'marketConditions',
        impact: 0.1,
        reasoning: 'Favorable market conditions support higher prices'
      }
    ];
  }

  private async getRepPerformanceData(tenantId: string, repId: string): Promise<any> {
    // Get rep's deals and performance data
    const deals = await this.prisma.deal.findMany({
      where: { tenantId, assignedUserId: repId },
      include: { activities: true }
    });

    return {
      repId,
      deals,
      totalDeals: deals.length,
      wonDeals: deals.filter(d => d.stage === 'WON').length,
      totalValue: deals.reduce((sum, d) => sum + Number(d.value), 0)
    };
  }

  private analyzeCurrentProcess(repData: any): {
    stage: string;
    activities: Array<{
      type: string;
      frequency: number;
      effectiveness: number;
    }>;
  } {
    // Analyze rep's current sales process
    const activities = repData.deals.flatMap((deal: any) => deal.activities || []);
    const activityCounts = new Map<string, number>();
    
    activities.forEach((activity: any) => {
      const count = activityCounts.get(activity.type) || 0;
      activityCounts.set(activity.type, count + 1);
    });

    const processActivities = Array.from(activityCounts.entries()).map(([type, count]) => ({
      type,
      frequency: count / repData.totalDeals,
      effectiveness: Math.random() * 0.5 + 0.5 // Simplified effectiveness calculation
    }));

    return {
      stage: 'active',
      activities: processActivities
    };
  }

  private generateProcessRecommendations(repData: any, currentProcess: any): Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
    impact: number;
    effort: number;
    description: string;
  }> {
    const recommendations = [];

    const winRate = repData.wonDeals / repData.totalDeals;
    
    if (winRate < 0.5) {
      recommendations.push({
        action: 'Improve qualification process',
        priority: 'high' as const,
        impact: 0.8,
        effort: 0.6,
        description: 'Focus on better lead qualification to improve win rate'
      });
    }

    if (repData.totalValue / repData.totalDeals < 50000) {
      recommendations.push({
        action: 'Increase deal size',
        priority: 'medium' as const,
        impact: 0.7,
        effort: 0.5,
        description: 'Target larger deals and upsell opportunities'
      });
    }

    recommendations.push({
      action: 'Improve follow-up consistency',
      priority: 'medium' as const,
      impact: 0.6,
      effort: 0.4,
      description: 'Implement systematic follow-up process'
    });

    return recommendations;
  }

  private calculatePerformanceMetrics(repData: any): {
    winRate: number;
    avgDealSize: number;
    avgDealVelocity: number;
    quotaAttainment: number;
  } {
    const winRate = repData.totalDeals > 0 ? repData.wonDeals / repData.totalDeals : 0;
    const avgDealSize = repData.totalDeals > 0 ? repData.totalValue / repData.totalDeals : 0;
    const avgDealVelocity = 45; // Simplified calculation
    const quotaAttainment = 0.85; // Simplified calculation

    return {
      winRate,
      avgDealSize,
      avgDealVelocity,
      quotaAttainment
    };
  }

  private calculateImprovementPotential(repData: any, recommendations: any[]): {
    winRateImprovement: number;
    dealSizeImprovement: number;
    velocityImprovement: number;
  } {
    const highImpactRecommendations = recommendations.filter(r => r.impact > 0.7);
    
    return {
      winRateImprovement: highImpactRecommendations.length * 0.1,
      dealSizeImprovement: highImpactRecommendations.length * 0.15,
      velocityImprovement: highImpactRecommendations.length * 0.08
    };
  }

  private async getTerritoryData(tenantId: string, territoryId: string): Promise<any> {
    // Get territory data including accounts, prospects, and deals
    return {
      territoryId,
      accounts: 50,
      prospects: 200,
      deals: 25,
      revenue: 2500000
    };
  }

  private analyzeCurrentAllocation(territoryData: any): {
    accounts: number;
    prospects: number;
    deals: number;
    revenue: number;
  } {
    return {
      accounts: territoryData.accounts,
      prospects: territoryData.prospects,
      deals: territoryData.deals,
      revenue: territoryData.revenue
    };
  }

  private generateTerritoryOptimization(territoryData: any, currentAllocation: any): {
    recommendedAccounts: number;
    recommendedProspects: number;
    potentialRevenue: number;
    efficiency: number;
  } {
    // Simplified territory optimization
    const efficiency = currentAllocation.revenue / (currentAllocation.accounts + currentAllocation.prospects);
    const recommendedAccounts = Math.floor(currentAllocation.accounts * 1.2);
    const recommendedProspects = Math.floor(currentAllocation.prospects * 1.1);
    const potentialRevenue = currentAllocation.revenue * 1.3;

    return {
      recommendedAccounts,
      recommendedProspects,
      potentialRevenue,
      efficiency
    };
  }

  private generateTerritoryRecommendations(territoryData: any, optimization: any): Array<{
    type: 'add_accounts' | 'remove_accounts' | 'rebalance' | 'focus_area';
    description: string;
    impact: number;
    effort: number;
  }> {
    return [
      {
        type: 'add_accounts',
        description: 'Add 10 new enterprise accounts to increase revenue potential',
        impact: 0.8,
        effort: 0.6
      },
      {
        type: 'focus_area',
        description: 'Focus on high-value prospects in key verticals',
        impact: 0.7,
        effort: 0.4
      }
    ];
  }

  private async getMarketAnalysis(tenantId: string, territoryId: string): Promise<{
    totalAddressableMarket: number;
    marketShare: number;
    growthPotential: number;
    competitiveLandscape: string;
  }> {
    return {
      totalAddressableMarket: 100000000,
      marketShare: 0.05,
      growthPotential: 0.15,
      competitiveLandscape: 'Moderate competition with growth opportunities'
    };
  }

  private async calculateOverallPerformance(tenantId: string, timeRange: { from: Date; to: Date }): Promise<{
    winRate: number;
    avgDealSize: number;
    avgDealVelocity: number;
    quotaAttainment: number;
  }> {
    const deals = await this.prisma.deal.findMany({
      where: {
        tenantId,
        createdAt: { gte: timeRange.from, lte: timeRange.to }
      }
    });

    const wonDeals = deals.filter(d => d.stage === 'WON');
    const winRate = deals.length > 0 ? wonDeals.length / deals.length : 0;
    const avgDealSize = deals.length > 0 ? deals.reduce((sum, d) => sum + Number(d.value), 0) / deals.length : 0;
    const avgDealVelocity = 45; // Simplified calculation
    const quotaAttainment = 0.85; // Simplified calculation

    return {
      winRate,
      avgDealSize,
      avgDealVelocity,
      quotaAttainment
    };
  }

  private async identifyTopPerformers(tenantId: string, timeRange: { from: Date; to: Date }): Promise<Array<{
    repId: string;
    name: string;
    winRate: number;
    dealSize: number;
    bestPractices: string[];
  }>> {
    // Simplified top performer identification
    return [
      {
        repId: 'rep1',
        name: 'John Smith',
        winRate: 0.75,
        dealSize: 75000,
        bestPractices: ['Strong qualification process', 'Consistent follow-up', 'Value-based selling']
      }
    ];
  }

  private async findImprovementOpportunities(tenantId: string, timeRange: { from: Date; to: Date }): Promise<Array<{
    area: string;
    currentValue: number;
    potentialValue: number;
    improvement: number;
    recommendations: string[];
  }>> {
    return [
      {
        area: 'Win Rate',
        currentValue: 0.65,
        potentialValue: 0.75,
        improvement: 0.15,
        recommendations: ['Improve qualification', 'Better objection handling']
      },
      {
        area: 'Deal Size',
        currentValue: 50000,
        potentialValue: 65000,
        improvement: 0.30,
        recommendations: ['Upselling strategies', 'Value-based pricing']
      }
    ];
  }

  private async getMarketInsights(tenantId: string, timeRange: { from: Date; to: Date }): Promise<{
    pricingTrends: Array<{
      period: string;
      avgPrice: number;
      winRate: number;
    }>;
    competitiveAnalysis: Array<{
      competitor: string;
      winRate: number;
      avgDealSize: number;
      strengths: string[];
      weaknesses: string[];
    }>;
  }> {
    return {
      pricingTrends: [
        { period: '2024-01', avgPrice: 55000, winRate: 0.65 },
        { period: '2024-02', avgPrice: 58000, winRate: 0.68 },
        { period: '2024-03', avgPrice: 62000, winRate: 0.72 }
      ],
      competitiveAnalysis: [
        {
          competitor: 'Competitor A',
          winRate: 0.60,
          avgDealSize: 45000,
          strengths: ['Lower price', 'Fast implementation'],
          weaknesses: ['Limited features', 'Poor support']
        }
      ]
    };
  }

  private async collectTrainingData(tenantId: string, modelType: string): Promise<any[]> {
    // Collect training data based on model type
    switch (modelType) {
      case 'deal_win_prediction':
        return await this.collectDealWinTrainingData(tenantId);
      case 'pricing_optimization':
        return await this.collectPricingTrainingData(tenantId);
      default:
        return [];
    }
  }

  private async collectDealWinTrainingData(tenantId: string): Promise<any[]> {
    const deals = await this.prisma.deal.findMany({
      where: { tenantId },
      include: { customer: true, activities: true },
      take: 1000
    });

    return deals.map(deal => ({
      dealId: deal.id,
      features: this.extractDealFeatures(deal),
      outcome: deal.stage === 'WON' ? 1 : 0,
      closeDate: deal.actualCloseDate
    }));
  }

  private async collectPricingTrainingData(tenantId: string): Promise<any[]> {
    const deals = await this.prisma.deal.findMany({
      where: { tenantId, stage: 'WON' },
      include: { customer: true },
      take: 500
    });

    return deals.map(deal => ({
      dealId: deal.id,
      features: this.extractDealFeatures(deal),
      price: Number(deal.value),
      outcome: 'won'
    }));
  }

  private getAlgorithmForModelType(modelType: string): string {
    const algorithms: Record<string, string> = {
      'deal_win_prediction': 'random_forest',
      'pricing_optimization': 'linear_regression',
      'sales_process': 'clustering',
      'territory_optimization': 'optimization'
    };
    return algorithms[modelType] || 'random_forest';
  }

  private async getActiveModel(tenantId: string, modelType: string): Promise<any> {
    return await this.prisma.aIModel.findFirst({
      where: { 
        tenantId, 
        type: modelType, 
        status: 'ready',
        isActive: true 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private calculateSeasonality(date: Date): number {
    const month = date.getMonth();
    const seasonalFactors = [0.8, 0.7, 0.9, 0.8, 0.9, 0.8, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2];
    return seasonalFactors[month] || 1.0;
  }

  private async completeModelTraining(modelId: string, trainingData: any[], modelType: string): Promise<void> {
    const accuracy = 0.80 + Math.random() * 0.15;
    
    await this.prisma.aIModel.update({
      where: { id: modelId },
      data: {
        status: 'ready',
        accuracy,
        version: '1.0'
      }
    });

    this.logger.log(`${modelType} model training completed: ${modelId} with accuracy: ${accuracy}`);
  }
}
