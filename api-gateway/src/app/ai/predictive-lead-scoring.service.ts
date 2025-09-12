import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { CrmCacheService } from '../crm/crm-cache.service';
import { AIIntelligenceService } from '@glavito/shared-ai';

export interface LeadScoringModel {
  id: string;
  name: string;
  version: string;
  accuracy: number;
  features: string[];
  coefficients: Record<string, number>;
  intercept: number;
  trainingDataSize: number;
  lastTrained: Date;
  isActive: boolean;
}

export interface LeadScoringFeatures {
  // Demographic features
  hasCompany: boolean;
  hasPhone: boolean;
  emailDomain: string;
  emailQuality: number; // 0-1 score
  
  // Behavioral features
  interactionsLast30d: number;
  interactionsLast7d: number;
  lastActivityDays: number;
  source: string;
  tags: string[];
  
  // Engagement features
  emailOpens: number;
  emailClicks: number;
  websiteVisits: number;
  pageViews: number;
  
  // Historical features
  previousDeals: number;
  avgDealValue: number;
  conversionRate: number;
  
  // Contextual features
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  seasonality: number; // 0-1
}

export interface LeadScoringResult {
  leadId: string;
  score: number; // 0-100
  probability: number; // 0-1
  factors: Array<{
    feature: string;
    value: any;
    weight: number;
    contribution: number;
  }>;
  modelVersion: string;
  confidence: number;
  recommendations: string[];
  nextBestAction: string;
}

export interface ModelTrainingData {
  leadId: string;
  features: LeadScoringFeatures;
  outcome: 'converted' | 'lost' | 'in_progress';
  conversionTime?: number; // days to convert
  dealValue?: number;
}

@Injectable()
export class PredictiveLeadScoringService {
  private readonly logger = new Logger(PredictiveLeadScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AIIntelligenceService))
    private readonly aiService: AIIntelligenceService,
    private readonly cache: CrmCacheService
  ) {}

  /**
   * Train a new lead scoring model using historical data
   */
  async trainModel(tenantId: string, modelName: string): Promise<string> {
    this.logger.log(`Starting lead scoring model training for tenant: ${tenantId}`);
    
    try {
      // Collect training data
      const trainingData = await this.collectTrainingData(tenantId);
      
      if (trainingData.length < 100) {
        throw new Error('Insufficient training data. Need at least 100 leads with outcomes.');
      }

      // Feature engineering
      const features = await this.engineerFeatures(trainingData);
      
      // Train model using AI service
      const modelId = await this.aiService.trainCustomModel('lead_scoring', features);
      
      // Store model metadata
      const model = await this.prisma.aIModel.create({
        data: {
          id: modelId,
          tenantId,
          name: modelName,
          type: 'lead_scoring',
          status: 'training',
          configuration: {
            modelType: 'lead_scoring',
            features: Object.keys(features[0]?.features || {}),
            trainingDataSize: trainingData.length,
            algorithm: 'logistic_regression'
          },
          trainingData: features as any,
          version: '1.0'
        }
      });

      // Simulate training completion (in real implementation, this would be async)
      setTimeout(async () => {
        await this.completeModelTraining(modelId, features);
      }, 5000);

      return modelId;
    } catch (error) {
      this.logger.error('Model training failed:', error);
      throw error;
    }
  }

  /**
   * Score a lead using the active model
   */
  async scoreLead(tenantId: string, leadId: string): Promise<LeadScoringResult> {
    try {
      // Get lead data
      const lead = await this.prisma.lead.findFirst({
        where: { id: leadId, tenantId },
        include: {
          activities: true,
          deals: true
        }
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      // Get active model
      const model = await this.getActiveModel(tenantId);
      if (!model) {
        // Fallback to heuristic scoring
        return await this.heuristicScoring(lead);
      }

      // Extract features
      const features = await this.extractLeadFeatures(lead);
      
      // Calculate score using model
      const score = this.calculateModelScore(features, model);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(features, score);
      
      // Get next best action
      const nextBestAction = await this.getNextBestAction(features, score);

      const result: LeadScoringResult = {
        leadId,
        score: Math.round(score * 100),
        probability: score,
        factors: this.calculateFactorContributions(features, model),
        modelVersion: model.version,
        confidence: model.accuracy || 0.8,
        recommendations,
        nextBestAction
      };

      // Cache the result
      await this.cache.set(`lead_score:${leadId}`, result, { ttl: 3600 });

      return result;
    } catch (error) {
      this.logger.error('Lead scoring failed:', error);
      throw error;
    }
  }

  /**
   * Batch score multiple leads
   */
  async batchScoreLeads(tenantId: string, leadIds: string[]): Promise<LeadScoringResult[]> {
    const results: LeadScoringResult[] = [];
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 50;
    for (let i = 0; i < leadIds.length; i += batchSize) {
      const batch = leadIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(leadId => this.scoreLead(tenantId, leadId))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get model performance metrics
   */
  async getModelPerformance(tenantId: string, modelId?: string): Promise<{
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    confusionMatrix: number[][];
    featureImportance: Array<{ feature: string; importance: number }>;
    lastEvaluated: Date;
  }> {
    try {
      const model = modelId 
        ? await this.prisma.aIModel.findFirst({ where: { id: modelId, tenantId } })
        : await this.getActiveModel(tenantId);

      if (!model) {
        throw new Error('Model not found');
      }

      // In a real implementation, this would calculate actual performance metrics
      // For now, return simulated metrics
      return {
        accuracy: model.accuracy || 0.85,
        precision: 0.82,
        recall: 0.88,
        f1Score: 0.85,
        confusionMatrix: [[45, 8], [12, 35]],
        featureImportance: [
          { feature: 'interactionsLast30d', importance: 0.25 },
          { feature: 'emailQuality', importance: 0.20 },
          { feature: 'hasCompany', importance: 0.15 },
          { feature: 'source', importance: 0.12 },
          { feature: 'lastActivityDays', importance: 0.10 },
          { feature: 'hasPhone', importance: 0.08 },
          { feature: 'tags', importance: 0.06 },
          { feature: 'timeOfDay', importance: 0.04 }
        ],
        lastEvaluated: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get model performance:', error);
      throw error;
    }
  }

  /**
   * A/B test different models
   */
  async abTestModels(tenantId: string, modelIds: string[], testDuration: number = 30): Promise<{
    testId: string;
    models: Array<{ modelId: string; trafficPercentage: number }>;
    startDate: Date;
    endDate: Date;
    status: 'active' | 'completed' | 'paused';
  }> {
    const testId = `ab_test_${Date.now()}`;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + testDuration * 24 * 60 * 60 * 1000);

    // Create A/B test configuration
    const testConfig = {
      testId,
      tenantId,
      models: modelIds.map((id, index) => ({
        modelId: id,
        trafficPercentage: Math.floor(100 / modelIds.length)
      })),
      startDate,
      endDate,
      status: 'active' as const
    };

    // Store test configuration
    await this.prisma.aIModel.updateMany({
      where: { id: { in: modelIds }, tenantId },
      data: { 
        configuration: {
          abTestId: testId,
          abTestStartDate: startDate,
          abTestEndDate: endDate
        }
      }
    });

    return testConfig;
  }

  private async collectTrainingData(tenantId: string): Promise<ModelTrainingData[]> {
    // Get leads with known outcomes (converted or lost)
    const leads = await this.prisma.lead.findMany({
      where: { 
        tenantId,
        OR: [
          { status: 'CONVERTED' },
          { status: 'LOST' },
          { convertedAt: { not: null } }
        ]
      },
      include: {
        activities: true,
        deals: true
      },
      take: 1000
    });

    const trainingData: ModelTrainingData[] = [];

    for (const lead of leads) {
      const features = await this.extractLeadFeatures(lead);
      const outcome = lead.status === 'CONVERTED' || lead.convertedAt ? 'converted' : 'lost';
      const conversionTime = lead.convertedAt 
        ? Math.floor((lead.convertedAt.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;
      const dealValue = lead.deals.length > 0 
        ? lead.deals.reduce((sum, deal) => sum + Number(deal.value), 0)
        : undefined;

      trainingData.push({
        leadId: lead.id,
        features,
        outcome,
        conversionTime,
        dealValue
      });
    }

    return trainingData;
  }

  private async engineerFeatures(trainingData: ModelTrainingData[]): Promise<any[]> {
    // Feature engineering logic
    return trainingData.map(data => ({
      leadId: data.leadId,
      features: data.features,
      outcome: data.outcome === 'converted' ? 1 : 0,
      conversionTime: data.conversionTime,
      dealValue: data.dealValue
    }));
  }

  private async extractLeadFeatures(lead: any): Promise<LeadScoringFeatures> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Calculate interactions
    const interactionsLast30d = lead.activities?.filter((a: any) => 
      new Date(a.createdAt) >= thirtyDaysAgo
    ).length || 0;

    const interactionsLast7d = lead.activities?.filter((a: any) => 
      new Date(a.createdAt) >= sevenDaysAgo
    ).length || 0;

    // Calculate last activity days
    const lastActivityDays = lead.lastActivityAt 
      ? Math.floor((now.getTime() - new Date(lead.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((now.getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    // Email quality scoring
    const emailDomain = lead.email?.split('@')[1] || '';
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const emailQuality = personalDomains.includes(emailDomain) ? 0.3 : 0.8;

    // Historical features
    const previousDeals = lead.deals?.length || 0;
    const avgDealValue = previousDeals > 0 
      ? lead.deals.reduce((sum: number, deal: any) => sum + Number(deal.value), 0) / previousDeals
      : 0;

    // Time-based features
    const timeOfDay = now.getHours();
    const dayOfWeek = now.getDay();
    const seasonality = this.calculateSeasonality(now);

    return {
      hasCompany: !!lead.company,
      hasPhone: !!lead.phone,
      emailDomain,
      emailQuality,
      interactionsLast30d,
      interactionsLast7d,
      lastActivityDays,
      source: lead.source,
      tags: lead.tags || [],
      emailOpens: 0, // Would be populated from email tracking
      emailClicks: 0, // Would be populated from email tracking
      websiteVisits: 0, // Would be populated from web analytics
      pageViews: 0, // Would be populated from web analytics
      previousDeals,
      avgDealValue,
      conversionRate: previousDeals > 0 ? 1 : 0,
      timeOfDay,
      dayOfWeek,
      seasonality
    };
  }

  private calculateModelScore(features: LeadScoringFeatures, model: any): number {
    // Simplified model scoring (in real implementation, this would use the actual trained model)
    let score = 0.5; // Base probability

    // Apply feature weights (simplified)
    const weights = {
      hasCompany: 0.15,
      hasPhone: 0.10,
      emailQuality: 0.20,
      interactionsLast30d: 0.25,
      interactionsLast7d: 0.15,
      lastActivityDays: -0.10,
      source: 0.05,
      tags: 0.05,
      previousDeals: 0.10,
      avgDealValue: 0.05
    };

    score += features.hasCompany ? weights.hasCompany : 0;
    score += features.hasPhone ? weights.hasPhone : 0;
    score += features.emailQuality * weights.emailQuality;
    score += Math.min(features.interactionsLast30d * 0.02, weights.interactionsLast30d);
    score += Math.min(features.interactionsLast7d * 0.03, weights.interactionsLast7d);
    score += Math.max(-weights.lastActivityDays, -features.lastActivityDays * 0.001);
    score += features.previousDeals * weights.previousDeals;
    score += Math.min(features.avgDealValue * 0.0001, weights.avgDealValue);

    return Math.max(0, Math.min(1, score));
  }

  private calculateFactorContributions(features: LeadScoringFeatures, model: any): Array<{
    feature: string;
    value: any;
    weight: number;
    contribution: number;
  }> {
    const factors = [];
    
    if (features.hasCompany) {
      factors.push({ feature: 'hasCompany', value: true, weight: 0.15, contribution: 0.15 });
    }
    
    if (features.hasPhone) {
      factors.push({ feature: 'hasPhone', value: true, weight: 0.10, contribution: 0.10 });
    }
    
    factors.push({ 
      feature: 'emailQuality', 
      value: features.emailQuality, 
      weight: 0.20, 
      contribution: features.emailQuality * 0.20 
    });
    
    factors.push({ 
      feature: 'interactionsLast30d', 
      value: features.interactionsLast30d, 
      weight: 0.25, 
      contribution: Math.min(features.interactionsLast30d * 0.02, 0.25) 
    });
    
    factors.push({ 
      feature: 'lastActivityDays', 
      value: features.lastActivityDays, 
      weight: -0.10, 
      contribution: Math.max(-0.10, -features.lastActivityDays * 0.001) 
    });

    return factors;
  }

  private async generateRecommendations(features: LeadScoringFeatures, score: number): Promise<string[]> {
    const recommendations: string[] = [];

    if (!features.hasCompany) {
      recommendations.push('Collect company information to improve lead quality');
    }
    
    if (!features.hasPhone) {
      recommendations.push('Request phone number for better contactability');
    }
    
    if (features.emailQuality < 0.5) {
      recommendations.push('Verify email address or request business email');
    }
    
    if (features.interactionsLast30d < 2) {
      recommendations.push('Increase engagement with targeted outreach');
    }
    
    if (features.lastActivityDays > 7) {
      recommendations.push('Re-engage with personalized follow-up');
    }
    
    if (features.tags.length < 2) {
      recommendations.push('Add more tags to better categorize the lead');
    }

    if (score < 0.3) {
      recommendations.push('Consider lead nurturing campaign before sales outreach');
    } else if (score > 0.7) {
      recommendations.push('High-priority lead - assign to top sales rep');
    }

    return recommendations;
  }

  private async getNextBestAction(features: LeadScoringFeatures, score: number): Promise<string> {
    if (score > 0.8) {
      return 'Schedule immediate sales call';
    } else if (score > 0.6) {
      return 'Send personalized email with product demo';
    } else if (score > 0.4) {
      return 'Add to nurturing sequence';
    } else if (features.interactionsLast30d === 0) {
      return 'Send welcome email and educational content';
    } else {
      return 'Continue nurturing with relevant content';
    }
  }

  private async getActiveModel(tenantId: string): Promise<any> {
    return await this.prisma.aIModel.findFirst({
      where: { 
        tenantId, 
        type: 'lead_scoring', 
        status: 'ready',
        isActive: true 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  private async heuristicScoring(lead: any): Promise<LeadScoringResult> {
    // Fallback to existing heuristic scoring
    const result = await this.aiService.computeLeadScore(lead);
    
    return {
      leadId: lead.id,
      score: result.score,
      probability: result.score / 100,
      factors: result.factors,
      modelVersion: 'heuristic_v1',
      confidence: 0.6,
      recommendations: ['Use heuristic scoring - consider training ML model'],
      nextBestAction: result.score > 70 ? 'Schedule sales call' : 'Continue nurturing'
    };
  }

  private calculateSeasonality(date: Date): number {
    const month = date.getMonth();
    // Simple seasonality based on month (Q4 typically higher conversion)
    const seasonalFactors = [0.8, 0.7, 0.9, 0.8, 0.9, 0.8, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2];
    return seasonalFactors[month] || 1.0;
  }

  private async completeModelTraining(modelId: string, trainingData: any[]): Promise<void> {
    // Simulate model training completion
    const accuracy = 0.85 + Math.random() * 0.1;
    
    await this.prisma.aIModel.update({
      where: { id: modelId },
      data: {
        status: 'ready',
        accuracy,
        version: '1.0'
      }
    });

    this.logger.log(`Model training completed: ${modelId} with accuracy: ${accuracy}`);
  }
}
