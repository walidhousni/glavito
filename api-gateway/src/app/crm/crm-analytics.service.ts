import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { CrmCacheService } from './crm-cache.service';

@Injectable()
export class CrmAnalyticsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CrmCacheService
  ) {}

  async getPipelineMetrics(tenantId: string) {
    // Try to get from cache first
    const cacheKey = `pipeline:${tenantId}`;
    const cached = await this.cache.get(cacheKey, { prefix: 'analytics' });
    if (cached) {
      return cached;
    }

    // Fetch deals with minimal fields
    const deals = await this.db.deal.findMany({
      where: { tenantId },
      select: {
        id: true,
        stage: true,
        value: true,
        probability: true,
        createdAt: true,
        actualCloseDate: true,
      },
      take: 5000,
    });

    const stages = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
    const byStage: Record<string, { count: number; totalValue: number }> = {};
    for (const s of stages) byStage[s] = { count: 0, totalValue: 0 };

    let weightedPipeline = 0;
    let won = 0;
    let lost = 0;
    const cycleDurations: number[] = [];

    for (const d of deals) {
      const stage = (d.stage || 'NEW').toUpperCase();
      const value = Number(d.value) || 0;
      const prob = typeof d.probability === 'number' ? d.probability : 0;
      if (!byStage[stage]) byStage[stage] = { count: 0, totalValue: 0 };
      byStage[stage].count += 1;
      byStage[stage].totalValue += value;
      weightedPipeline += value * (prob / 100);
      if (stage === 'WON') won += 1;
      if (stage === 'LOST') lost += 1;
      if (d.actualCloseDate) {
        const days = Math.max(0, Math.round((d.actualCloseDate.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
        cycleDurations.push(days);
      }
    }

    const winRate = won + lost > 0 ? (won / (won + lost)) : 0;
    const avgCycleDays = cycleDurations.length > 0 ? (cycleDurations.reduce((a, b) => a + b, 0) / cycleDurations.length) : 0;

    // Recent trend: deals created per week (last 8 weeks)
    const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000);
    const recentDeals = deals.filter(d => d.createdAt >= eightWeeksAgo);
    const trendByWeek: Array<{ weekStart: string; count: number; value: number }> = [];
    const bucket = new Map<string, { count: number; value: number }>();
    for (const d of recentDeals) {
      const dt = d.createdAt;
      const weekStart = new Date(dt);
      // normalize to Monday
      const day = weekStart.getDay();
      const diff = (day === 0 ? -6 : 1) - day; // days to Monday
      weekStart.setDate(weekStart.getDate() + diff);
      weekStart.setHours(0, 0, 0, 0);
      const key = weekStart.toISOString().substring(0, 10);
      const curr = bucket.get(key) || { count: 0, value: 0 };
      curr.count += 1;
      curr.value += Number(d.value) || 0;
      bucket.set(key, curr);
    }
    for (const [weekStart, v] of Array.from(bucket.entries()).sort()) {
      trendByWeek.push({ weekStart, count: v.count, value: v.value });
    }

    const result = {
      stages: stages.map(s => ({ stage: s, count: byStage[s].count, totalValue: byStage[s].totalValue })),
      weightedPipeline,
      winRate,
      avgCycleDays,
      trendByWeek,
    };

    // Cache the result
    await this.cache.cachePipelineMetrics(tenantId, result);

    return result;
  }

  async getSalesForecast(tenantId: string, periodDays = 30) {
    // Try to get from cache first
    const cacheKey = `forecast:${tenantId}:${periodDays}`;
    const cached = await this.cache.get(cacheKey, { prefix: 'analytics' });
    if (cached) {
      return cached;
    }

    // Use historical closed/won deals revenue as basis
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const closedDeals = await this.db.deal.findMany({
      where: { tenantId, actualCloseDate: { gte: oneYearAgo } },
      select: { value: true, actualCloseDate: true },
      orderBy: { actualCloseDate: 'asc' },
    });

    // Build daily revenue series
    const daily: Array<{ date: string; revenue: number }> = [];
    const map = new Map<string, number>();
    for (const d of closedDeals) {
      const dt = d.actualCloseDate;
      const key = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())).toISOString().substring(0, 10);
      map.set(key, (map.get(key) || 0) + (Number(d.value) || 0));
    }
    for (const [k, v] of Array.from(map.entries()).sort()) daily.push({ date: k, revenue: v });

    // Moving average forecast with slight growth and weekly seasonality
    const window = 7;
    const lastDate = new Date();
    lastDate.setUTCHours(0, 0, 0, 0);
    const predictions: Array<{ date: string; predictedRevenue: number; confidence: number }> = [];
    const revenueSeries = daily.map(d => d.revenue);
    const avgRecent = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    for (let i = 1; i <= periodDays; i++) {
      const future = new Date(lastDate);
      future.setUTCDate(future.getUTCDate() + i);
      const base = avgRecent(revenueSeries.slice(-window)) || avgRecent(revenueSeries) || 0;
      const seasonality = 1 + 0.08 * Math.sin(((i % 7) / 7) * 2 * Math.PI);
      const trend = 1.01; // 1% daily trend
      const predicted = Math.max(0, Math.round(base * seasonality * trend));
      predictions.push({ date: future.toISOString().substring(0, 10), predictedRevenue: predicted, confidence: 0.75 });
      revenueSeries.push(predicted);
    }

    // Ensure predictions is always an array
    const safePredictions = Array.isArray(predictions) ? predictions : [];
    
    const result = {
      periodDays,
      totalPredicted: safePredictions.reduce((s, p) => s + (p.predictedRevenue || 0), 0),
      predictions: safePredictions,
    };

    // Cache the result
    await this.cache.set(cacheKey, result, { prefix: 'analytics', ttl: 1800 }); // 30 minutes

    return result;
  }

  async getPipelineFunnel(tenantId: string, pipelineId?: string) {
    const cacheKey = `funnel:${tenantId}:${pipelineId || 'all'}`;
    const cached = await this.cache.get(cacheKey, { prefix: 'analytics' });
    if (cached) {
      return cached;
    }

    const where: any = { tenantId };
    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    // Get all deals
    const deals = await this.db.deal.findMany({
      where,
      select: {
        id: true,
        stage: true,
        value: true,
        createdAt: true,
        actualCloseDate: true,
      },
    });

    // Define standard funnel stages
    const stages = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
    const stageMetrics: Array<{
      stage: string;
      count: number;
      value: number;
      conversionRate: number;
      dropOffRate: number;
      avgDaysInStage: number;
    }> = [];

    let previousCount = 0;
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const stageDeals = deals.filter(d => (d.stage || 'NEW').toUpperCase() === stage);
      const count = stageDeals.length;
      const value = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

      // Calculate conversion rate (percentage of previous stage that moved to this stage)
      const conversionRate = i === 0 ? 100 : previousCount > 0 ? (count / previousCount) * 100 : 0;
      
      // Calculate drop-off rate
      const dropOffRate = i === 0 ? 0 : previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0;

      // Calculate average days in stage (simplified - would need stage history for accuracy)
      const avgDaysInStage = stageDeals.length > 0
        ? stageDeals.reduce((sum, d) => {
            const days = d.actualCloseDate
              ? Math.max(0, (d.actualCloseDate.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24))
              : Math.max(0, (Date.now() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0) / stageDeals.length
        : 0;

      stageMetrics.push({
        stage,
        count,
        value,
        conversionRate: Math.round(conversionRate * 100) / 100,
        dropOffRate: Math.round(dropOffRate * 100) / 100,
        avgDaysInStage: Math.round(avgDaysInStage * 100) / 100,
      });

      previousCount = count;
    }

    // Calculate overall metrics
    const totalDeals = deals.length;
    const wonDeals = deals.filter(d => (d.stage || '').toUpperCase() === 'WON').length;
    const lostDeals = deals.filter(d => (d.stage || '').toUpperCase() === 'LOST').length;
    const overallConversionRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

    const result = {
      stages: stageMetrics,
      totalDeals,
      wonDeals,
      lostDeals,
      overallConversionRate: Math.round(overallConversionRate * 100) / 100,
    };

    await this.cache.set(cacheKey, result, { prefix: 'analytics', ttl: 1800 });
    return result;
  }

  async getRepPerformance(tenantId: string, timeframe: 'week' | 'month' | 'quarter' = 'month') {
    const cacheKey = `rep-performance:${tenantId}:${timeframe}`;
    const cached = await this.cache.get(cacheKey, { prefix: 'analytics' });
    if (cached) {
      return cached;
    }

    // Calculate date range
    const now = new Date();
    const daysMap = { week: 7, month: 30, quarter: 90 };
    const days = daysMap[timeframe];
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Get deals assigned to users in the timeframe
    const deals = await this.db.deal.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        assignedUserId: true,
        stage: true,
        value: true,
        createdAt: true,
        actualCloseDate: true,
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Group by user
    const userMetrics = new Map<string, {
      userId: string;
      userName: string;
      email: string;
      dealsCreated: number;
      dealsWon: number;
      dealsLost: number;
      totalValue: number;
      wonValue: number;
      winRate: number;
      avgDealSize: number;
      avgDaysToClose: number;
      velocity: number;
    }>();

    for (const deal of deals) {
      if (!deal.assignedUserId || !deal.assignedUser) continue;

      const userId = deal.assignedUserId;
      if (!userMetrics.has(userId)) {
        userMetrics.set(userId, {
          userId,
          userName: `${deal.assignedUser.firstName || ''} ${deal.assignedUser.lastName || ''}`.trim() || 'Unknown',
          email: deal.assignedUser.email,
          dealsCreated: 0,
          dealsWon: 0,
          dealsLost: 0,
          totalValue: 0,
          wonValue: 0,
          winRate: 0,
          avgDealSize: 0,
          avgDaysToClose: 0,
          velocity: 0,
        });
      }

      const metrics = userMetrics.get(userId)!;
      metrics.dealsCreated++;
      metrics.totalValue += Number(deal.value) || 0;

      const stage = (deal.stage || '').toUpperCase();
      if (stage === 'WON') {
        metrics.dealsWon++;
        metrics.wonValue += Number(deal.value) || 0;
      } else if (stage === 'LOST') {
        metrics.dealsLost++;
      }
    }

    // Calculate derived metrics
    const repPerformance = Array.from(userMetrics.values()).map(metrics => {
      const closedDeals = metrics.dealsWon + metrics.dealsLost;
      metrics.winRate = closedDeals > 0 ? (metrics.dealsWon / closedDeals) * 100 : 0;
      metrics.avgDealSize = metrics.dealsWon > 0 ? metrics.wonValue / metrics.dealsWon : 0;
      
      // Calculate avg days to close (simplified - would need actual close dates)
      metrics.avgDaysToClose = metrics.dealsWon > 0 ? days / 2 : 0; // Placeholder
      
      // Velocity: deals won per week
      metrics.velocity = (metrics.dealsWon / days) * 7;

      // Round values
      metrics.winRate = Math.round(metrics.winRate * 100) / 100;
      metrics.avgDealSize = Math.round(metrics.avgDealSize * 100) / 100;
      metrics.avgDaysToClose = Math.round(metrics.avgDaysToClose * 100) / 100;
      metrics.velocity = Math.round(metrics.velocity * 100) / 100;
      metrics.totalValue = Math.round(metrics.totalValue * 100) / 100;
      metrics.wonValue = Math.round(metrics.wonValue * 100) / 100;

      return metrics;
    });

    // Sort by won value descending
    repPerformance.sort((a, b) => b.wonValue - a.wonValue);

    const result = {
      timeframe,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      reps: repPerformance,
      summary: {
        totalReps: repPerformance.length,
        totalDealsCreated: repPerformance.reduce((sum, r) => sum + r.dealsCreated, 0),
        totalDealsWon: repPerformance.reduce((sum, r) => sum + r.dealsWon, 0),
        totalRevenue: repPerformance.reduce((sum, r) => sum + r.wonValue, 0),
        avgWinRate: repPerformance.length > 0
          ? repPerformance.reduce((sum, r) => sum + r.winRate, 0) / repPerformance.length
          : 0,
      },
    };

    await this.cache.set(cacheKey, result, { prefix: 'analytics', ttl: 1800 });
    return result;
  }
}


