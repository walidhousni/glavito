import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

export interface CallAnalytics {
  totals: {
    totalCalls: number;
    activeCalls: number;
    endedCalls: number;
    totalDurationSec: number;
  };
  breakdown: {
    byType: Record<string, number>;
    byDirection: Record<string, number>;
  };
  quality24h: {
    avgRttMs: number;
    avgJitterMs: number;
    avgBitrateUp: number;
    avgBitrateDown: number;
    avgPacketLossUp: number;
    avgPacketLossDown: number;
  };
  last7Days: Array<{ date: string; durationSec: number }>;
}

export interface CallQualityMetrics {
  avgRttMs: number;
  avgJitterMs: number;
  avgBitrateUp: number;
  avgBitrateDown: number;
  avgPacketLossUp: number;
  avgPacketLossDown: number;
  sampleCount: number;
  timestamp: Date;
}

export interface CallTrend {
  date: string;
  totalCalls: number;
  durationSec: number;
  avgDurationSec: number;
}

@Injectable()
export class CallsAnalyticsService {
  private readonly logger = new Logger(CallsAnalyticsService.name);

  constructor(private readonly db: DatabaseService) {}

  async getCallAnalytics(tenantId: string, dateRange: { startDate: Date; endDate: Date }): Promise<CallAnalytics> {
    try {
      const { startDate, endDate } = dateRange;

      // Get total calls
      const totalCalls = await this.db.call.count({
        where: { tenantId, startedAt: { gte: startDate, lte: endDate } },
      });

      // Get active calls
      const activeCalls = await this.db.call.count({
        where: { tenantId, status: 'active' },
      });

      // Get ended calls
      const endedCalls = await this.db.call.count({
        where: { tenantId, status: 'ended', startedAt: { gte: startDate, lte: endDate } },
      });

      // Get total duration from CallUsage
      const usageData = await this.db.callUsage.aggregate({
        where: {
          tenantId,
          call: {
            status: 'ended',
            startedAt: { gte: startDate, lte: endDate },
          },
        },
        _sum: { durationSec: true },
      });
      const totalDurationSec = usageData._sum.durationSec || 0;

      // Breakdown by type
      const byTypeRaw = await this.db.call.groupBy({
        by: ['type'],
        where: { tenantId, startedAt: { gte: startDate, lte: endDate } },
        _count: true,
      });
      const byType: Record<string, number> = {};
      byTypeRaw.forEach((item) => {
        byType[item.type] = item._count;
      });

      // Breakdown by direction (use direction field directly)
      const byDirectionRaw = await this.db.call.groupBy({
        by: ['direction'],
        where: { tenantId, startedAt: { gte: startDate, lte: endDate } },
        _count: true,
      });
      const byDirection: Record<string, number> = { inbound: 0, outbound: 0, internal: 0 };
      byDirectionRaw.forEach((item) => {
        const dir = item.direction || 'internal';
        byDirection[dir] = item._count;
      });

      // Quality metrics for last 24h from CallMetric
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const qualityMetrics = await this.db.callMetric.aggregate({
        where: {
          call: {
            tenantId,
            startedAt: { gte: last24h },
            status: 'ended',
          },
        },
        _avg: {
          rttMs: true,
          jitterMs: true,
          bitrateUp: true,
          bitrateDown: true,
          packetLossUp: true,
          packetLossDown: true,
        },
      });

      const avgRttMs = qualityMetrics._avg.rttMs || 0;
      const avgJitterMs = qualityMetrics._avg.jitterMs || 0;
      const avgBitrateUp = qualityMetrics._avg.bitrateUp || 0;
      const avgBitrateDown = qualityMetrics._avg.bitrateDown || 0;
      const avgPacketLossUp = qualityMetrics._avg.packetLossUp || 0;
      const avgPacketLossDown = qualityMetrics._avg.packetLossDown || 0;

      // Last 7 days trend from CallUsage
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const trendData = await this.db.callUsage.findMany({
        where: {
          tenantId,
          call: {
            status: 'ended',
            startedAt: { gte: last7Days },
          },
        },
        select: {
          createdAt: true,
          durationSec: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      const dailyMap = new Map<string, { count: number; duration: number }>();
      trendData.forEach((usage) => {
        const dateKey = usage.createdAt.toISOString().split('T')[0];
        const existing = dailyMap.get(dateKey) || { count: 0, duration: 0 };
        existing.count += 1;
        existing.duration += usage.durationSec || 0;
        dailyMap.set(dateKey, existing);
      });

      const last7DaysArray = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        durationSec: data.duration,
      }));

      return {
        totals: {
          totalCalls,
          activeCalls,
          endedCalls,
          totalDurationSec,
        },
        breakdown: {
          byType,
          byDirection,
        },
        quality24h: {
          avgRttMs,
          avgJitterMs,
          avgBitrateUp,
          avgBitrateDown,
          avgPacketLossUp,
          avgPacketLossDown,
        },
        last7Days: last7DaysArray,
      };
    } catch (error) {
      this.logger.error(`Failed to get call analytics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCallQuality(tenantId: string, dateRange: { startDate: Date; endDate: Date }): Promise<CallQualityMetrics> {
    try {
      const { startDate, endDate } = dateRange;

      const qualityMetrics = await this.db.callMetric.aggregate({
        where: {
          call: {
            tenantId,
            startedAt: { gte: startDate, lte: endDate },
            status: 'ended',
          },
        },
        _avg: {
          rttMs: true,
          jitterMs: true,
          bitrateUp: true,
          bitrateDown: true,
          packetLossUp: true,
          packetLossDown: true,
        },
        _count: true,
      });

      return {
        avgRttMs: qualityMetrics._avg.rttMs || 0,
        avgJitterMs: qualityMetrics._avg.jitterMs || 0,
        avgBitrateUp: qualityMetrics._avg.bitrateUp || 0,
        avgBitrateDown: qualityMetrics._avg.bitrateDown || 0,
        avgPacketLossUp: qualityMetrics._avg.packetLossUp || 0,
        avgPacketLossDown: qualityMetrics._avg.packetLossDown || 0,
        sampleCount: qualityMetrics._count || 0,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get call quality metrics: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCallTrends(tenantId: string, days: number): Promise<CallTrend[]> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get calls with their usage data
      const calls = await this.db.call.findMany({
        where: { tenantId, startedAt: { gte: startDate }, status: 'ended' },
        select: {
          id: true,
          startedAt: true,
          usages: {
            select: { durationSec: true },
          },
        },
        orderBy: { startedAt: 'asc' },
      });

      const dailyMap = new Map<string, { count: number; duration: number }>();
      calls.forEach((call) => {
        const dateKey = call.startedAt.toISOString().split('T')[0];
        const existing = dailyMap.get(dateKey) || { count: 0, duration: 0 };
        existing.count += 1;
        // Sum duration from all usages for this call
        const callDuration = call.usages.reduce((sum, usage) => sum + (usage.durationSec || 0), 0);
        existing.duration += callDuration;
        dailyMap.set(dateKey, existing);
      });

      return Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        totalCalls: data.count,
        durationSec: data.duration,
        avgDurationSec: data.count > 0 ? data.duration / data.count : 0,
      }));
    } catch (error) {
      this.logger.error(`Failed to get call trends: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCallBreakdown(
    tenantId: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<{ byType: Record<string, number>; byDirection: Record<string, number> }> {
    try {
      const { startDate, endDate } = dateRange;

      // Breakdown by type
      const byTypeRaw = await this.db.call.groupBy({
        by: ['type'],
        where: { tenantId, startedAt: { gte: startDate, lte: endDate } },
        _count: true,
      });
      const byType: Record<string, number> = {};
      byTypeRaw.forEach((item) => {
        byType[item.type] = item._count;
      });

      // Breakdown by direction (use direction field directly)
      const byDirectionRaw = await this.db.call.groupBy({
        by: ['direction'],
        where: { tenantId, startedAt: { gte: startDate, lte: endDate } },
        _count: true,
      });
      const byDirection: Record<string, number> = { inbound: 0, outbound: 0, internal: 0 };
      byDirectionRaw.forEach((item) => {
        const dir = item.direction || 'internal';
        byDirection[dir] = item._count;
      });

      return { byType, byDirection };
    } catch (error) {
      this.logger.error(`Failed to get call breakdown: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getAgentCallPerformance(
    tenantId: string,
    agentId: string,
    dateRange: { startDate: Date; endDate: Date }
  ): Promise<{
    totalCalls: number;
    avgDurationSec: number;
    totalDurationSec: number;
    callsByType: Record<string, number>;
    qualityMetrics: Partial<CallQualityMetrics>;
  }> {
    try {
      const { startDate, endDate } = dateRange;

      // Get calls where agent participated
      const calls = await this.db.call.findMany({
        where: {
          tenantId,
          startedAt: { gte: startDate, lte: endDate },
          participants: {
            some: { userId: agentId },
          },
        },
        select: {
          id: true,
          type: true,
        },
      });

      const totalCalls = calls.length;
      
      // Calculate total duration from CallUsage
      const callIds = calls.map(c => c.id);
      const usageData = await this.db.callUsage.aggregate({
        where: {
          callId: { in: callIds },
        },
        _sum: { durationSec: true },
      });
      const totalDurationSec = usageData._sum.durationSec || 0;
      const avgDurationSec = totalCalls > 0 ? totalDurationSec / totalCalls : 0;

      const callsByType: Record<string, number> = {};
      calls.forEach((call) => {
        callsByType[call.type] = (callsByType[call.type] || 0) + 1;
      });

      // Aggregate quality metrics from CallMetric
      const qualityMetricsAgg = await this.db.callMetric.aggregate({
        where: {
          callId: { in: callIds },
        },
        _avg: {
          rttMs: true,
          jitterMs: true,
          bitrateUp: true,
          bitrateDown: true,
        },
        _count: true,
      });

      const qualityMetrics: Partial<CallQualityMetrics> = {};
      if (qualityMetricsAgg._count > 0) {
        qualityMetrics.avgRttMs = qualityMetricsAgg._avg.rttMs || 0;
        qualityMetrics.avgJitterMs = qualityMetricsAgg._avg.jitterMs || 0;
        qualityMetrics.avgBitrateUp = qualityMetricsAgg._avg.bitrateUp || 0;
        qualityMetrics.avgBitrateDown = qualityMetricsAgg._avg.bitrateDown || 0;
        qualityMetrics.sampleCount = qualityMetricsAgg._count;
      }

      return {
        totalCalls,
        avgDurationSec,
        totalDurationSec,
        callsByType,
        qualityMetrics,
      };
    } catch (error) {
      this.logger.error(`Failed to get agent call performance: ${error.message}`, error.stack);
      throw error;
    }
  }
}

