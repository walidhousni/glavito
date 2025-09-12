import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { AIIntelligenceService } from '@glavito/shared-ai';
import { CrmCacheService } from '../crm/crm-cache.service';

export interface ModelVersion {
  id: string;
  modelId: string;
  version: string;
  status: 'training' | 'ready' | 'deployed' | 'deprecated' | 'error';
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingDataSize: number;
  trainingDuration: number;
  createdAt: Date;
  deployedAt?: Date;
  metadata: Record<string, any>;
}

export interface ModelPerformanceMetrics {
  modelId: string;
  version: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: number[][];
  featureImportance: Array<{
    feature: string;
    importance: number;
    contribution: number;
  }>;
  performanceBySegment: Array<{
    segment: string;
    accuracy: number;
    sampleSize: number;
  }>;
  driftMetrics: {
    dataDrift: number;
    conceptDrift: number;
    performanceDrift: number;
    lastChecked: Date;
  };
  lastEvaluated: Date;
}

export interface ModelTrainingJob {
  id: string;
  modelId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  startTime: Date;
  endTime?: Date;
  duration?: number;
  trainingDataSize: number;
  hyperparameters: Record<string, any>;
  metrics: {
    accuracy?: number;
    loss?: number;
    validationAccuracy?: number;
  };
  errorMessage?: string;
  logs: string[];
}

export interface ModelABTest {
  id: string;
  name: string;
  description: string;
  models: Array<{
    modelId: string;
    version: string;
    trafficPercentage: number;
  }>;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  metrics: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    accuracy: number;
  };
  results: Array<{
    modelId: string;
    requests: number;
    accuracy: number;
    avgResponseTime: number;
    conversionRate: number;
  }>;
  winner?: string;
  confidence: number;
}

export interface ModelRetrainingSchedule {
  id: string;
  modelId: string;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string; // HH:MM format
  };
  conditions: {
    minDataSize: number;
    maxDriftThreshold: number;
    minPerformanceThreshold: number;
  };
  isActive: boolean;
  lastRun?: Date;
  nextRun: Date;
  status: 'active' | 'paused' | 'error';
}

export interface ModelMonitoringAlert {
  id: string;
  modelId: string;
  type: 'performance_degradation' | 'data_drift' | 'concept_drift' | 'high_error_rate' | 'low_accuracy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  metadata: Record<string, any>;
}

@Injectable()
export class AIModelManagementService {
  private readonly logger = new Logger(AIModelManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIIntelligenceService,
    private readonly cache: CrmCacheService
  ) {}

  /**
   * Create a new model version
   */
  async createModelVersion(
    tenantId: string,
    modelData: {
      name: string;
      type: string;
      description?: string;
      configuration: Record<string, any>;
    }
  ): Promise<string> {
    try {
      this.logger.log(`Creating new model version: ${modelData.name}`);

      const model = await this.prisma.aIModel.create({
        data: {
          tenantId,
          name: modelData.name,
          type: modelData.type,
          status: 'training',
          configuration: modelData.configuration,
          version: '1.0',
          description: modelData.description
        }
      });

      return model.id;
    } catch (error) {
      this.logger.error('Failed to create model version:', error);
      throw error;
    }
  }

  /**
   * Train a model with new data
   */
  async trainModel(
    tenantId: string,
    modelId: string,
    trainingData: any[],
    hyperparameters: Record<string, any> = {}
  ): Promise<ModelTrainingJob> {
    try {
      this.logger.log(`Starting model training: ${modelId}`);

      const trainingJob: ModelTrainingJob = {
        id: `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        modelId,
        status: 'pending',
        progress: 0,
        startTime: new Date(),
        trainingDataSize: trainingData.length,
        hyperparameters,
        metrics: {},
        logs: []
      };

      // Store training job
      await this.storeTrainingJob(trainingJob);

      // Start training process (simulated)
      this.startTrainingProcess(trainingJob, trainingData);

      return trainingJob;
    } catch (error) {
      this.logger.error('Model training failed:', error);
      throw error;
    }
  }

  /**
   * Deploy a model version
   */
  async deployModel(tenantId: string, modelId: string, version: string): Promise<void> {
    try {
      this.logger.log(`Deploying model: ${modelId} version: ${version}`);

      // Deactivate current active model
      await this.prisma.aIModel.updateMany({
        where: { tenantId, type: { not: 'deprecated' } },
        data: { isActive: false }
      });

      // Activate new model
      await this.prisma.aIModel.update({
        where: { id: modelId },
        data: {
          isActive: true,
          status: 'ready'
        }
      });

      // Clear relevant caches
      await this.clearModelCaches(tenantId, modelId);

      this.logger.log(`Model deployed successfully: ${modelId}`);
    } catch (error) {
      this.logger.error('Model deployment failed:', error);
      throw error;
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelPerformance(tenantId: string, modelId: string): Promise<ModelPerformanceMetrics> {
    try {
      // Check cache first
      const cacheKey = `model_performance:${modelId}`;
      const cached = await this.cache.get(cacheKey, { prefix: 'models' });
      if (cached) {
        return cached;
      }

      const model = await this.prisma.aIModel.findFirst({
        where: { id: modelId, tenantId }
      });

      if (!model) {
        throw new Error('Model not found');
      }

      // Calculate performance metrics
      const metrics = await this.calculateModelMetrics(modelId, tenantId);

      // Cache the result
      await this.cache.set(cacheKey, metrics, { prefix: 'models', ttl: 3600 });

      return metrics;
    } catch (error) {
      this.logger.error('Failed to get model performance:', error);
      throw error;
    }
  }

  /**
   * Create A/B test for models
   */
  async createABTest(
    tenantId: string,
    testData: {
      name: string;
      description: string;
      models: Array<{ modelId: string; version: string; trafficPercentage: number }>;
      duration: number; // days
    }
  ): Promise<ModelABTest> {
    try {
      this.logger.log(`Creating A/B test: ${testData.name}`);

      const abTest: ModelABTest = {
        id: `ab_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: testData.name,
        description: testData.description,
        models: testData.models,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + testData.duration * 24 * 60 * 60 * 1000),
        metrics: {
          totalRequests: 0,
          successRate: 0,
          avgResponseTime: 0,
          accuracy: 0
        },
        results: [],
        confidence: 0
      };

      // Store A/B test configuration
      await this.storeABTest(abTest);

      // Update model configurations
      for (const model of testData.models) {
        await this.prisma.aIModel.update({
          where: { id: model.modelId },
          data: {
            configuration: {
              abTestId: abTest.id,
              abTestStartDate: abTest.startDate,
              abTestEndDate: abTest.endDate,
              trafficPercentage: model.trafficPercentage
            }
          }
        });
      }

      return abTest;
    } catch (error) {
      this.logger.error('A/B test creation failed:', error);
      throw error;
    }
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testId: string): Promise<ModelABTest> {
    try {
      const abTest = await this.getABTest(testId);
      if (!abTest) {
        throw new Error('A/B test not found');
      }

      // Calculate results
      const results = await this.calculateABTestResults(abTest);
      abTest.results = results;

      // Determine winner if test is completed
      if (abTest.status === 'completed' && results.length > 0) {
        const winner = results.reduce((prev, current) => 
          current.accuracy > prev.accuracy ? current : prev
        );
        abTest.winner = winner.modelId;
        abTest.confidence = this.calculateStatisticalSignificance(results);
      }

      return abTest;
    } catch (error) {
      this.logger.error('Failed to get A/B test results:', error);
      throw error;
    }
  }

  /**
   * Set up model retraining schedule
   */
  async setupRetrainingSchedule(
    tenantId: string,
    modelId: string,
    schedule: ModelRetrainingSchedule['schedule'],
    conditions: ModelRetrainingSchedule['conditions']
  ): Promise<ModelRetrainingSchedule> {
    try {
      this.logger.log(`Setting up retraining schedule for model: ${modelId}`);

      const retrainingSchedule: ModelRetrainingSchedule = {
        id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        modelId,
        schedule,
        conditions,
        isActive: true,
        nextRun: this.calculateNextRunTime(schedule),
        status: 'active'
      };

      // Store retraining schedule
      await this.storeRetrainingSchedule(retrainingSchedule);

      return retrainingSchedule;
    } catch (error) {
      this.logger.error('Failed to setup retraining schedule:', error);
      throw error;
    }
  }

  /**
   * Monitor model performance and create alerts
   */
  async monitorModelPerformance(tenantId: string, modelId: string): Promise<ModelMonitoringAlert[]> {
    try {
      const alerts: ModelMonitoringAlert[] = [];
      const metrics = await this.getModelPerformance(tenantId, modelId);

      // Check for performance degradation
      if (metrics.accuracy < 0.7) {
        alerts.push({
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          modelId,
          type: 'performance_degradation',
          severity: 'high',
          message: `Model accuracy dropped to ${metrics.accuracy.toFixed(3)}`,
          threshold: 0.7,
          currentValue: metrics.accuracy,
          status: 'active',
          createdAt: new Date(),
          metadata: { version: metrics.version }
        });
      }

      // Check for data drift
      if (metrics.driftMetrics.dataDrift > 0.3) {
        alerts.push({
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          modelId,
          type: 'data_drift',
          severity: 'medium',
          message: `Data drift detected: ${metrics.driftMetrics.dataDrift.toFixed(3)}`,
          threshold: 0.3,
          currentValue: metrics.driftMetrics.dataDrift,
          status: 'active',
          createdAt: new Date(),
          metadata: { lastChecked: metrics.driftMetrics.lastChecked }
        });
      }

      // Check for concept drift
      if (metrics.driftMetrics.conceptDrift > 0.2) {
        alerts.push({
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          modelId,
          type: 'concept_drift',
          severity: 'high',
          message: `Concept drift detected: ${metrics.driftMetrics.conceptDrift.toFixed(3)}`,
          threshold: 0.2,
          currentValue: metrics.driftMetrics.conceptDrift,
          status: 'active',
          createdAt: new Date(),
          metadata: { lastChecked: metrics.driftMetrics.lastChecked }
        });
      }

      // Store alerts
      for (const alert of alerts) {
        await this.storeMonitoringAlert(alert);
      }

      return alerts;
    } catch (error) {
      this.logger.error('Model monitoring failed:', error);
      throw error;
    }
  }

  /**
   * Get model version history
   */
  async getModelVersionHistory(tenantId: string, modelId: string): Promise<ModelVersion[]> {
    try {
      const models = await this.prisma.aIModel.findMany({
        where: { tenantId, name: { contains: modelId } },
        orderBy: { createdAt: 'desc' }
      });

      return models.map(model => ({
        id: model.id,
        modelId: model.name,
        version: model.version,
        status: model.status as any,
        accuracy: model.accuracy || 0,
        precision: 0, // Would be calculated from evaluation data
        recall: 0, // Would be calculated from evaluation data
        f1Score: 0, // Would be calculated from evaluation data
        trainingDataSize: (model.trainingData as any[])?.length || 0,
        trainingDuration: 0, // Would be stored during training
        createdAt: model.createdAt,
        deployedAt: model.isActive ? model.updatedAt : undefined,
        metadata: model.configuration as Record<string, any>
      }));
    } catch (error) {
      this.logger.error('Failed to get model version history:', error);
      throw error;
    }
  }

  /**
   * Rollback to previous model version
   */
  async rollbackModel(tenantId: string, modelId: string, targetVersion: string): Promise<void> {
    try {
      this.logger.log(`Rolling back model: ${modelId} to version: ${targetVersion}`);

      // Find target version
      const targetModel = await this.prisma.aIModel.findFirst({
        where: { 
          tenantId, 
          name: { contains: modelId },
          version: targetVersion 
        }
      });

      if (!targetModel) {
        throw new Error(`Model version ${targetVersion} not found`);
      }

      // Deactivate current model
      await this.prisma.aIModel.updateMany({
        where: { tenantId, isActive: true },
        data: { isActive: false }
      });

      // Activate target version
      await this.prisma.aIModel.update({
        where: { id: targetModel.id },
        data: { 
          isActive: true,
          status: 'ready'
        }
      });

      // Clear caches
      await this.clearModelCaches(tenantId, modelId);

      this.logger.log(`Model rolled back successfully to version: ${targetVersion}`);
    } catch (error) {
      this.logger.error('Model rollback failed:', error);
      throw error;
    }
  }

  private async storeTrainingJob(job: ModelTrainingJob): Promise<void> {
    // Store training job in database or cache
    await this.cache.set(`training_job:${job.id}`, job, { ttl: 86400 }); // 24 hours
  }

  private async startTrainingProcess(job: ModelTrainingJob, trainingData: any[]): Promise<void> {
    // Simulate training process
    const trainingSteps = [
      { progress: 10, message: 'Data preprocessing started' },
      { progress: 30, message: 'Feature engineering completed' },
      { progress: 50, message: 'Model training in progress' },
      { progress: 70, message: 'Validation phase started' },
      { progress: 90, message: 'Model evaluation completed' },
      { progress: 100, message: 'Training completed successfully' }
    ];

    for (const step of trainingSteps) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      
      job.progress = step.progress;
      job.logs.push(`${new Date().toISOString()}: ${step.message}`);
      
      if (step.progress === 100) {
        job.status = 'completed';
        job.endTime = new Date();
        job.duration = job.endTime.getTime() - job.startTime.getTime();
        job.metrics = {
          accuracy: 0.85 + Math.random() * 0.1,
          loss: 0.1 + Math.random() * 0.05,
          validationAccuracy: 0.82 + Math.random() * 0.08
        };
      }

      await this.storeTrainingJob(job);
    }
  }

  private async calculateModelMetrics(modelId: string, tenantId: string): Promise<ModelPerformanceMetrics> {
    // Simplified metrics calculation
    return {
      modelId,
      version: '1.0',
      accuracy: 0.85 + Math.random() * 0.1,
      precision: 0.82 + Math.random() * 0.08,
      recall: 0.88 + Math.random() * 0.07,
      f1Score: 0.85 + Math.random() * 0.08,
      confusionMatrix: [[45, 8], [12, 35]],
      featureImportance: [
        { feature: 'feature1', importance: 0.25, contribution: 0.3 },
        { feature: 'feature2', importance: 0.20, contribution: 0.25 },
        { feature: 'feature3', importance: 0.15, contribution: 0.20 }
      ],
      performanceBySegment: [
        { segment: 'segment1', accuracy: 0.87, sampleSize: 100 },
        { segment: 'segment2', accuracy: 0.83, sampleSize: 150 }
      ],
      driftMetrics: {
        dataDrift: 0.1 + Math.random() * 0.2,
        conceptDrift: 0.05 + Math.random() * 0.15,
        performanceDrift: 0.02 + Math.random() * 0.08,
        lastChecked: new Date()
      },
      lastEvaluated: new Date()
    };
  }

  private async storeABTest(abTest: ModelABTest): Promise<void> {
    await this.cache.set(`ab_test:${abTest.id}`, abTest, { ttl: 86400 * 30 }); // 30 days
  }

  private async getABTest(testId: string): Promise<ModelABTest | null> {
    return await this.cache.get(`ab_test:${testId}`, { prefix: '' });
  }

  private async calculateABTestResults(abTest: ModelABTest): Promise<Array<{
    modelId: string;
    requests: number;
    accuracy: number;
    avgResponseTime: number;
    conversionRate: number;
  }>> {
    // Simulate A/B test results
    return abTest.models.map(model => ({
      modelId: model.modelId,
      requests: Math.floor(Math.random() * 1000) + 500,
      accuracy: 0.8 + Math.random() * 0.15,
      avgResponseTime: 100 + Math.random() * 200,
      conversionRate: 0.6 + Math.random() * 0.3
    }));
  }

  private calculateStatisticalSignificance(results: any[]): number {
    // Simplified statistical significance calculation
    if (results.length < 2) return 0;
    
    const maxAccuracy = Math.max(...results.map(r => r.accuracy));
    const minAccuracy = Math.min(...results.map(r => r.accuracy));
    const difference = maxAccuracy - minAccuracy;
    
    return Math.min(0.95, difference * 2); // Simplified confidence calculation
  }

  private calculateNextRunTime(schedule: ModelRetrainingSchedule['schedule']): Date {
    const now = new Date();
    const nextRun = new Date(now);

    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        const daysUntilNextWeek = (7 - now.getDay() + (schedule.dayOfWeek || 0)) % 7;
        nextRun.setDate(now.getDate() + (daysUntilNextWeek || 7));
        break;
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1);
        nextRun.setDate(schedule.dayOfMonth || 1);
        break;
      case 'quarterly':
        nextRun.setMonth(now.getMonth() + 3);
        nextRun.setDate(schedule.dayOfMonth || 1);
        break;
    }

    // Set time
    const [hours, minutes] = schedule.time.split(':').map(Number);
    nextRun.setHours(hours, minutes, 0, 0);

    return nextRun;
  }

  private async storeRetrainingSchedule(schedule: ModelRetrainingSchedule): Promise<void> {
    await this.cache.set(`retraining_schedule:${schedule.id}`, schedule, { ttl: 86400 * 365 }); // 1 year
  }

  private async storeMonitoringAlert(alert: ModelMonitoringAlert): Promise<void> {
    await this.cache.set(`alert:${alert.id}`, alert, { ttl: 86400 * 7 }); // 7 days
  }

  private async clearModelCaches(tenantId: string, modelId: string): Promise<void> {
    // Clear model-related caches
    const cacheKeys = [
      `model_performance:${modelId}`,
      `lead_score:*`,
      `churn_risk:*`,
      `deal_win:*`
    ];

    for (const key of cacheKeys) {
      await this.cache.delete(key, { prefix: 'models' });
    }
  }
}
