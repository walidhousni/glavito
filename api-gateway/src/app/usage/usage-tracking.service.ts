import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

export interface StorageUsageData {
  tenantId: string;
  resourceType: 'file_upload' | 'brand_asset' | 'data_import' | 'attachment';
  resourceId?: string;
  fileName?: string;
  fileSize: number;
  storageType: 's3' | 'local';
  bucket?: string;
  key?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface ApiUsageData {
  tenantId: string;
  userId?: string;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  ipAddress?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Track storage usage for a tenant
   */
  async trackStorageUsage(data: StorageUsageData): Promise<void> {
    try {
      await this.databaseService.storageUsage.create({
        data: {
          tenantId: data.tenantId,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          fileName: data.fileName,
          fileSize: data.fileSize,
          storageType: data.storageType,
          bucket: data.bucket,
          key: data.key,
          mimeType: data.mimeType,
          metadata: data.metadata || {},
        },
      });
    } catch (error) {
      this.logger.error('Failed to track storage usage', error);
      // Don't throw - usage tracking should not break the main flow
    }
  }

  /**
   * Track API usage for a tenant
   */
  async trackApiUsage(data: ApiUsageData): Promise<void> {
    try {
      await this.databaseService.apiUsage.create({
        data: {
          tenantId: data.tenantId,
          userId: data.userId,
          endpoint: data.endpoint,
          method: data.method,
          statusCode: data.statusCode,
          duration: data.duration,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
          requestId: data.requestId,
          metadata: data.metadata || {},
        },
      });
    } catch (error) {
      this.logger.error('Failed to track API usage', error);
      // Don't throw - usage tracking should not break the main flow
    }
  }

  /**
   * Get total storage usage for a tenant (in bytes)
   */
  async getStorageUsage(tenantId: string): Promise<number> {
    try {
      const result = await this.databaseService.storageUsage.aggregate({
        where: { tenantId },
        _sum: { fileSize: true },
      });
      return result._sum.fileSize || 0;
    } catch (error) {
      this.logger.error('Failed to get storage usage', error);
      return 0;
    }
  }

  /**
   * Get total API calls for a tenant
   */
  async getApiUsage(tenantId: string): Promise<number> {
    try {
      const result = await this.databaseService.apiUsage.count({
        where: { tenantId },
      });
      return result;
    } catch (error) {
      this.logger.error('Failed to get API usage', error);
      return 0;
    }
  }

  /**
   * Get storage usage by resource type for a tenant
   */
  async getStorageUsageByType(tenantId: string): Promise<Record<string, number>> {
    try {
      const results = await this.databaseService.storageUsage.groupBy({
        by: ['resourceType'],
        where: { tenantId },
        _sum: { fileSize: true },
      });

      const usage: Record<string, number> = {};
      for (const result of results) {
        usage[result.resourceType] = result._sum.fileSize || 0;
      }
      return usage;
    } catch (error) {
      this.logger.error('Failed to get storage usage by type', error);
      return {};
    }
  }

  /**
   * Get API usage by endpoint for a tenant
   */
  async getApiUsageByEndpoint(tenantId: string): Promise<Record<string, number>> {
    try {
      const results = await this.databaseService.apiUsage.groupBy({
        by: ['endpoint'],
        where: { tenantId },
        _count: { _all: true },
      });

      const usage: Record<string, number> = {};
      for (const result of results) {
        usage[result.endpoint] = result._count._all;
      }
      return usage;
    } catch (error) {
      this.logger.error('Failed to get API usage by endpoint', error);
      return {};
    }
  }

  /**
   * Get usage statistics for a tenant within a date range
   */
  async getUsageStats(tenantId: string, startDate?: Date, endDate?: Date): Promise<{
    storageUsage: number;
    apiCalls: number;
    storageByType: Record<string, number>;
    apiByEndpoint: Record<string, number>;
  }> {
    const whereClause: any = { tenantId };
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    try {
      const [storageResult, apiResult, storageByType, apiByEndpoint] = await Promise.all([
        this.databaseService.storageUsage.aggregate({
          where: whereClause,
          _sum: { fileSize: true },
        }),
        this.databaseService.apiUsage.count({
          where: whereClause,
        }),
        this.getStorageUsageByType(tenantId),
        this.getApiUsageByEndpoint(tenantId),
      ]);

      return {
        storageUsage: storageResult._sum.fileSize || 0,
        apiCalls: apiResult,
        storageByType,
        apiByEndpoint,
      };
    } catch (error) {
      this.logger.error('Failed to get usage stats', error);
      return {
        storageUsage: 0,
        apiCalls: 0,
        storageByType: {},
        apiByEndpoint: {},
      };
    }
  }

  /**
   * Clean up old usage records (for data retention)
   */
  async cleanupOldRecords(olderThanDays: number = 365): Promise<{ storageDeleted: number; apiDeleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      const [storageResult, apiResult] = await Promise.all([
        this.databaseService.storageUsage.deleteMany({
          where: { createdAt: { lt: cutoffDate } },
        }),
        this.databaseService.apiUsage.deleteMany({
          where: { createdAt: { lt: cutoffDate } },
        }),
      ]);

      this.logger.log(`Cleaned up ${storageResult.count} storage records and ${apiResult.count} API records older than ${olderThanDays} days`);

      return {
        storageDeleted: storageResult.count,
        apiDeleted: apiResult.count,
      };
    } catch (error) {
      this.logger.error('Failed to cleanup old records', error);
      return { storageDeleted: 0, apiDeleted: 0 };
    }
  }
}
