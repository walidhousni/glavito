import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { Prisma as PrismaNS } from '@prisma/client';
import { SalesforceAdapter } from './adapters/salesforce.adapter';
import { HubspotAdapter } from './adapters/hubspot.adapter';
import { DynamicsAdapter } from './adapters/dynamics.adapter';
import { MarketoAdapter } from './adapters/marketo.adapter';
import { PardotAdapter } from './adapters/pardot.adapter';

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
  ) {}

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
    return this.prisma.integrationConnector.update({
      where: { id: (existing as { id: string }).id },
      data: { status: 'disabled', updatedAt: new Date() },
    });
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
        stats: params.stats || {},
        errorMessage: params.errorMessage,
        completedAt: new Date(),
      },
    });
  }

  // Field mappings
  async listFieldMappings(tenantId: string, provider: string) {
    return this.prisma.integrationFieldMapping.findMany({ where: { tenantId, provider } });
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
  
  async manualSync(tenantId: string, provider: string, entity: string) {
    const connector = await this.prisma.integrationConnector.findUnique({
      where: { tenantId_provider: { tenantId, provider } } as unknown as { tenantId_provider: { tenantId: string; provider: string } },
    });
    if (!connector) throw new NotFoundException('Connector not found');
    // Use adapter for provider
    const adapter = this.resolveAdapter(provider);
    const stats = await adapter.syncEntity({ tenantId, entity });
    const log = await this.createSyncLog({
      tenantId,
      connectorId: (connector as { id: string }).id,
      direction: 'outbound',
      entity,
      status: 'success',
      stats: stats as Record<string, unknown>,
    });
    await this.prisma.integrationConnector.update({
      where: { id: (connector as { id: string }).id },
      data: { lastSyncAt: new Date() },
    });
    return { ok: true, logId: log.id } as any;
  }

  private resolveAdapter(provider: string) {
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
      default:
        return this.hubspot; // fallback stub
    }
  }
}


