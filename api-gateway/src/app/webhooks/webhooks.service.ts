import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '@glavito/shared-database';
import { EventPublisherService, EventPayload } from '@glavito/shared-kafka';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService implements OnModuleInit {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
    private readonly events: EventPublisherService,
    // Lazy import prom-client; MetricsService ensures default collection
  ) {}

  async onModuleInit() {
    // Subscribe to ticket events and forward to webhook endpoints
    try {
      // Initialize custom metrics
      try {
        const prom = await import('prom-client');
        // Counters
        this.metricDeliveriesTotal = new prom.Counter({
          name: 'webhook_deliveries_total',
          help: 'Total webhook deliveries attempted',
          labelNames: ['tenant', 'event', 'status'] as const,
        });
        this.metricDeliveryLatencyMs = new prom.Histogram({
          name: 'webhook_delivery_latency_ms',
          help: 'Webhook delivery latency in ms',
          labelNames: ['tenant', 'event', 'status'] as const,
          buckets: [50, 100, 200, 500, 1000, 2000, 5000],
        });
      } catch (e) {
        this.logger.warn('Metrics setup skipped');
      }

      await this.events.subscribeToEvents(['ticket-events'], async (event) => {
        try {
          await this.sendOutgoingWebhook(event);
        } catch (e) {
          this.logger.error('Webhook forwarding error', e as any);
        }
      });
      this.logger.log('WebhooksService subscribed to ticket-events');
    } catch (e) {
      this.logger.error('Failed to subscribe to ticket-events', e as any);
    }
  }

  private metricDeliveriesTotal?: any;
  private metricDeliveryLatencyMs?: any;

  handleIncomingWebhook(payload: any, headers: Record<string, string>) {
    // Placeholder: forward to channel adapters or processors as needed later
    this.logger.log(`Incoming webhook headers: ${JSON.stringify(headers)}`);
    this.logger.log(`Incoming webhook payload: ${JSON.stringify(payload).slice(0, 1000)}`);

    return {
      message: 'Webhook received successfully',
      timestamp: new Date().toISOString(),
    };
  }

  async handleInbound(provider: string, payload: any, headers: Record<string, string>) {
    const tenantId = (headers['x-tenant-id'] || headers['x-tenant'] || headers['x-glavito-tenant'] || '').toString();
    this.logger.log(`[Inbound:${provider}] tenant=${tenantId} size=${JSON.stringify(payload).length}`);
    if (!tenantId) {
      return { ok: false, error: 'Missing tenant header (x-tenant-id)' };
    }
    const connector = await this.prisma['integrationConnector'].findFirst({ where: { tenantId, provider } });
    if (!connector) {
      return { ok: false, error: 'Connector not found' };
    }
    // Minimal log entry for inbound
    await this.prisma['integrationSyncLog'].create({
      data: {
        tenantId,
        connectorId: connector.id,
        direction: 'inbound',
        entity: 'customers',
        status: 'success',
        stats: { imported: Array.isArray(payload) ? payload.length : 1 },
        completedAt: new Date(),
      },
    });
    return { ok: true };
  }

  async registerEndpoint(params: {
    tenantId: string;
    name: string;
    url: string;
    events: string[];
    secret?: string;
    headers?: Record<string, string>;
    retryPolicy?: { maxRetries?: number; retryDelay?: number; backoffMultiplier?: number };
  }) {
    const endpoint = await this.prisma['webhookEndpoint'].create({
      data: {
        tenantId: params.tenantId,
        name: params.name,
        url: params.url,
        events: params.events,
        secret: params.secret,
        headers: params.headers || {},
        retryPolicy: params.retryPolicy || {},
      },
    });
    return endpoint;
  }

  async listEndpoints(tenantId: string) {
    return this.prisma['webhookEndpoint'].findMany({ where: { tenantId } });
  }

  async deleteEndpoint(tenantId: string, endpointId: string) {
    await this.prisma['webhookEndpoint'].deleteMany({ where: { id: endpointId, tenantId } });
    return { success: true };
  }

  async listDeliveries(tenantId: string, endpointId: string, take = 50) {
    // Ensure endpoint belongs to tenant
    const endpoint = await this.prisma['webhookEndpoint'].findFirst({ where: { id: endpointId, tenantId } });
    if (!endpoint) return [];
    return this.prisma['webhookDelivery'].findMany({
      where: { endpointId },
      orderBy: { timestamp: 'desc' },
      take,
    });
  }

  async sendOutgoingWebhook(event: EventPayload): Promise<void> {
    // Find active endpoints subscribed to this event
    const endpoints = await this.prisma['webhookEndpoint'].findMany({
      where: {
        tenantId: event.tenantId,
        isActive: true,
        OR: [
          { events: { has: event.eventType } },
          { events: { has: '*' } },
        ],
      },
    });

    if (!endpoints.length) return;

    await Promise.all(
      endpoints.map(async (endpoint: any) => {
        const delivery = await this.prisma['webhookDelivery'].create({
          data: {
            endpointId: endpoint.id,
            eventType: event.eventType,
            payload: event.data,
            headers: {},
            status: 'pending',
            attempt: 0,
            maxAttempts: (endpoint.retryPolicy?.maxRetries as number) || 3,
          },
        });

        try {
          await this.dispatch(endpoint, event, delivery.id);
        } catch (err: any) {
          this.logger.error(`Initial webhook dispatch failed: ${err?.message}`);
        }
      })
    );
  }

  private signBody(secret: string, body: any): string {
    const json = typeof body === 'string' ? body : JSON.stringify(body);
    return crypto.createHmac('sha256', secret).update(json).digest('hex');
  }

  private async dispatch(endpoint: any, event: EventPayload, deliveryId: string): Promise<void> {
    const body = {
      id: deliveryId,
      type: event.eventType,
      tenantId: event.tenantId,
      timestamp: event.timestamp,
      data: event.data,
      metadata: event.metadata || {},
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Glavito-Event': event.eventType,
      'X-Glavito-Tenant': event.tenantId,
      ...(endpoint.headers || {}),
    };

    if (endpoint.secret) {
      headers['X-Glavito-Signature'] = this.signBody(endpoint.secret, body);
    }

    // Update delivery start
    await this.prisma['webhookDelivery'].update({
      where: { id: deliveryId },
      data: { startedAt: new Date() },
    });

    const timeoutMs = parseInt(this.config.get<string>('WEBHOOK_TIMEOUT') || '10000');

    const start = Date.now();
    try {
      const response = await firstValueFrom(
        this.http.post(endpoint.url, body, { headers, timeout: timeoutMs }),
      );

      await this.prisma['webhookDelivery'].update({
        where: { id: deliveryId },
        data: {
          status: 'success',
          responseStatus: response.status,
          responseBody: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
          headers,
          completedAt: new Date(),
        },
      });
      // metrics
      try {
        this.metricDeliveriesTotal?.inc({ tenant: event.tenantId, event: event.eventType, status: 'success' });
        this.metricDeliveryLatencyMs?.observe({ tenant: event.tenantId, event: event.eventType, status: 'success' }, Date.now() - start);
      } catch (err) {
        this.logger.debug('Metrics record failed (success)', (err as any)?.message || String(err));
      }
    } catch (error: any) {
      const attemptInfo = await this.prisma['webhookDelivery'].update({
        where: { id: deliveryId },
        data: {
          status: 'failed',
          responseStatus: error?.response?.status || null,
          responseBody: error?.response?.data ? JSON.stringify(error.response.data) : error?.message,
          attempt: { increment: 1 },
          errorMessage: error?.message || 'Unknown error',
          headers,
          completedAt: new Date(),
        },
      });

      // Schedule retry (simple backoff)
      const nextAttempt = (attemptInfo.attempt as number) + 1;
      const maxAttempts = attemptInfo.maxAttempts as number;
      // metrics
      try {
        this.metricDeliveriesTotal?.inc({ tenant: event.tenantId, event: event.eventType, status: 'failed' });
        this.metricDeliveryLatencyMs?.observe({ tenant: event.tenantId, event: event.eventType, status: 'failed' }, Date.now() - start);
      } catch (err) {
        this.logger.debug('Metrics record failed (failed)', (err as any)?.message || String(err));
      }
      if (nextAttempt <= maxAttempts) {
        const baseDelay = (endpoint.retryPolicy?.retryDelay as number) || 2000;
        const multiplier = (endpoint.retryPolicy?.backoffMultiplier as number) || 2;
        const delay = baseDelay * Math.pow(multiplier, nextAttempt - 1);

        setTimeout(() => {
          // fire and forget retry
          this.dispatch(endpoint, event, deliveryId).catch((e) =>
            this.logger.error(`Retry dispatch failed: ${e?.message}`),
          );
        }, delay);
      }
    }
  }
}