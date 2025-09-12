import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { CrmCacheService } from './crm-cache.service';

export interface BackgroundJob {
  id: string;
  type: string;
  tenantId: string;
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

@Injectable()
export class CrmBackgroundService {
  private readonly logger = new Logger(CrmBackgroundService.name);
  private readonly jobs = new Map<string, BackgroundJob>();
  private readonly processing = new Set<string>();
  private readonly maxConcurrentJobs = 5;

  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CrmCacheService
  ) {}

  /**
   * Queue a background job
   */
  async queueJob(
    type: string,
    tenantId: string,
    data: any,
    options: { maxRetries?: number; priority?: number } = {}
  ): Promise<string> {
    const jobId = `${type}:${tenantId}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    
    const job: BackgroundJob = {
      id: jobId,
      type,
      tenantId,
      data,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: options.maxRetries || 3
    };

    this.jobs.set(jobId, job);
    this.logger.log(`Queued job ${jobId} of type ${type} for tenant ${tenantId}`);
    
    // Process jobs asynchronously
    setImmediate(() => this.processJobs());
    
    return jobId;
  }

  /**
   * Process queued jobs
   */
  private async processJobs(): Promise<void> {
    if (this.processing.size >= this.maxConcurrentJobs) {
      return;
    }

    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    for (const job of pendingJobs) {
      if (this.processing.size >= this.maxConcurrentJobs) {
        break;
      }

      this.processing.add(job.id);
      this.executeJob(job).catch(error => {
        this.logger.error(`Job ${job.id} failed:`, error);
      });
    }
  }

  /**
   * Execute a background job
   */
  private async executeJob(job: BackgroundJob): Promise<void> {
    try {
      job.status = 'processing';
      job.startedAt = new Date();

      this.logger.log(`Executing job ${job.id} of type ${job.type}`);

      switch (job.type) {
        case 'recalculate_segments':
          await this.recalculateSegments(job);
          break;
        case 'update_lead_scores':
          await this.updateLeadScores(job);
          break;
        case 'refresh_pipeline_metrics':
          await this.refreshPipelineMetrics(job);
          break;
        case 'cleanup_old_data':
          await this.cleanupOldData(job);
          break;
        case 'sync_customer_health':
          await this.syncCustomerHealth(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      job.status = 'completed';
      job.completedAt = new Date();
      this.logger.log(`Job ${job.id} completed successfully`);

    } catch (error) {
      job.retryCount++;
      job.error = error.message;

      if (job.retryCount >= job.maxRetries) {
        job.status = 'failed';
        job.completedAt = new Date();
        this.logger.error(`Job ${job.id} failed after ${job.maxRetries} retries:`, error);
      } else {
        job.status = 'pending';
        this.logger.warn(`Job ${job.id} failed, retrying (${job.retryCount}/${job.maxRetries}):`, error);
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, job.retryCount), 30000);
        setTimeout(() => {
          this.processing.delete(job.id);
          this.processJobs();
        }, delay);
      }
    } finally {
      this.processing.delete(job.id);
    }
  }

  /**
   * Recalculate segment memberships
   */
  private async recalculateSegments(job: BackgroundJob): Promise<void> {
    const { tenantId, segmentId } = job.data;
    
    if (segmentId) {
      // Recalculate specific segment
      await this.recalculateSegmentMembership(tenantId, segmentId);
    } else {
      // Recalculate all segments for tenant
      const segments = await this.db.customerSegment.findMany({
        where: { tenantId, isActive: true },
        select: { id: true }
      });

      for (const segment of segments) {
        await this.recalculateSegmentMembership(tenantId, segment.id);
      }
    }

    // Invalidate segment cache
    await this.cache.invalidatePattern(`segments:*:${tenantId}`);
  }

  /**
   * Update lead scores in batch
   */
  private async updateLeadScores(job: BackgroundJob): Promise<void> {
    const { tenantId, leadIds } = job.data;
    
    const leads = await this.db.lead.findMany({
      where: { 
        tenantId,
        ...(leadIds ? { id: { in: leadIds } } : {})
      },
      take: 100 // Process in batches
    });

    for (const lead of leads) {
      // Simulate AI scoring (replace with actual AI service call)
      const score = Math.floor(Math.random() * 100);
      const factors = ['demographic', 'behavioral', 'engagement'];
      const reasoning = `Score based on ${factors.join(', ')} factors`;

      await this.db.lead.update({
        where: { id: lead.id },
        data: {
          score,
          scoreReason: { factors, reasoning }
        }
      });

      // Cache the score
      await this.cache.cacheLeadScore(tenantId, lead.id, { score, factors, reasoning });
    }

    // Invalidate lead cache
    await this.cache.invalidatePattern(`leads:*:${tenantId}`);
  }

  /**
   * Refresh pipeline metrics
   */
  private async refreshPipelineMetrics(job: BackgroundJob): Promise<void> {
    const { tenantId } = job.data;
    
    // Calculate pipeline metrics (simplified version)
    const deals = await this.db.deal.findMany({
      where: { tenantId },
      select: {
        stage: true,
        value: true,
        probability: true,
        createdAt: true,
        actualCloseDate: true
      }
    });

    const metrics = this.calculatePipelineMetrics(deals);
    
    // Cache the metrics
    await this.cache.cachePipelineMetrics(tenantId, metrics);
  }

  /**
   * Cleanup old data
   */
  private async cleanupOldData(job: BackgroundJob): Promise<void> {
    const { tenantId, daysOld = 365 } = job.data;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Clean up old lead activities
    await this.db.leadActivity.deleteMany({
      where: {
        lead: { tenantId },
        createdAt: { lt: cutoffDate }
      }
    });

    // Clean up old deal activities
    await this.db.dealActivity.deleteMany({
      where: {
        deal: { tenantId },
        createdAt: { lt: cutoffDate }
      }
    });

    this.logger.log(`Cleaned up old data for tenant ${tenantId} older than ${daysOld} days`);
  }

  /**
   * Sync customer health scores
   */
  private async syncCustomerHealth(job: BackgroundJob): Promise<void> {
    const { tenantId } = job.data;
    
    const customers = await this.db.customer.findMany({
      where: { tenantId },
      select: { id: true },
      take: 100 // Process in batches
    });

    for (const customer of customers) {
      // Simulate health score calculation
      const healthScore = Math.floor(Math.random() * 100);
      const churnRisk = healthScore < 30 ? 'high' : healthScore < 70 ? 'medium' : 'low';

      await this.db.customer.update({
        where: { id: customer.id },
        data: { healthScore, churnRisk }
      });
    }

    this.logger.log(`Synced customer health scores for ${customers.length} customers in tenant ${tenantId}`);
  }

  /**
   * Helper method to recalculate segment membership
   */
  private async recalculateSegmentMembership(tenantId: string, segmentId: string): Promise<void> {
    const segment = await this.db.customerSegment.findUnique({
      where: { id: segmentId }
    });

    if (!segment || segment.tenantId !== tenantId) {
      return;
    }

    // Simplified segment calculation (replace with actual criteria evaluation)
    const customers = await this.db.customer.findMany({
      where: { tenantId },
      select: { id: true }
    });

    // Clear existing memberships
    await this.db.customerSegmentMembership.deleteMany({
      where: { segmentId }
    });

    // Add new memberships (simplified - in reality, evaluate criteria)
    const memberships = customers.slice(0, Math.floor(customers.length * 0.3)).map(customer => ({
      segmentId,
      customerId: customer.id
    }));

    if (memberships.length > 0) {
      await this.db.customerSegmentMembership.createMany({
        data: memberships
      });
    }

    // Update segment count
    await this.db.customerSegment.update({
      where: { id: segmentId },
      data: { 
        customerCount: memberships.length,
        lastCalculated: new Date()
      }
    });
  }

  /**
   * Helper method to calculate pipeline metrics
   */
  private calculatePipelineMetrics(deals: any[]): any {
    const stages = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
    const byStage: Record<string, { count: number; totalValue: number }> = {};
    
    for (const stage of stages) {
      byStage[stage] = { count: 0, totalValue: 0 };
    }

    let weightedPipeline = 0;
    let won = 0;
    let lost = 0;

    for (const deal of deals) {
      const stage = (deal.stage || 'NEW').toUpperCase();
      const value = Number(deal.value) || 0;
      const prob = typeof deal.probability === 'number' ? deal.probability : 0;
      
      if (!byStage[stage]) byStage[stage] = { count: 0, totalValue: 0 };
      byStage[stage].count += 1;
      byStage[stage].totalValue += value;
      weightedPipeline += value * (prob / 100);
      
      if (stage === 'WON') won += 1;
      if (stage === 'LOST') lost += 1;
    }

    const winRate = won + lost > 0 ? (won / (won + lost)) : 0;

    return {
      stages: stages.map(s => ({ stage: s, count: byStage[s].count, totalValue: byStage[s].totalValue })),
      weightedPipeline,
      winRate,
      totalDeals: deals.length
    };
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): BackgroundJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs for a tenant
   */
  getTenantJobs(tenantId: string): BackgroundJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.tenantId === tenantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Clean up completed jobs older than specified days
   */
  async cleanupCompletedJobs(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let cleaned = 0;
    for (const [jobId, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed') && 
          job.completedAt && 
          job.completedAt < cutoffDate) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    this.logger.log(`Cleaned up ${cleaned} completed jobs older than ${olderThanDays} days`);
    return cleaned;
  }
}
