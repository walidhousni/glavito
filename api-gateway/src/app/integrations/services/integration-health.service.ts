import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IntegrationAdapter } from '../adapters/integration-adapter';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'down' | 'maintenance';
  latency?: number;
  error?: string;
  timestamp: Date;
}

@Injectable()
export class IntegrationHealthService {
  private readonly logger = new Logger(IntegrationHealthService.name);
  private adapterResolver?: (provider: string) => IntegrationAdapter | null;

  constructor(private prisma: PrismaService) {}

  /**
   * Set adapter resolver (injected from IntegrationsService)
   */
  setAdapterResolver(resolver: (provider: string) => IntegrationAdapter | null) {
    this.adapterResolver = resolver;
  }

  /**
   * Check health of a specific integration
   */
  async checkIntegrationHealth(integrationId: string): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const integration = await this.prisma.integrationConnector.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new Error('Integration not found');
      }

      // Check if integration is disabled
      if (integration.status === 'disabled') {
        return {
          status: 'maintenance',
          latency: Date.now() - startTime,
          timestamp: new Date(),
        };
      }

      // Perform real health check based on provider
      const healthStatus = await this.performProviderHealthCheck(integration);
      const latency = Date.now() - startTime;

      return {
        status: healthStatus.status,
        latency,
        error: healthStatus.error,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'down',
        error: (error as Error).message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Perform provider-specific health check
   */
  private async performProviderHealthCheck(integration: any): Promise<{ status: HealthCheckResult['status']; error?: string }> {
    const provider = integration.provider;
    const config = (integration.config || {}) as { accessToken?: string; refreshToken?: string; instanceUrl?: string };

    // Check if credentials exist
    if (!config.accessToken && !config.refreshToken) {
      return { status: 'down', error: 'No credentials configured' };
    }

    // Check token expiration
    const cfg = config as { obtainedAt?: string; expiresIn?: number };
    if (cfg.obtainedAt && cfg.expiresIn) {
      const obtainedMs = new Date(cfg.obtainedAt).getTime();
      const expiresMs = obtainedMs + Number(cfg.expiresIn) * 1000;
      const now = Date.now();
      
      if (expiresMs < now) {
        // Token expired, try to refresh if refresh token exists
        if (config.refreshToken && this.adapterResolver) {
          try {
            const adapter = this.adapterResolver(provider);
            if (adapter && 'refreshToken' in adapter) {
              await (adapter as any).refreshToken({
                tenantId: integration.tenantId,
                refreshToken: config.refreshToken,
              });
              return { status: 'healthy' };
            }
          } catch (refreshError: any) {
            return { status: 'degraded', error: `Token expired and refresh failed: ${refreshError?.message}` };
          }
        }
        return { status: 'degraded', error: 'Access token expired' };
      }
    }

    // Test actual API connectivity based on provider
    try {
      const testResult = await this.testProviderConnection(provider, config);
      return testResult;
    } catch (error: any) {
      return { status: 'down', error: error?.message || 'Connection test failed' };
    }
  }

  /**
   * Test provider-specific connection
   */
  private async testProviderConnection(provider: string, config: any): Promise<{ status: HealthCheckResult['status']; error?: string }> {
    const axios = require('axios');
    const accessToken = config.accessToken;

    if (!accessToken) {
      return { status: 'down', error: 'No access token' };
    }

    try {
      switch (provider) {
        case 'hubspot': {
          // Test HubSpot API with a simple request
          const response = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 5000,
          });
          return response.status === 200 ? { status: 'healthy' } : { status: 'degraded' };
        }
        case 'salesforce': {
          // Test Salesforce API
          const instanceUrl = config.instanceUrl || 'https://login.salesforce.com';
          const response = await axios.get(`${instanceUrl}/services/data/v57.0/sobjects/Contact/describe`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 5000,
          });
          return response.status === 200 ? { status: 'healthy' } : { status: 'degraded' };
        }
        case 'dynamics': {
          // Test Dynamics 365 API
          const resource = config.resource || 'https://crm.dynamics.com';
          const response = await axios.get(`${resource}/api/data/v9.2/contacts?$top=1`, {
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            timeout: 5000,
          });
          return response.status === 200 ? { status: 'healthy' } : { status: 'degraded' };
        }
        case 'mailchimp': {
          // Ping list endpoint using token
          const response = await axios.get('https://us1.api.mailchimp.com/3.0/lists?count=1', {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 5000,
          });
          return response.status === 200 ? { status: 'healthy' } : { status: 'degraded' };
        }
        case 'sendgrid': {
          const response = await axios.get('https://api.sendgrid.com/v3/scopes', {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 5000,
          });
          return response.status === 200 ? { status: 'healthy' } : { status: 'degraded' };
        }
        case 'slack': {
          const response = await axios.post('https://slack.com/api/auth.test', null, {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 5000,
          });
          return response.data?.ok ? { status: 'healthy' } : { status: 'degraded', error: response.data?.error };
        }
        case 'twilio': {
          // For Twilio, we often need Account SID + Auth Token; treat accessToken as basic for health
          // If instance data present, attempt simple verify on Messages resource
          const accountSid = config.accountSid;
          const token = config.authToken || accessToken;
          if (!accountSid || !token) return { status: 'degraded', error: 'Missing Account SID or token' };
          const response = await axios.get(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
            auth: { username: accountSid, password: token },
            timeout: 5000,
          });
          return response.status === 200 ? { status: 'healthy' } : { status: 'degraded' };
        }
        case 'shopify': {
          const shop = config.shop || config.instanceUrl || '';
          const baseUrl = shop.startsWith('https://') ? shop : `https://${shop}`;
          const response = await axios.get(`${baseUrl}/admin/api/2023-10/shop.json`, {
            headers: { 'X-Shopify-Access-Token': accessToken },
            timeout: 5000,
          });
          return response.status === 200 ? { status: 'healthy' } : { status: 'degraded' };
        }
        case 'woocommerce': {
          // Woo REST typically uses consumer key/secret; treat accessToken as placeholder bearer for ping
          const resource = config.resource || config.instanceUrl || '';
          if (!resource) return { status: 'degraded', error: 'Missing store URL' };
          const response = await axios.get(`${resource.replace(/\/$/, '')}/wp-json/wc/v3`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 5000,
          });
          return response.status < 500 ? { status: 'healthy' } : { status: 'degraded' };
        }
        case 'stripe': {
          const response = await axios.get('https://api.stripe.com/v1/account', {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 5000,
          });
          return response.status === 200 ? { status: 'healthy' } : { status: 'degraded' };
        }
        default:
          // For other providers, just check if token exists
          return { status: 'healthy' };
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        return { status: 'degraded', error: 'Authentication failed - token may be expired' };
      }
      if (error?.response?.status === 403) {
        return { status: 'degraded', error: 'Access forbidden - check permissions' };
      }
      if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
        return { status: 'down', error: 'Connection timeout or refused' };
      }
      return { status: 'down', error: error?.message || 'Connection test failed' };
    }
  }

  /**
   * Update health record
   */
  async updateHealthRecord(
    integrationId: string,
    result: HealthCheckResult
  ): Promise<void> {
    const integration = await this.prisma.integrationConnector.findUnique({
      where: { id: integrationId },
    });

    if (!integration) return;

    const health = await this.prisma.integrationHealth.findUnique({
      where: { integrationId },
    });

    if (health) {
      // Calculate success rate
      const totalChecks = health.errorCount + (health.successRate * 100);
      const successChecks = result.status === 'healthy' ? totalChecks + 1 : totalChecks;
      const newSuccessRate = (successChecks / (totalChecks + 1)) * 100;

      await this.prisma.integrationHealth.update({
        where: { integrationId },
        data: {
          status: result.status,
          lastCheck: result.timestamp,
          lastError: result.error,
          lastErrorAt: result.error ? result.timestamp : undefined,
          errorCount: result.error ? { increment: 1 } : undefined,
          successRate: newSuccessRate,
          avgSyncTime: result.latency,
        },
      });
    } else {
      await this.prisma.integrationHealth.create({
        data: {
          integrationId,
          tenantId: integration.tenantId,
          status: result.status,
          lastCheck: result.timestamp,
          lastError: result.error,
          lastErrorAt: result.error ? result.timestamp : undefined,
          errorCount: result.error ? 1 : 0,
          successRate: result.status === 'healthy' ? 100 : 0,
          avgSyncTime: result.latency,
        },
      });
    }
  }

  /**
   * Log integration activity
   */
  async logActivity(params: {
    integrationId: string;
    tenantId: string;
    action: string;
    status: 'success' | 'error' | 'warning' | 'info';
    direction?: 'inbound' | 'outbound';
    duration?: number;
    recordsProcessed?: number;
    recordsFailed?: number;
    errorMessage?: string;
    userId?: string;
    metadata?: any;
  }): Promise<void> {
    await this.prisma.integrationLog.create({
      data: {
        integrationId: params.integrationId,
        tenantId: params.tenantId,
        action: params.action,
        status: params.status,
        direction: params.direction,
        duration: params.duration,
        recordsProcessed: params.recordsProcessed,
        recordsFailed: params.recordsFailed,
        errorMessage: params.errorMessage,
        userId: params.userId,
        metadata: params.metadata || {},
      },
    });
  }

  /**
   * Get health status for all integrations of a tenant
   */
  async getTenantIntegrationsHealth(tenantId: string) {
    return this.prisma.integrationHealth.findMany({
      where: { tenantId },
      include: {
        integration: {
          select: {
            id: true,
            provider: true,
            status: true,
          },
        },
      },
      orderBy: {
        lastCheck: 'desc',
      },
    });
  }

  /**
   * Get integration logs
   */
  async getIntegrationLogs(params: {
    integrationId?: string;
    tenantId?: string;
    action?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.prisma.integrationLog.findMany({
      where: {
        integrationId: params.integrationId,
        tenantId: params.tenantId,
        action: params.action,
        status: params.status,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: params.limit || 50,
      skip: params.offset || 0,
    });
  }

  /**
   * Check API rate limits
   */
  async checkRateLimit(integrationId: string): Promise<{
    isLimited: boolean;
    remaining: number;
    resetAt?: Date;
  }> {
    const health = await this.prisma.integrationHealth.findUnique({
      where: { integrationId },
    });

    if (!health) {
      return { isLimited: false, remaining: 0 };
    }

    return {
      isLimited: health.rateLimitHit,
      remaining: health.apiLimit ? health.apiLimit - health.apiCallsToday : 0,
      resetAt: health.rateLimitResetAt || undefined,
    };
  }

  /**
   * Record API call
   */
  async recordApiCall(integrationId: string): Promise<void> {
    await this.prisma.integrationHealth.update({
      where: { integrationId },
      data: {
        apiCallsToday: { increment: 1 },
        apiCallsMonth: { increment: 1 },
      },
    });
  }

  /**
   * Cron job to check all active integrations
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async performHealthChecks() {
    this.logger.log('Starting health checks for all active integrations');

    const integrations = await this.prisma.integrationConnector.findMany({
      where: {
        status: 'connected',
        syncEnabled: true,
      },
    });

    for (const integration of integrations) {
      try {
        const result = await this.checkIntegrationHealth(integration.id);
        await this.updateHealthRecord(integration.id, result);
      } catch (error) {
        this.logger.error(
          `Health check failed for integration ${integration.id}`,
          error
        );
      }
    }

    this.logger.log(`Completed health checks for ${integrations.length} integrations`);
  }

  /**
   * Reset daily API call counters (runs at midnight)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyCounters() {
    await this.prisma.integrationHealth.updateMany({
      data: {
        apiCallsToday: 0,
      },
    });
    this.logger.log('Reset daily API call counters');
  }

  /**
   * Reset monthly API call counters (runs on 1st of month)
   */
  @Cron('0 0 1 * *')
  async resetMonthlyCounters() {
    await this.prisma.integrationHealth.updateMany({
      data: {
        apiCallsMonth: 0,
      },
    });
    this.logger.log('Reset monthly API call counters');
  }

  /**
   * Clean up old logs (keep last 30 days)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldLogs() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.integrationLog.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old integration logs`);
  }
}

