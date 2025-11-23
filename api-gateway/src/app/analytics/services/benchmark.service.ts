import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';

export interface BenchmarkMetric {
  metric: string;
  value: number;
  percentile25?: number;
  percentile50?: number;
  percentile75?: number;
  percentile90?: number;
  sampleSize: number;
  trend?: 'up' | 'down' | 'stable';
  comparedToIndustry?: 'above' | 'below' | 'average';
}

export interface TenantBenchmarkComparison {
  tenantValue: number;
  industryAverage: number;
  percentileRank: number;
  difference: number;
  differencePercent: number;
  position: 'above' | 'below' | 'average';
}

export interface CreateBenchmarkDto {
  industry: string;
  metric: string;
  value: number;
  percentile25?: number;
  percentile50?: number;
  percentile75?: number;
  percentile90?: number;
  sampleSize?: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  periodStart: Date;
  periodEnd: Date;
  region?: string;
  metadata?: any;
}

@Injectable()
export class BenchmarkService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get industry benchmarks for a specific metric
   */
  async getIndustryBenchmark(
    industry: string,
    metric: string,
    period: string = 'monthly'
  ): Promise<BenchmarkMetric | null> {
    const latestBenchmark = await this.prisma.industryBenchmark.findFirst({
      where: {
        industry,
        metric,
        period,
      },
      orderBy: {
        periodStart: 'desc',
      },
    });

    if (!latestBenchmark) {
      return null;
    }

    return {
      metric: latestBenchmark.metric,
      value: latestBenchmark.value,
      percentile25: latestBenchmark.percentile25 ?? undefined,
      percentile50: latestBenchmark.percentile50 ?? undefined,
      percentile75: latestBenchmark.percentile75 ?? undefined,
      percentile90: latestBenchmark.percentile90 ?? undefined,
      sampleSize: latestBenchmark.sampleSize,
    };
  }

  /**
   * Get all benchmarks for an industry
   */
  async getIndustryBenchmarks(
    industry: string,
    period: string = 'monthly',
    limit: number = 50
  ): Promise<BenchmarkMetric[]> {
    const benchmarks = await this.prisma.industryBenchmark.findMany({
      where: {
        industry,
        period,
      },
      orderBy: {
        periodStart: 'desc',
      },
      take: limit,
    });

    return benchmarks.map((b) => ({
      metric: b.metric,
      value: b.value,
      percentile25: b.percentile25 ?? undefined,
      percentile50: b.percentile50 ?? undefined,
      percentile75: b.percentile75 ?? undefined,
      percentile90: b.percentile90 ?? undefined,
      sampleSize: b.sampleSize,
    }));
  }

  /**
   * Compare tenant metrics against industry benchmarks
   */
  async compareTenantToIndustry(
    tenantId: string,
    metric: string,
    tenantValue: number,
    period: string = 'monthly'
  ): Promise<TenantBenchmarkComparison | null> {
    // Get tenant's industry
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { industryProfile: true },
    });

    if (!tenant?.industryProfile?.primaryIndustry) {
      return null;
    }

    const industry = tenant.industryProfile.primaryIndustry;

    // Get industry benchmark
    const benchmark = await this.getIndustryBenchmark(industry, metric, period);

    if (!benchmark) {
      return null;
    }

    // Calculate comparison
    const industryAverage = benchmark.value;
    const difference = tenantValue - industryAverage;
    const differencePercent =
      industryAverage !== 0 ? (difference / industryAverage) * 100 : 0;

    // Calculate percentile rank
    let percentileRank = 50; // default to median
    if (benchmark.percentile25 && tenantValue < benchmark.percentile25) {
      percentileRank = 25;
    } else if (benchmark.percentile50 && tenantValue < benchmark.percentile50) {
      percentileRank = 37.5;
    } else if (benchmark.percentile75 && tenantValue < benchmark.percentile75) {
      percentileRank = 62.5;
    } else if (benchmark.percentile90 && tenantValue < benchmark.percentile90) {
      percentileRank = 82.5;
    } else {
      percentileRank = 95;
    }

    // Determine position
    let position: 'above' | 'below' | 'average' = 'average';
    const threshold = 0.05; // 5% threshold for "average"
    if (Math.abs(differencePercent) <= threshold * 100) {
      position = 'average';
    } else if (differencePercent > 0) {
      position = 'above';
    } else {
      position = 'below';
    }

    return {
      tenantValue,
      industryAverage,
      percentileRank,
      difference,
      differencePercent,
      position,
    };
  }

  /**
   * Get benchmark trends over time
   */
  async getBenchmarkTrends(
    industry: string,
    metric: string,
    startDate: Date,
    endDate: Date,
    period: string = 'monthly'
  ): Promise<BenchmarkMetric[]> {
    const benchmarks = await this.prisma.industryBenchmark.findMany({
      where: {
        industry,
        metric,
        period,
        periodStart: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        periodStart: 'asc',
      },
    });

    return benchmarks.map((b, index) => {
      let trend: 'up' | 'down' | 'stable' = 'stable';

      if (index > 0) {
        const prevValue = benchmarks[index - 1].value;
        const currentValue = b.value;
        const changePercent = ((currentValue - prevValue) / prevValue) * 100;

        if (changePercent > 5) {
          trend = 'up';
        } else if (changePercent < -5) {
          trend = 'down';
        }
      }

      return {
        metric: b.metric,
        value: b.value,
        percentile25: b.percentile25 ?? undefined,
        percentile50: b.percentile50 ?? undefined,
        percentile75: b.percentile75 ?? undefined,
        percentile90: b.percentile90 ?? undefined,
        sampleSize: b.sampleSize,
        trend,
      };
    });
  }

  /**
   * Create or update benchmark (admin only)
   */
  async upsertBenchmark(data: CreateBenchmarkDto): Promise<BenchmarkMetric> {
    const existing = await this.prisma.industryBenchmark.findUnique({
      where: {
        industry_metric_period_periodStart: {
          industry: data.industry,
          metric: data.metric,
          period: data.period,
          periodStart: data.periodStart,
        },
      },
    });

    const benchmarkData = {
      industry: data.industry,
      metric: data.metric,
      value: data.value,
      percentile25: data.percentile25,
      percentile50: data.percentile50,
      percentile75: data.percentile75,
      percentile90: data.percentile90,
      sampleSize: data.sampleSize || 0,
      period: data.period,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      region: data.region,
      metadata: data.metadata || {},
    };

    const benchmark = existing
      ? await this.prisma.industryBenchmark.update({
          where: { id: existing.id },
          data: benchmarkData,
        })
      : await this.prisma.industryBenchmark.create({
          data: benchmarkData,
        });

    return {
      metric: benchmark.metric,
      value: benchmark.value,
      percentile25: benchmark.percentile25 ?? undefined,
      percentile50: benchmark.percentile50 ?? undefined,
      percentile75: benchmark.percentile75 ?? undefined,
      percentile90: benchmark.percentile90 ?? undefined,
      sampleSize: benchmark.sampleSize,
    };
  }

  /**
   * Get available metrics for an industry
   */
  async getAvailableMetrics(industry: string): Promise<string[]> {
    const result = await this.prisma.industryBenchmark.findMany({
      where: { industry },
      select: { metric: true },
      distinct: ['metric'],
    });

    return result.map((r) => r.metric);
  }

  /**
   * Get all industries with benchmarks
   */
  async getAvailableIndustries(): Promise<string[]> {
    const result = await this.prisma.industryBenchmark.findMany({
      select: { industry: true },
      distinct: ['industry'],
    });

    return result.map((r) => r.industry);
  }

  /**
   * Calculate and store tenant analytics snapshot
   */
  async createAnalyticsSnapshot(
    tenantId: string,
    snapshotDate: Date,
    snapshotType: 'daily' | 'weekly' | 'monthly',
    metrics: Record<string, unknown>
  ): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { industryProfile: true },
    });

    await this.prisma.analyticsSnapshot.upsert({
      where: {
        tenantId_snapshotDate_snapshotType: {
          tenantId,
          snapshotDate,
          snapshotType,
        },
      },
      create: {
        tenantId,
        snapshotDate,
        snapshotType,
        industry: tenant?.industryProfile?.primaryIndustry,
        metrics,
      },
      update: {
        metrics,
        industry: tenant?.industryProfile?.primaryIndustry,
      },
    });
  }

  /**
   * Get tenant analytics snapshots
   */
  async getTenantSnapshots(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    snapshotType: 'daily' | 'weekly' | 'monthly'
  ) {
    return this.prisma.analyticsSnapshot.findMany({
      where: {
        tenantId,
        snapshotType,
        snapshotDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        snapshotDate: 'asc',
      },
    });
  }

  /**
   * Bulk import benchmarks (for seeding)
   */
  async bulkImportBenchmarks(benchmarks: CreateBenchmarkDto[]): Promise<number> {
    let imported = 0;

    for (const benchmark of benchmarks) {
      try {
        await this.upsertBenchmark(benchmark);
        imported++;
      } catch (error) {
        console.error(`Failed to import benchmark: ${benchmark.metric}`, error);
      }
    }

    return imported;
  }
}

