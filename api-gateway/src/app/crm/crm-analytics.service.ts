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

    const result = {
      periodDays,
      totalPredicted: predictions.reduce((s, p) => s + p.predictedRevenue, 0),
      predictions,
    };

    // Cache the result
    await this.cache.set(cacheKey, result, { prefix: 'analytics', ttl: 1800 }); // 30 minutes

    return result;
  }
}


