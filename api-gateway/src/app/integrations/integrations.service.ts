import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { Prisma as PrismaNS } from '@prisma/client';
import { createHmac } from 'crypto';
import { SalesforceAdapter } from './adapters/salesforce.adapter';
import { HubspotAdapter } from './adapters/hubspot.adapter';
import { DynamicsAdapter } from './adapters/dynamics.adapter';
import { MarketoAdapter } from './adapters/marketo.adapter';
import { PardotAdapter } from './adapters/pardot.adapter';
import { MailchimpAdapter } from './adapters/mailchimp.adapter';
import { SendGridAdapter } from './adapters/sendgrid.adapter';
import { SlackAdapter } from './adapters/slack.adapter';
import { TwilioAdapter } from './adapters/twilio.adapter';
import { ShopifyAdapter } from './adapters/shopify.adapter';
import { WooCommerceAdapter } from './adapters/woocommerce.adapter';
import { StripeAdapter } from './adapters/stripe.adapter';
import { IntegrationHealthService } from './services/integration-health.service';
import { CrmSyncService } from './services/crm-sync.service';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly salesforce: SalesforceAdapter,
    private readonly hubspot: HubspotAdapter,
    private readonly dynamics: DynamicsAdapter,
    private readonly marketo: MarketoAdapter,
    private readonly pardot: PardotAdapter,
    private readonly mailchimp: MailchimpAdapter,
    private readonly sendgrid: SendGridAdapter,
    private readonly slack: SlackAdapter,
    private readonly twilio: TwilioAdapter,
    private readonly shopify: ShopifyAdapter,
    private readonly woocommerce: WooCommerceAdapter,
    private readonly stripe: StripeAdapter,
    @Optional() private readonly healthService?: IntegrationHealthService,
    @Optional() private readonly crmSync?: CrmSyncService,
  ) {}

  // Public catalog inspired by eGrow directory
  async getCatalog() {
    // Load from DB (IntegrationMarketplace) and map to catalog shape
    const records = await this.prisma.integrationMarketplace.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        name: true,
        category: true,
        description: true,
        icon: true,
        authType: true,
        webhookSupport: true,
        capabilities: true,
        features: true,
      },
    });

    const items = records.map((r) => {
      const badges: string[] = [];
      if (r.authType === 'oauth2') badges.push('OAuth');
      if (r.webhookSupport) badges.push('Webhook');
      // Heuristics from capabilities/features JSON
      const caps = (r.capabilities as any) || {};
      const feats = (r.features as any) || [];
      if ((caps && (caps.two_way || caps.bidirectional)) || feats.includes('two_way')) {
        badges.push('Bidirectional');
      }
      if (feats.includes('automations')) badges.push('Automations');
      if (Object.keys(caps || {}).length && !badges.length) badges.push('API Connection');

      // Capabilities list for UI
      const capabilitiesList: string[] = Array.isArray(caps)
        ? caps
        : Object.keys(caps || {});

      return {
        provider: r.slug,
        name: r.name,
        category: (r.category || 'productivity') as any,
        description: r.description,
        badges,
        capabilities: capabilitiesList,
        icon: r.icon || undefined,
      };
    });

    const categorySet = new Set(items.map((i) => i.category));
    const categories = Array.from(categorySet).map((key) => ({
      key: key as any,
      label:
        key === 'ecommerce'
          ? 'E-commerce'
          : key === 'crm'
          ? 'CRM'
          : key === 'automation'
          ? 'Automation'
          : key === 'shipping'
          ? 'Shipping & Logistics'
          : key === 'marketing'
          ? 'Marketing'
          : key === 'communication'
          ? 'Communication'
          : 'Productivity',
    }));

    const metrics = {
      prebuilt: items.length,
      avgSetupMinutes: 5,
      uptime: 99.9,
      support: '24/7',
    };

    return { metrics, items, categories };
  }

  // Channel setup helpers (stores configuration in IntegrationStatus and ensures Channel)
  async setupWhatsApp(tenantId: string, config: Record<string, unknown>) {
    // Save integration status/configuration
    await this.upsertStatus(tenantId, 'whatsapp', { status: 'connected', configuration: (config as unknown) as any });
    // Ensure Channel row exists
    const existing = await this.prisma.channel.findFirst({ where: { tenantId, type: 'whatsapp' } });
    if (!existing) {
      await this.prisma.channel.create({ data: { tenantId, type: 'whatsapp', name: 'WhatsApp', config: config as any, isActive: true } });
    } else {
      await this.prisma.channel.update({ where: { id: existing.id }, data: { config: config as any, isActive: true } });
    }
    return { message: 'WhatsApp configured' } as any;
  }

  async setupInstagram(tenantId: string, config: Record<string, unknown>) {
    await this.upsertStatus(tenantId, 'instagram', { status: 'connected', configuration: config as any });
    const existing = await this.prisma.channel.findFirst({ where: { tenantId, type: 'instagram' } });
    if (!existing) {
      await this.prisma.channel.create({ data: { tenantId, type: 'instagram', name: 'Instagram', config: config as any, isActive: true } });
    } else {
      await this.prisma.channel.update({ where: { id: existing.id }, data: { config: config as any, isActive: true } });
    }
    return { message: 'Instagram configured' } as any;
  }

  async setupEmail(tenantId: string, config: Record<string, unknown>) {
    await this.upsertStatus(tenantId, 'email', { status: 'connected', configuration: (config as unknown) as any });
    const existing = await this.prisma.channel.findFirst({ where: { tenantId, type: 'email' } });
    if (!existing) {
      await this.prisma.channel.create({ data: { tenantId, type: 'email', name: 'Email', config: config as any, isActive: true } });
    } else {
      await this.prisma.channel.update({ where: { id: existing.id }, data: { config: config as any, isActive: true } });
    }
    return { message: 'Email configured' } as any;
  }

  async listStatuses(tenantId: string) {
    this.logger.debug(`Listing integration statuses for tenant ${tenantId}`);
    return this.prisma.integrationStatus.findMany({ where: { tenantId } });
  }

  async upsertStatus(tenantId: string, type: string, data: Partial<{ status: string; configuration: PrismaNS.InputJsonValue }>) {
    const existing = await this.prisma.integrationStatus.findUnique({
      // Composite unique not directly typed in client
      where: { tenantId_integrationType: { tenantId, integrationType: type } } as unknown as { tenantId_integrationType: { tenantId: string; integrationType: string } },
    });

    if (!existing) {
      return this.prisma.integrationStatus.create({
        data: {
          tenantId,
          integrationType: type,
          status: data.status || 'pending',
          configuration: (data.configuration as PrismaNS.InputJsonValue) || {},
        },
      });
    }

    return this.prisma.integrationStatus.update({
      where: { id: (existing as { id: string }).id },
      data: {
        status: data.status,
        configuration: data.configuration as PrismaNS.InputJsonValue,
        updatedAt: new Date(),
      },
    });
  }

  async getStatus(tenantId: string, type: string) {
    const status = await this.prisma.integrationStatus.findFirst({ where: { tenantId, integrationType: type } });
    if (!status) throw new NotFoundException('Integration not found');
    return status;
  }

  // Connectors
  async listConnectors(tenantId: string) {
    return this.prisma.integrationConnector.findMany({ where: { tenantId } });
  }

  async upsertConnector(tenantId: string, provider: string, data: Partial<{ status: string; config: PrismaNS.InputJsonValue }>) {
    const existing = await this.prisma.integrationConnector.findUnique({
      where: { tenantId_provider: { tenantId, provider } } as unknown as { tenantId_provider: { tenantId: string; provider: string } },
    });
    if (!existing) {
      return this.prisma.integrationConnector.create({
        data: {
          tenantId,
          provider,
          status: data.status || 'connected',
          config: (data.config as PrismaNS.InputJsonValue) || {},
          lastSyncAt: null,
        },
      });
    }
    return this.prisma.integrationConnector.update({
      where: { id: (existing as { id: string }).id },
      data: {
        status: data.status,
        config: data.config as PrismaNS.InputJsonValue,
        updatedAt: new Date(),
      },
    });
  }

  async disableConnector(tenantId: string, provider: string) {
    const existing = await this.prisma.integrationConnector.findUnique({
      where: { tenantId_provider: { tenantId, provider } } as unknown as { tenantId_provider: { tenantId: string; provider: string } },
    });
    if (!existing) throw new NotFoundException('Connector not found');
    // Remove token-like fields from config when disabling
    let newConfig: Record<string, unknown> = {};
    try {
      const cfg = (existing as any).config || {};
      const clone: Record<string, unknown> = { ...cfg };
      delete (clone as any).accessToken;
      delete (clone as any).refreshToken;
      delete (clone as any).tokenType;
      delete (clone as any).expiresIn;
      delete (clone as any).obtainedAt;
      newConfig = clone;
    } catch { /* noop */ }
    return this.prisma.integrationConnector.update({
      where: { id: (existing as { id: string }).id },
      data: { status: 'disabled', config: (newConfig as any) || {}, updatedAt: new Date() },
    });
  }

  async refreshConnector(tenantId: string, provider: string) {
    const existing = await this.prisma.integrationConnector.findUnique({
      where: { tenantId_provider: { tenantId, provider } } as unknown as { tenantId_provider: { tenantId: string; provider: string } },
    });
    if (!existing) throw new NotFoundException('Connector not found');
    const cfg = ((existing as any).config || {}) as { refreshToken?: string };
    if (!cfg.refreshToken) throw new NotFoundException('No refresh token');
    const adapter = this.resolveAdapter(provider) as unknown as {
      refreshToken: (args: { tenantId: string; refreshToken: string }) => Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number; tokenType?: string; scope?: string }>
    };
    const refreshed = await adapter.refreshToken({ tenantId, refreshToken: cfg.refreshToken });
    const updated = await this.prisma.integrationConnector.update({
      where: { id: (existing as { id: string }).id },
      data: {
        config: {
          ...(existing as any).config,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken || cfg.refreshToken,
          expiresIn: refreshed.expiresIn ?? (existing as any).config?.expiresIn,
          tokenType: refreshed.tokenType ?? (existing as any).config?.tokenType,
          scope: refreshed.scope ?? (existing as any).config?.scope,
          obtainedAt: new Date().toISOString(),
        } as any,
        updatedAt: new Date(),
      },
    });
    return updated;
  }

  async createSyncLog(params: {
    tenantId: string;
    connectorId: string;
    direction: 'outbound' | 'inbound';
    entity: string;
    status: 'success' | 'failed' | 'partial';
    stats?: Record<string, unknown>;
    errorMessage?: string;
  }) {
    return this.prisma.integrationSyncLog.create({
      data: {
        tenantId: params.tenantId,
        connectorId: params.connectorId,
        direction: params.direction,
        entity: params.entity,
        status: params.status,
        stats: (params.stats as unknown) as any || {},
        errorMessage: params.errorMessage,
        completedAt: new Date(),
      },
    });
  }

  async updateConnectorRules(tenantId: string, provider: string, rules: Record<string, unknown>) {
    const existing = await this.prisma.integrationConnector.findUnique({
      where: { tenantId_provider: { tenantId, provider } } as any,
    });
    if (!existing) throw new NotFoundException('Connector not found');
    const merged = {
      ...(existing as any).config,
      ...rules,
    } as Record<string, unknown>;
    return this.prisma.integrationConnector.update({
      where: { id: (existing as { id: string }).id },
      data: { config: (merged as any), updatedAt: new Date() },
    });
  }

  getConnectorDocs(provider: string) {
    const adapter = this.resolveAdapter(provider);
    if (!adapter || typeof (adapter as any).getDocs !== 'function') {
      return {
        name: provider,
        description: 'No docs available',
        setup: [],
        env: [],
      };
    }
    return (adapter as any).getDocs();
  }

  // Field mappings
  async listFieldMappings(tenantId: string, provider: string) {
    return this.prisma.integrationFieldMapping.findMany({ where: { tenantId, provider } });
  }

  private async getFieldMappings(tenantId: string, provider: string, entity: string): Promise<Record<string, unknown>> {
    const mappings = await this.listFieldMappings(tenantId, provider);
    const entityMapping = mappings.find((m) => m.sourceEntity === entity && m.isActive);
    if (entityMapping && entityMapping.mappings) {
      return entityMapping.mappings as Record<string, unknown>;
    }
    return {};
  }

  async upsertFieldMapping(tenantId: string, provider: string, payload: {
    id?: string;
    sourceEntity: string;
    targetEntity?: string | null;
    mappings: PrismaNS.InputJsonValue;
    direction?: 'inbound' | 'outbound' | 'both';
    isActive?: boolean;
  }) {
    if (payload.id) {
      const existing = await this.prisma.integrationFieldMapping.findFirst({ where: { id: payload.id, tenantId, provider } });
      if (!existing) throw new NotFoundException('Mapping not found');
      return this.prisma.integrationFieldMapping.update({
        where: { id: payload.id },
        data: {
          sourceEntity: payload.sourceEntity,
          targetEntity: payload.targetEntity ?? null,
          mappings: payload.mappings,
          direction: (payload.direction as string) || 'both',
          isActive: payload.isActive ?? true,
          updatedAt: new Date(),
        }
      });
    }
    return this.prisma.integrationFieldMapping.create({
      data: {
        tenantId,
        provider,
        sourceEntity: payload.sourceEntity,
        targetEntity: payload.targetEntity ?? null,
        mappings: payload.mappings,
        direction: (payload.direction as string) || 'both',
        isActive: payload.isActive ?? true,
      }
    });
  }

  async deleteFieldMapping(tenantId: string, provider: string, id: string) {
    const existing = await this.prisma.integrationFieldMapping.findFirst({ where: { id, tenantId, provider } });
    if (!existing) throw new NotFoundException('Mapping not found');
    await this.prisma.integrationFieldMapping.delete({ where: { id } });
    return { ok: true } as any;
  }

  async getSyncHistory(tenantId: string, connectorId: string, options?: { limit?: number; offset?: number }) {
    return this.prisma.integrationSyncLog.findMany({
      where: {
        tenantId,
        connectorId,
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }
  
  async manualSync(tenantId: string, provider: string, entity: string) {
    const startTime = Date.now();
    const connector = await this.prisma.integrationConnector.findUnique({
      where: { tenantId_provider: { tenantId, provider } } as unknown as { tenantId_provider: { tenantId: string; provider: string } },
    });
    if (!connector) throw new NotFoundException('Connector not found');

    // Update connector status to syncing
    await this.prisma.integrationConnector.update({
      where: { id: (connector as { id: string }).id },
      data: { status: 'syncing', lastError: null },
    });

    try {
      // Ensure token freshness best-effort before sync
      try {
        const cfg = ((connector as any).config || {}) as { accessToken?: string; refreshToken?: string; obtainedAt?: string; expiresIn?: number };
        const needsRefresh = this.isTokenExpiredSoon(cfg);
        if (needsRefresh && cfg.refreshToken) {
          const adapter = this.resolveAdapter(provider);
          if (adapter && 'refreshToken' in adapter) {
            const refreshed = await (adapter as any).refreshToken({ tenantId, refreshToken: cfg.refreshToken });
            const updatedConfig = {
              ...(connector as any).config,
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken || cfg.refreshToken,
              tokenType: refreshed.tokenType || (cfg as any).tokenType,
              expiresIn: refreshed.expiresIn ?? (cfg as any).expiresIn,
              scope: refreshed.scope || (cfg as any).scope,
              obtainedAt: new Date().toISOString(),
            } as any;
            await this.prisma.integrationConnector.update({
              where: { id: (connector as { id: string }).id },
              data: { config: updatedConfig, updatedAt: new Date() },
            });
          }
        }
      } catch (refreshError: any) {
        this.logger.warn(`Token refresh failed for ${provider}: ${refreshError?.message}`);
        // Continue with sync attempt even if refresh fails
      }

      // Use adapter for provider
      const adapter = this.resolveAdapter(provider);
      if (!adapter) {
        throw new Error(`Adapter not found for provider: ${provider}`);
      }

      // Perform incremental sync if lastSyncAt exists
      const lastSyncAt = connector.lastSyncAt;
      const stats = await adapter.syncEntity({ tenantId, entity, lastSyncAt });

      const duration = Date.now() - startTime;
      const totalRecords = (stats.imported || 0) + (stats.updated || 0) + (stats.skipped || 0);
      const hasErrors = (stats.skipped || 0) > 0;
      const syncStatus = hasErrors && (stats.imported || 0) === 0 ? 'failed' : hasErrors ? 'partial' : 'success';

      // Create sync log
      const log = await this.createSyncLog({
        tenantId,
        connectorId: (connector as { id: string }).id,
        direction: 'outbound',
        entity,
        status: syncStatus,
        stats: {
          ...stats,
          duration,
          totalRecords,
        } as Record<string, unknown>,
        errorMessage: syncStatus === 'failed' ? 'Sync completed with errors' : undefined,
      });

      // Update connector status and last sync time
      await this.prisma.integrationConnector.update({
        where: { id: (connector as { id: string }).id },
        data: {
          status: 'connected',
          lastSyncAt: new Date(),
          lastError: syncStatus === 'failed' ? 'Sync completed with errors' : null,
        },
      });

      // Log activity for health monitoring
      if (this.healthService) {
        await this.healthService.logActivity({
          integrationId: (connector as { id: string }).id,
          tenantId,
          action: 'sync',
          status: syncStatus === 'success' ? 'success' : syncStatus === 'partial' ? 'warning' : 'error',
          direction: 'outbound',
          duration,
          recordsProcessed: totalRecords,
          recordsFailed: stats.skipped || 0,
          errorMessage: syncStatus === 'failed' ? 'Sync completed with errors' : undefined,
        });
      }

      return {
        ok: syncStatus !== 'failed',
        logId: log.id,
        stats: {
          ...stats,
          duration,
          status: syncStatus,
        },
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(`Sync failed for ${provider}:${entity} - ${error?.message}`, error.stack);

      // Create error log
      try {
        await this.createSyncLog({
          tenantId,
          connectorId: (connector as { id: string }).id,
          direction: 'outbound',
          entity,
          status: 'failed',
          stats: { duration } as Record<string, unknown>,
          errorMessage: error?.message || 'Unknown sync error',
        });

        // Log activity for health monitoring
        if (this.healthService) {
          await this.healthService.logActivity({
            integrationId: (connector as { id: string }).id,
            tenantId,
            action: 'sync',
            status: 'error',
            direction: 'outbound',
            duration,
            errorMessage: error?.message || 'Unknown sync error',
          });
        }
      } catch (logError: any) {
        this.logger.error(`Failed to create sync log: ${logError?.message}`);
      }

      // Update connector status to error
      await this.prisma.integrationConnector.update({
        where: { id: (connector as { id: string }).id },
        data: {
          status: 'error',
          lastError: error?.message || 'Unknown sync error',
        },
      });

      throw error;
    }
  }

  resolveAdapter(provider: string) {
    switch (provider) {
      case 'salesforce':
        return this.salesforce;
      case 'hubspot':
        return this.hubspot;
      case 'dynamics':
        return this.dynamics;
      case 'marketo':
        return this.marketo;
      case 'pardot':
        return this.pardot;
      case 'mailchimp':
        return this.mailchimp;
      case 'sendgrid':
        return this.sendgrid;
      case 'slack':
        return this.slack;
      case 'twilio':
        return this.twilio;
      case 'shopify':
        return this.shopify;
      case 'woocommerce':
        return this.woocommerce;
      case 'stripe':
        return this.stripe;
      default:
        return this.hubspot; // fallback stub
    }
  }

  private isTokenExpiredSoon(cfg: { obtainedAt?: string; expiresIn?: number } | undefined): boolean {
    try {
      if (!cfg?.obtainedAt || !cfg?.expiresIn) return false;
      const obtainedMs = new Date(cfg.obtainedAt).getTime();
      if (!Number.isFinite(obtainedMs)) return false;
      const expiresMs = obtainedMs + Number(cfg.expiresIn) * 1000;
      const now = Date.now();
      // consider expiring if less than 2 minutes left
      return expiresMs - now <= 2 * 60 * 1000;
    } catch {
      return false;
    }
  }

  // Bidirectional Sync - Inbound Webhooks (from CRM to Glavito)
  async handleInboundWebhook(
    provider: string,
    payload: any,
    headers: Record<string, string>,
    tenantId?: string,
  ) {
    try {
      this.logger.log(`Received inbound webhook from ${provider}`);

      // Verify webhook signature if adapter supports it
      const adapter = this.resolveAdapter(provider);
      if (!adapter) {
        throw new Error(`Adapter not found for provider: ${provider}`);
      }

      // Extract tenantId from payload or headers if not provided
      let resolvedTenantId = tenantId;
      if (!resolvedTenantId) {
        // Try to extract from payload (provider-specific)
        if (payload.tenantId) {
          resolvedTenantId = payload.tenantId;
        } else if (payload.orgId) {
          // Salesforce format
          const connector = await this.prisma.integrationConnector.findFirst({
            where: {
              provider,
              config: { path: ['instanceUrl'], equals: payload.orgId } as any,
            } as any,
          });
          if (connector) {
            resolvedTenantId = connector.tenantId;
          }
        }
      }

      if (!resolvedTenantId) {
        throw new Error('Tenant ID not found in webhook payload');
      }

      // Verify connector exists
      const connector = await this.prisma.integrationConnector.findUnique({
        where: {
          tenantId_provider: { tenantId: resolvedTenantId, provider } as any,
        },
      });

      if (!connector || connector.status !== 'connected') {
        throw new Error(`Connector not found or not connected for ${provider}`);
      }

      // Process webhook based on provider
      let processed = 0;
      let errors = 0;

      if (provider === 'salesforce') {
        // Salesforce webhook format
        const sobjects = Array.isArray(payload.sobjects) ? payload.sobjects : [payload];
        for (const sobject of sobjects) {
          try {
            const entityType = sobject.type || sobject.attributes?.type;
            if (entityType === 'Contact' || entityType === 'Lead') {
              const mappings = await this.getFieldMappings(resolvedTenantId, provider, 'customer');
              const customer = await this.crmSync?.upsertCustomerFromCrm(resolvedTenantId, sobject, mappings);
              if (customer && entityType === 'Lead') {
                await this.crmSync?.upsertLeadFromCrm(resolvedTenantId, sobject, mappings, customer);
              }
              processed++;
            }
          } catch (error: any) {
            this.logger.error(`Failed to process Salesforce webhook: ${error?.message}`);
            errors++;
          }
        }
      } else if (provider === 'hubspot') {
        // HubSpot webhook format
        const events = Array.isArray(payload) ? payload : [payload];
        for (const event of events) {
          try {
            const subscriptionType = event.subscriptionType;
            // Basic signature verification if secret + header present (best-effort)
            try {
              const secret = (connector.config as any).webhookSecret;
              const signature = headers['x-hubspot-signature-v3'] || headers['x-hubspot-signature'] || headers['X-HubSpot-Signature'] || headers['X-HubSpot-Signature-v3'];
              if (secret && signature) {
                const bodyString = typeof payload === 'string' ? payload : JSON.stringify(payload);
                const hmac = createHmac('sha256', String(secret)).update(bodyString).digest('base64');
                if (typeof signature === 'string' && signature.length > 0 && hmac.length > 0) {
                  // If mismatch, log warning but continue (some providers require method+path)
                  if (signature !== hmac) {
                    this.logger.warn('HubSpot signature mismatch (proceeding in dev mode).');
                  }
                }
              }
            } catch (sigErr: any) {
              this.logger.warn(`HubSpot signature check failed: ${sigErr?.message}`);
            }

            if (subscriptionType?.includes('contact')) {
              // Fetch contact details from HubSpot API
              const accessToken = (connector.config as Record<string, unknown>).accessToken;
              if (accessToken && this.hubspot) {
                // Use HubSpot adapter to fetch contact
                const mappings = await this.getFieldMappings(resolvedTenantId, provider, 'customer');
                const objectId = event.objectId;
                let contactData: Record<string, any> | null = null;
                if (objectId && (this.hubspot as any).getContact) {
                  try {
                    contactData = await (this.hubspot as any).getContact({ tenantId: resolvedTenantId, id: objectId, accessToken });
                  } catch (fetchErr: any) {
                    this.logger.warn(`HubSpot getContact failed: ${fetchErr?.message}`);
                  }
                }
                // Fallback to webhook payload properties
                if (!contactData && event.properties) contactData = event.properties as any;

                if (contactData) {
                  await this.crmSync?.upsertCustomerFromCrm(resolvedTenantId, contactData, mappings);
                  processed++;
                }
              }
            }
          } catch (error: any) {
            this.logger.error(`Failed to process HubSpot webhook: ${error?.message}`);
            errors++;
          }
        }
      }

      // E-commerce: Shopify
      else if (provider === 'shopify') {
        try {
          const cfg = (connector.config as any) || {};
          if ((this.crmSync as any)?.handleOrderCreated) {
            // Shopify sends many topics; focus on orders/create or orders/updated
            const topic = (headers['x-shopify-topic'] || headers['X-Shopify-Topic'] || payload?.topic || '').toString().toLowerCase();
            if (topic.includes('orders/create') || payload?.id) {
              await (this.crmSync as any).handleOrderCreated(resolvedTenantId, payload, cfg);
              processed++;
            } else if (topic.includes('orders/updated')) {
              await (this.crmSync as any).handleOrderUpdated?.(resolvedTenantId, payload, cfg);
              processed++;
            } else {
              // ignore other topics
            }
          }
        } catch (err: any) {
          this.logger.error(`Shopify webhook error: ${err?.message}`);
          errors++;
        }
      }

      // E-commerce: WooCommerce
      else if (provider === 'woocommerce') {
        try {
          const cfg = (connector.config as any) || {};
          const event = (headers['x-wc-webhook-event'] || headers['X-WC-Webhook-Event'] || payload?.event || '').toString().toLowerCase();
          if ((this.crmSync as any)?.handleOrderCreated) {
            if (event.includes('created') || payload?.order) {
              const order = payload?.order || payload;
              await (this.crmSync as any).handleOrderCreated(resolvedTenantId, order, cfg);
              processed++;
            } else if (event.includes('updated')) {
              const order = payload?.order || payload;
              await (this.crmSync as any).handleOrderUpdated?.(resolvedTenantId, order, cfg);
              processed++;
            }
          }
        } catch (err: any) {
          this.logger.error(`WooCommerce webhook error: ${err?.message}`);
          errors++;
        }
      }

      // Marketing: Mailchimp
      else if (provider === 'mailchimp') {
        try {
          const type = (payload?.type || payload?.event || '').toString().toLowerCase();
          const email = (payload?.data?.email || payload?.data?.email_address || payload?.email) as string | undefined;
          if (email) {
            if (type.includes('unsubscribe') || type.includes('cleaned')) {
              await this.prisma.emailSuppression.upsert({
                where: { tenantId_email: { tenantId: resolvedTenantId, email } } as any,
                create: { tenantId: resolvedTenantId, email, reason: 'unsubscribe' },
                update: { reason: 'unsubscribe' },
              });
            }
            processed++;
          }
        } catch (err: any) {
          this.logger.error(`Mailchimp webhook error: ${err?.message}`);
          errors++;
        }
      }

      // Marketing: Sendgrid
      else if (provider === 'sendgrid') {
        try {
          const events = Array.isArray(payload) ? payload : [payload];
          for (const e of events) {
            const ev = (e?.event || '').toString().toLowerCase();
            const email = e?.email as string | undefined;
            if (!email) continue;
            if (['bounce', 'dropped', 'spamreport', 'unsubscribe'].includes(ev)) {
              await this.prisma.emailSuppression.upsert({
                where: { tenantId_email: { tenantId: resolvedTenantId, email } } as any,
                create: { tenantId: resolvedTenantId, email, reason: ev },
                update: { reason: ev },
              });
            }
          }
          processed += events.length;
        } catch (err: any) {
          this.logger.error(`Sendgrid webhook error: ${err?.message}`);
          errors++;
        }
      }

      // Channels: Twilio (SMS status or inbound message)
      else if (provider === 'twilio') {
        try {
          // For now, just log activity. Channel ingestion handled elsewhere.
          processed++;
        } catch (err: any) {
          this.logger.error(`Twilio webhook error: ${err?.message}`);
          errors++;
        }
      }

      // Log webhook activity
      if (this.healthService) {
        await this.healthService.logActivity({
          integrationId: connector.id,
          tenantId: resolvedTenantId,
          action: 'webhook',
          status: errors === 0 ? 'success' : errors < processed ? 'warning' : 'error',
          direction: 'inbound',
          recordsProcessed: processed,
          recordsFailed: errors,
          errorMessage: errors > 0 ? `${errors} records failed to process` : undefined,
        });
      }

      return {
        success: true,
        processed,
        errors,
        message: `Processed ${processed} records, ${errors} errors`,
      };
    } catch (error: any) {
      this.logger.error(`Inbound webhook failed for ${provider}: ${error?.message}`, error.stack);
      throw error;
    }
  }

  // Bidirectional Sync - Outbound Sync (from Glavito to CRM)
  async syncOutbound(
    tenantId: string,
    provider: string,
    entity: string,
    entityId: string,
    action: 'create' | 'update' | 'delete',
  ) {
    try {
      const connector = await this.prisma.integrationConnector.findUnique({
        where: {
          tenantId_provider: { tenantId, provider } as any,
        },
      });

      if (!connector || connector.status !== 'connected') {
        throw new Error(`Connector not found or not connected for ${provider}`);
      }

      // Check if bidirectional sync is enabled
      const config = connector.config as any;
      if (config.bidirectionalSync === false) {
        this.logger.log(`Bidirectional sync disabled for ${provider}, skipping outbound sync`);
        return { skipped: true, reason: 'bidirectional_sync_disabled' };
      }

      const adapter = this.resolveAdapter(provider);
      if (!adapter) {
        throw new Error(`Adapter not found for provider: ${provider}`);
      }

      // Fetch entity data from Glavito
      let entityData: any = null;
      if (entity === 'customer') {
        entityData = await this.prisma.customer.findUnique({
          where: { id: entityId },
        });
      } else if (entity === 'ticket') {
        entityData = await this.prisma.ticket.findUnique({
          where: { id: entityId },
          include: { customer: true },
        });
      } else if (entity === 'lead') {
        entityData = await this.prisma.lead.findUnique({
          where: { id: entityId },
        });
      }

      if (!entityData) {
        throw new Error(`Entity ${entity} with id ${entityId} not found`);
      }

      // Get field mappings
      const mappings = await this.getFieldMappings(tenantId, provider, entity);

      // Transform Glavito data to CRM format
      const crmData = this.transformToCrmFormat(entityData, entity, mappings, provider);

      // Sync to CRM using adapter
      let result: any = null;
      if (action === 'create' || action === 'update') {
        // Use adapter's sync method or create/update methods if available
        if ('createEntity' in adapter && typeof (adapter as any).createEntity === 'function') {
          result = await (adapter as any).createEntity({
            tenantId,
            entity,
            data: crmData,
          });
        } else {
          // Fallback: use syncEntity which should handle upsert
          result = await adapter.syncEntity({ tenantId, entity });
        }
      } else if (action === 'delete') {
        if ('deleteEntity' in adapter && typeof (adapter as any).deleteEntity === 'function') {
          result = await (adapter as any).deleteEntity({
            tenantId,
            entity,
            entityId: crmData.id || entityId,
          });
        }
      }

      // Log outbound sync
      await this.createSyncLog({
        tenantId,
        connectorId: connector.id,
        direction: 'outbound',
        entity,
        status: result ? 'success' : 'failed',
        stats: {
          action,
          entityId,
          crmId: result?.id,
        } as Record<string, unknown>,
      });

      // Log activity for health monitoring
      if (this.healthService) {
        await this.healthService.logActivity({
          integrationId: connector.id,
          tenantId,
          action: 'sync_outbound',
          status: result ? 'success' : 'error',
          direction: 'outbound',
          recordsProcessed: 1,
          errorMessage: result ? undefined : 'Outbound sync failed',
        });
      }

      return {
        success: !!result,
        crmId: result?.id,
        action,
        entity,
        entityId,
      };
    } catch (error: any) {
      this.logger.error(`Outbound sync failed for ${provider}:${entity}:${entityId} - ${error?.message}`, error.stack);
      throw error;
    }
  }

  // Transform Glavito entity to CRM format
  private transformToCrmFormat(
    entityData: any,
    entity: string,
    mappings: Record<string, unknown>,
    provider: string,
  ): Record<string, unknown> {
    const crmData: Record<string, unknown> = {};

    // Apply reverse mappings (Glavito field -> CRM field)
    for (const [crmField, glavitoField] of Object.entries(mappings)) {
      const value = this.getNestedValue(entityData, glavitoField as string);
      if (value !== undefined && value !== null) {
        crmData[crmField] = value;
      }
    }

    // Provider-specific transformations
    if (provider === 'salesforce') {
      if (entity === 'customer') {
        crmData.Email = entityData.email;
        crmData.FirstName = entityData.firstName;
        crmData.LastName = entityData.lastName;
        crmData.Phone = entityData.phone;
      }
    } else if (provider === 'hubspot') {
      if (entity === 'customer') {
        crmData.email = entityData.email;
        crmData.firstname = entityData.firstName;
        crmData.lastname = entityData.lastName;
        crmData.phone = entityData.phone;
      }
    }

    return crmData;
  }

  private getNestedValue(obj: any, path: string): unknown {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  // Sync Queue Management
  async getSyncQueue(tenantId: string) {
    const failedSyncs = await this.prisma.integrationSyncLog.findMany({
      where: {
        tenantId,
        status: 'failed',
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: 50,
    });

    // Fetch connectors separately to get provider info
    const connectorIds = [...new Set(failedSyncs.map((log) => log.connectorId))];
    const connectors = await this.prisma.integrationConnector.findMany({
      where: {
        id: { in: connectorIds },
      },
      select: {
        id: true,
        provider: true,
      },
    });

    const connectorMap = new Map(connectors.map((c) => [c.id, c.provider]));

    return {
      failed: failedSyncs.length,
      items: failedSyncs.map((log) => ({
        id: log.id,
        provider: connectorMap.get(log.connectorId) || 'unknown',
        entity: log.entity,
        direction: log.direction,
        errorMessage: log.errorMessage,
        completedAt: log.completedAt,
      })),
    };
  }

  async retrySyncItem(tenantId: string, logId: string) {
    const log = await this.prisma.integrationSyncLog.findUnique({
      where: { id: logId },
    });

    if (!log || log.tenantId !== tenantId) {
      throw new NotFoundException('Sync log not found');
    }

    if (log.status !== 'failed') {
      throw new Error('Can only retry failed sync items');
    }

    // Fetch connector to get provider
    const connector = await this.prisma.integrationConnector.findUnique({
      where: { id: log.connectorId },
      select: { provider: true },
    });

    if (!connector) {
      throw new NotFoundException('Connector not found');
    }
    
    // Retry the sync
    try {
      const result = await this.manualSync(tenantId, connector.provider, log.entity);
      return {
        success: true,
        result,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Retry failed: ${errorMessage}`);
    }
  }
}


