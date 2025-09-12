import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { CrmCacheService } from './crm-cache.service';

export interface PerformanceMetrics {
  queryTime: number;
  cacheHitRate: number;
  responseSize: number;
  memoryUsage: number;
  timestamp: Date;
}

export interface QueryPerformance {
  query: string;
  duration: number;
  rowsReturned: number;
  timestamp: Date;
}

@Injectable()
export class CrmPerformanceService {
  private readonly logger = new Logger(CrmPerformanceService.name);
  private readonly metrics: PerformanceMetrics[] = [];
  private readonly queryMetrics: QueryPerformance[] = [];
  private readonly maxMetricsHistory = 1000;

  constructor(
    private readonly db: DatabaseService,
    private readonly cache: CrmCacheService
  ) {}

  /**
   * Record performance metrics
   */
  recordMetrics(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const fullMetrics: PerformanceMetrics = {
      ...metrics,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetrics);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.splice(0, this.metrics.length - this.maxMetricsHistory);
    }

    // Log slow queries
    if (metrics.queryTime > 1000) { // 1 second
      this.logger.warn(`Slow query detected: ${metrics.queryTime}ms`);
    }
  }

  /**
   * Record query performance
   */
  recordQuery(query: string, duration: number, rowsReturned: number): void {
    const queryMetric: QueryPerformance = {
      query: this.sanitizeQuery(query),
      duration,
      rowsReturned,
      timestamp: new Date(),
    };

    this.queryMetrics.push(queryMetric);

    // Keep only recent query metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics.splice(0, this.queryMetrics.length - this.maxMetricsHistory);
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeWindowMinutes: number = 60): {
    averageQueryTime: number;
    cacheHitRate: number;
    slowQueries: number;
    totalQueries: number;
    memoryUsage: number;
  } {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);
    const recentQueries = this.queryMetrics.filter(q => q.timestamp >= cutoffTime);

    const averageQueryTime = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.queryTime, 0) / recentMetrics.length 
      : 0;

    const cacheHitRate = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / recentMetrics.length
      : 0;

    const slowQueries = recentQueries.filter(q => q.duration > 1000).length;
    const totalQueries = recentQueries.length;

    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

    return {
      averageQueryTime,
      cacheHitRate,
      slowQueries,
      totalQueries,
      memoryUsage,
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries(thresholdMs: number = 1000, limit: number = 10): QueryPerformance[] {
    return this.queryMetrics
      .filter(q => q.duration > thresholdMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get cache performance
   */
  async getCachePerformance(): Promise<{
    hitRate: number;
    missRate: number;
    totalRequests: number;
    averageResponseTime: number;
  }> {
    // This would integrate with Redis metrics in a real implementation
    // For now, return mock data
    return {
      hitRate: 0.85,
      missRate: 0.15,
      totalRequests: 1000,
      averageResponseTime: 5,
    };
  }

  /**
   * Optimize database queries
   */
  async optimizeQueries(): Promise<{
    suggestions: string[];
    indexesToAdd: string[];
    queriesToOptimize: string[];
  }> {
    const suggestions: string[] = [];
    const indexesToAdd: string[] = [];
    const queriesToOptimize: string[] = [];

    // Analyze slow queries
    const slowQueries = this.getSlowQueries(500, 20);
    
    for (const query of slowQueries) {
      queriesToOptimize.push(query.query);
      
      // Simple heuristics for optimization suggestions
      if (query.query.includes('WHERE') && !query.query.includes('INDEX')) {
        suggestions.push(`Consider adding an index for the WHERE clause in: ${query.query.substring(0, 100)}...`);
      }
      
      if (query.query.includes('ORDER BY') && query.duration > 2000) {
        suggestions.push(`Consider adding an index for the ORDER BY clause in: ${query.query.substring(0, 100)}...`);
      }
      
      if (query.rowsReturned > 1000) {
        suggestions.push(`Consider adding pagination for query returning ${query.rowsReturned} rows`);
      }
    }

    // Suggest common indexes
    const commonPatterns = this.analyzeQueryPatterns();
    for (const pattern of commonPatterns) {
      if (pattern.frequency > 10 && pattern.averageDuration > 200) {
        indexesToAdd.push(`Index for ${pattern.pattern} (used ${pattern.frequency} times, avg ${pattern.averageDuration}ms)`);
      }
    }

    return {
      suggestions,
      indexesToAdd,
      queriesToOptimize,
    };
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics(olderThanHours: number = 24): number {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    const initialMetricsCount = this.metrics.length;
    const initialQueriesCount = this.queryMetrics.length;
    
    // Remove old metrics
    const metricsIndex = this.metrics.findIndex(m => m.timestamp >= cutoffTime);
    if (metricsIndex > 0) {
      this.metrics.splice(0, metricsIndex);
    }
    
    // Remove old query metrics
    const queriesIndex = this.queryMetrics.findIndex(q => q.timestamp >= cutoffTime);
    if (queriesIndex > 0) {
      this.queryMetrics.splice(0, queriesIndex);
    }
    
    const cleanedMetrics = initialMetricsCount - this.metrics.length;
    const cleanedQueries = initialQueriesCount - this.queryMetrics.length;
    
    this.logger.log(`Cleaned up ${cleanedMetrics} metrics and ${cleanedQueries} query records`);
    
    return cleanedMetrics + cleanedQueries;
  }

  /**
   * Health check for performance monitoring
   */
  async healthCheck(): Promise<{
    status: 'ok' | 'warning' | 'error';
    message: string;
    metrics: any;
  }> {
    try {
      const summary = this.getPerformanceSummary(5); // Last 5 minutes
      
      let status: 'ok' | 'warning' | 'error' = 'ok';
      let message = 'Performance monitoring is healthy';
      
      if (summary.averageQueryTime > 2000) {
        status = 'error';
        message = `Average query time is too high: ${summary.averageQueryTime}ms`;
      } else if (summary.averageQueryTime > 1000) {
        status = 'warning';
        message = `Average query time is elevated: ${summary.averageQueryTime}ms`;
      }
      
      if (summary.cacheHitRate < 0.7) {
        status = status === 'error' ? 'error' : 'warning';
        message += ` | Cache hit rate is low: ${(summary.cacheHitRate * 100).toFixed(1)}%`;
      }
      
      if (summary.slowQueries > 10) {
        status = 'warning';
        message += ` | ${summary.slowQueries} slow queries detected`;
      }
      
      return {
        status,
        message,
        metrics: summary,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Performance monitoring error: ${error.message}`,
        metrics: {},
      };
    }
  }

  /**
   * Private helper to sanitize queries for logging
   */
  private sanitizeQuery(query: string): string {
    // Remove sensitive data and limit length
    return query
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, 'YYYY-MM-DD') // Replace dates
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 'email@domain.com') // Replace emails
      .substring(0, 200); // Limit length
  }

  /**
   * Private helper to analyze query patterns
   */
  private analyzeQueryPatterns(): Array<{
    pattern: string;
    frequency: number;
    averageDuration: number;
  }> {
    const patterns = new Map<string, { count: number; totalDuration: number }>();
    
    for (const query of this.queryMetrics) {
      // Extract basic pattern (simplified)
      const pattern = query.query
        .replace(/\b\w+\b/g, 'FIELD') // Replace field names
        .replace(/\b\d+\b/g, 'VALUE') // Replace values
        .substring(0, 50); // Limit length
      
      const existing = patterns.get(pattern) || { count: 0, totalDuration: 0 };
      patterns.set(pattern, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + query.duration,
      });
    }
    
    return Array.from(patterns.entries()).map(([pattern, data]) => ({
      pattern,
      frequency: data.count,
      averageDuration: data.totalDuration / data.count,
    }));
  }
}
