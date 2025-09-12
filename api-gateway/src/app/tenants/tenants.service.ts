import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import type { CreateTenantRequest, UpdateTenantRequest, Tenant } from '@glavito/shared-types';

@Injectable()
export class TenantsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createTenantDto: CreateTenantRequest & { ownerId: string }): Promise<Tenant> {
    const { name, subdomain, plan = 'starter', settings = {}, ownerId } = createTenantDto;

    // Check if subdomain already exists
    const existingTenant = await this.databaseService.tenant.findUnique({
      where: { subdomain },
    });

    if (existingTenant) {
      throw new ConflictException('Subdomain already exists');
    }

    const tenant = await this.databaseService.tenant.create({
      data: {
        name,
        subdomain,
        plan,
        status: 'trial',
        settings,
        ownerId,
      },
    });

    return tenant as Tenant;
  }

  async findAll(): Promise<Tenant[]> {
    const tenants = await this.databaseService.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return tenants as Tenant[];
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant as Tenant;
  }

  async findBySubdomain(subdomain: string): Promise<Tenant | null> {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { subdomain },
    });

    return tenant as Tenant | null;
  }

  async update(id: string, updateTenantDto: UpdateTenantRequest): Promise<Tenant> {
    const existingTenant = await this.findOne(id);

    // Check subdomain uniqueness if being updated
    if (updateTenantDto.subdomain && updateTenantDto.subdomain !== existingTenant.subdomain) {
      const subdomainExists = await this.databaseService.tenant.findUnique({
        where: { subdomain: updateTenantDto.subdomain },
      });

      if (subdomainExists) {
        throw new ConflictException('Subdomain already exists');
      }
    }

    const tenant = await this.databaseService.tenant.update({
      where: { id },
      data: updateTenantDto,
    });

    return tenant as Tenant;
  }

  async updateBranding(
    id: string,
    branding: {
      name?: string;
      colors?: { primary?: string; secondary?: string };
      customCSS?: string;
      faviconUrl?: string;
      logoUrl?: string;
    },
  ): Promise<Tenant> {
    const existing = await this.findOne(id);
    const existingBranding = ((existing as any).brandingConfig || {}) as Record<string, any>;
    const mergedColors = {
      ...(existingBranding.colors || {}),
      ...(branding.colors || {}),
    };
    const newBranding = {
      ...existingBranding,
      ...(branding.name !== undefined ? { name: branding.name } : {}),
      ...(branding.customCSS !== undefined ? { customCSS: branding.customCSS } : {}),
      ...(branding.faviconUrl !== undefined ? { faviconUrl: branding.faviconUrl } : {}),
      ...(branding.logoUrl !== undefined ? { logoUrl: branding.logoUrl } : {}),
      ...(Object.keys(mergedColors).length ? { colors: mergedColors } : {}),
    };

    const updated = await this.databaseService.tenant.update({
      where: { id },
      data: { brandingConfig: newBranding as any },
    });
    return updated as Tenant;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // Check if exists

    await this.databaseService.tenant.delete({
      where: { id },
    });
  }

  // Dashboard customization (stored under Tenant.settings.dashboard)
  async getDashboardConfig(tenantId: string): Promise<Record<string, unknown>> {
    const tenant = await this.databaseService.tenant.findUnique({ where: { id: tenantId } });
    const settings = (tenant as any)?.settings || {};
    return settings.dashboard || { widgets: [], layout: 'grid' };
  }

  async updateDashboardConfig(tenantId: string, config: Record<string, unknown>) {
    const tenant = await this.databaseService.tenant.findUnique({ where: { id: tenantId } });
    const current = (tenant as any)?.settings || {};
    const nextSettings = { ...current, dashboard: config };
    return this.databaseService.tenant.update({
      where: { id: tenantId },
      data: { settings: nextSettings as any },
    });
  }

  // Custom roles mapping persisted under Tenant.settings.roles
  async getRolesMapping(tenantId: string): Promise<Record<string, { permissions: string[] }>> {
    const tenant = await this.databaseService.tenant.findUnique({ where: { id: tenantId } });
    const settings = (tenant as any)?.settings || {};
    const roles = (settings.roles || {}) as Record<string, { permissions: string[] }>;
    return roles;
  }

  async updateRolesMapping(
    tenantId: string,
    mapping: Record<string, { permissions: string[] }>,
  ) {
    const tenant = await this.databaseService.tenant.findUnique({ where: { id: tenantId } });
    const current = (tenant as any)?.settings || {};
    const nextSettings = { ...current, roles: mapping };
    return this.databaseService.tenant.update({
      where: { id: tenantId },
      data: { settings: nextSettings as any },
    });
  }

  // Compute effective permissions for a user (direct + role-mapped)
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.databaseService.user.findUnique({ where: { id: userId } });
    if (!user) return [];
    const tenantId = (user as any).tenantId as string;

    const direct = await this.databaseService.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });
    const directPerms = direct.map((up: any) => up.permission?.name).filter(Boolean) as string[];

    const roleMap = await this.getRolesMapping(tenantId);
    const roleName = (user as any).role as string;
    const rolePerms = roleMap?.[roleName]?.permissions || [];

    return Array.from(new Set([...(directPerms || []), ...(rolePerms || [])]));
  }

  async getCallAnalytics(tenantId: string) {
    // Counts
    const [totalCalls, activeCalls, endedCalls] = await Promise.all([
      this.databaseService.call.count({ where: { tenantId } }),
      this.databaseService.call.count({ where: { tenantId, status: 'active' } }),
      this.databaseService.call.count({ where: { tenantId, status: 'ended' } }),
    ]);

    // Usage aggregates
    const usageAgg = await this.databaseService.callUsage.aggregate({
      _sum: { durationSec: true, costCents: true },
      where: { tenantId },
    });

    // Calls by type and direction
    const [byType, byDirection] = await Promise.all([
      this.databaseService.call.groupBy({
        by: ['type'],
        _count: { _all: true },
        where: { tenantId },
      }).catch(() => [] as any[]),
      this.databaseService.call.groupBy({
        by: ['direction'],
        _count: { _all: true },
        where: { tenantId },
      }).catch(() => [] as any[]),
    ]);

    // Quality metrics (last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const qualityAgg = await this.databaseService.callMetric.aggregate({
      _avg: {
        rttMs: true,
        jitterMs: true,
        bitrateUp: true,
        bitrateDown: true,
        packetLossUp: true,
        packetLossDown: true,
      },
      where: { call: { tenantId }, timestamp: { gte: since } },
    });

    // Last 7 days usage trend
    const usages = await this.databaseService.callUsage.findMany({
      where: { tenantId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, durationSec: true },
    });
    const trendMap = new Map<string, number>();
    for (const u of usages) {
      const d = new Date(u.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      trendMap.set(key, (trendMap.get(key) || 0) + (u.durationSec || 0));
    }
    const last7Days = Array.from(trendMap.entries()).map(([date, durationSec]) => ({ date, durationSec }));

    return {
      totals: {
        totalCalls,
        activeCalls,
        endedCalls,
        totalDurationSec: usageAgg._sum.durationSec || 0,
        totalCostCents: usageAgg._sum.costCents || 0,
      },
      breakdown: {
        byType: Object.fromEntries(byType.map((r: any) => [r.type || 'unknown', r._count._all])) as Record<string, number>,
        byDirection: Object.fromEntries(byDirection.map((r: any) => [r.direction || 'unknown', r._count._all])) as Record<string, number>,
      },
      quality24h: {
        avgRttMs: qualityAgg._avg.rttMs || 0,
        avgJitterMs: qualityAgg._avg.jitterMs || 0,
        avgBitrateUp: qualityAgg._avg.bitrateUp || 0,
        avgBitrateDown: qualityAgg._avg.bitrateDown || 0,
        avgPacketLossUp: qualityAgg._avg.packetLossUp || 0,
        avgPacketLossDown: qualityAgg._avg.packetLossDown || 0,
      },
      last7Days,
    };
  }

  // API Keys
  async listApiKeys(tenantId: string) {
    return this.databaseService.apiKey.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async createApiKey(tenantId: string, name: string, permissions: string[] = []) {
    const crypto = await import('crypto');
    const tenant = await this.databaseService.tenant.findUnique({ where: { id: tenantId } });
    const slug = ((tenant as any)?.slug || (tenant as any)?.subdomain || 'tenant').toString().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const rnd = (await import('crypto')).randomBytes(16).toString('hex');
    const plaintext = `pk_${slug}_${rnd}`;
    const prefix = `pk_${slug}_`;
    const keyHash = crypto.createHash('sha256').update(plaintext).digest('hex');
    const created = await this.databaseService.apiKey.create({ data: { tenantId, name, prefix, keyHash, permissions } });
    return { ...created, preview: `${plaintext.slice(0, 10)}••••${plaintext.slice(-4)}`, plaintext } as any;
  }

  async deleteApiKey(tenantId: string, id: string) {
    const key = await this.databaseService.apiKey.findFirst({ where: { id, tenantId } });
    if (!key) throw new NotFoundException('API key not found');
    await this.databaseService.apiKey.delete({ where: { id } });
    return { success: true } as const;
  }
}