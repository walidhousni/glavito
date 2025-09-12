import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@glavito/shared-redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  serialize?: boolean;
}

@Injectable()
export class CrmCacheService {
  private readonly logger = new Logger(CrmCacheService.name);
  private readonly defaultTTL = 300; // 5 minutes
  private readonly longTTL = 3600; // 1 hour
  private readonly shortTTL = 60; // 1 minute

  constructor(private readonly redis: RedisService) {}

  /**
   * Generate cache key with prefix
   */
  private getCacheKey(key: string, prefix?: string): string {
    return `crm:${prefix || 'default'}:${key}`;
  }

  /**
   * Get cached data
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(key, options?.prefix);
      const data = await this.redis.cacheGet(cacheKey);
      
      if (data && options?.serialize !== false) {
        return JSON.parse(data);
      }
      
      return data as T;
    } catch (error) {
      this.logger.warn(`Failed to get cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTTL;
      
      if (options?.serialize !== false) {
        await this.redis.cacheSet(cacheKey, JSON.stringify(value), ttl);
      } else {
        await this.redis.cacheSet(cacheKey, value as any, ttl);
      }
    } catch (error) {
      this.logger.warn(`Failed to set cache for key ${key}:`, error);
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string, prefix?: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key, prefix);
      await this.redis.cacheDel(cacheKey);
    } catch (error) {
      this.logger.warn(`Failed to delete cache for key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache patterns
   */
  async invalidatePattern(pattern: string, prefix?: string): Promise<void> {
    try {
      const cachePattern = this.getCacheKey(pattern, prefix);
      // Note: Redis service would need to implement pattern deletion
      // For now, we'll log the pattern for manual cleanup if needed
      this.logger.log(`Cache invalidation requested for pattern: ${cachePattern}`);
    } catch (error) {
      this.logger.warn(`Failed to invalidate cache pattern ${pattern}:`, error);
    }
  }

  /**
   * Cache with automatic TTL based on data type
   */
  async cacheWithTTL<T>(
    key: string, 
    value: T, 
    dataType: 'static' | 'dynamic' | 'realtime' = 'dynamic',
    prefix?: string
  ): Promise<void> {
    let ttl: number;
    
    switch (dataType) {
      case 'static':
        ttl = this.longTTL; // 1 hour for static data
        break;
      case 'dynamic':
        ttl = this.defaultTTL; // 5 minutes for dynamic data
        break;
      case 'realtime':
        ttl = this.shortTTL; // 1 minute for real-time data
        break;
      default:
        ttl = this.defaultTTL;
    }

    await this.set(key, value, { ttl, prefix });
  }

  /**
   * Get or set pattern for expensive operations
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions & { dataType?: 'static' | 'dynamic' | 'realtime' }
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    
    if (options?.dataType) {
      await this.cacheWithTTL(key, value, options.dataType, options.prefix);
    } else {
      await this.set(key, value, options);
    }
    
    return value;
  }

  /**
   * Cache pipeline metrics with optimized TTL
   */
  async cachePipelineMetrics(tenantId: string, metrics: any): Promise<void> {
    await this.cacheWithTTL(`pipeline:${tenantId}`, metrics, 'dynamic', 'analytics');
  }

  /**
   * Cache segment data with appropriate TTL
   */
  async cacheSegmentData(tenantId: string, segmentId: string, data: any): Promise<void> {
    await this.cacheWithTTL(`segment:${tenantId}:${segmentId}`, data, 'dynamic', 'segments');
  }

  /**
   * Cache lead scores with short TTL for real-time updates
   */
  async cacheLeadScore(tenantId: string, leadId: string, score: any): Promise<void> {
    await this.cacheWithTTL(`lead:${tenantId}:${leadId}:score`, score, 'realtime', 'leads');
  }

  /**
   * Cache deal pipeline data
   */
  async cacheDealPipeline(tenantId: string, pipelineId: string, deals: any[]): Promise<void> {
    await this.cacheWithTTL(`deals:${tenantId}:${pipelineId}`, deals, 'dynamic', 'deals');
  }

  /**
   * Invalidate tenant-specific cache
   */
  async invalidateTenantCache(tenantId: string): Promise<void> {
    const patterns = [
      `analytics:*:${tenantId}`,
      `segments:*:${tenantId}`,
      `leads:*:${tenantId}`,
      `deals:*:${tenantId}`,
      `pipeline:${tenantId}`
    ];

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string }> {
    try {
      const testKey = 'health:check';
      await this.set(testKey, { timestamp: Date.now() }, { ttl: 10 });
      const result = await this.get(testKey);
      await this.delete(testKey);
      
      if (result) {
        return { status: 'ok', message: 'Cache service is healthy' };
      } else {
        return { status: 'error', message: 'Cache read/write test failed' };
      }
    } catch (error) {
      return { status: 'error', message: `Cache health check failed: ${error.message}` };
    }
  }
}
