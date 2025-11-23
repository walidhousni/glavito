import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { TenantsService } from '../tenants/tenants.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { ChannelsService } from '../channels/channels.service';
import { WorkflowService } from '@glavito/shared-workflow';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly tenants: TenantsService,
    private readonly customFields: CustomFieldsService,
    private readonly channels: ChannelsService,
    private readonly workflows: WorkflowService,
  ) {}

  list(params: { search?: string; category?: string; tag?: string; type?: string; premium?: boolean; sort?: string; page?: number; limit?: number }) {
    const where: any = {};
    if (params.category) where.category = params.category;
    if (params.type) where.type = params.type;
    if (typeof params.premium === 'boolean') where.isPremium = params.premium;
    if (params.tag) where.tags = { has: params.tag } as any;
    if (params.search) {
      const q = params.search;
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { has: q } } as any,
      ];
    }
    const page = params.page && params.page > 0 ? params.page : 1;
    const take = params.limit && params.limit > 0 && params.limit <= 100 ? params.limit : 20;
    const skip = (page - 1) * take;
    const orderBy = (() => {
      switch (params.sort) {
        case 'popular':
          return { installCount: 'desc' } as const;
        case 'rating':
          return { rating: 'desc' } as const;
        case 'newest':
          return { createdAt: 'desc' } as const;
        default:
          return { updatedAt: 'desc' } as const;
      }
    })();
    return this.db.marketplaceItem.findMany({ where, skip, take, orderBy });
  }

  getBySlug(slug: string) {
    return this.db.marketplaceItem.findUnique({ where: { slug }, include: { reviews: true } });
  }

  async install(tenantId: string, itemSlug: string, userId: string, configuration?: Record<string, unknown>) {
    const item = await this.db.marketplaceItem.findUnique({ where: { slug: itemSlug } });
    if (!item) throw new NotFoundException('Item not found');
    const installation = await this.db.tenantInstallation.upsert({
      where: { tenantId_itemId: { tenantId, itemId: item.id } },
      create: { tenantId, itemId: item.id, installedBy: userId, configuration: (configuration || {}) as any },
      update: { status: 'installed', configuration: (configuration || {}) as any },
    });
    await this.db.marketplaceItem.update({ where: { id: item.id }, data: { installCount: { increment: 1 } } as any });
    // Hook: provision based on item.type
    try {
      switch ((item as any).type) {
        case 'integration': {
          // Use ChannelsService or WorkflowService based on provider content
          const provider = ((item as any).content || (configuration || {})) as any;
          if (provider?.type === 'channel') {
            const channelDto = { ...(provider.configuration || {}), tenantId };
            await this.channels.create(channelDto);
          } else if (provider?.type === 'workflow') {
            const def = provider.configuration || {};
            await this.workflows.createWorkflow(tenantId, {
              name: def.name || item.name,
              description: def.description || item.description,
              type: def.type || 'n8n',
              priority: def.priority || 0,
              triggers: def.triggers || [],
              triggerConditions: def.conditions || [],
              actions: def.actions || [],
              isActive: true,
              metadata: def.metadata || {},
            } as any);
          } else {
            this.logger.log('Integration item installed: no specific provisioner, skipping');
          }
          break;
        }
        case 'workflow': {
          const def = (item as any).content || {};
          await this.workflows.createWorkflow(tenantId, {
            name: def.name || item.name,
            description: def.description || item.description,
            type: def.type || 'n8n',
            priority: def.priority || 0,
            triggers: def.triggers || [],
            triggerConditions: def.conditions || [],
            actions: def.actions || [],
            isActive: true,
            metadata: def.metadata || {},
          } as any);
          break;
        }
        case 'widget': {
          // Store in tenant dashboard settings
          const tenant = await this.tenants.findOne(tenantId);
          const settings = (tenant as any).settings || {};
          const dashboard = settings.dashboard || { widgets: [] };
          dashboard.widgets = [...(dashboard.widgets || []), { slug: item.slug, config: configuration || {} }];
          await this.tenants.updateDashboardConfig(tenantId, dashboard);
          break;
        }
        case 'custom-field': {
          const payload = (item as any).content || configuration || {};
          if (payload?.entity && payload?.name && payload?.label && payload?.type) {
            await this.customFields.create(tenantId, payload as any);
          }
          break;
        }
        case 'channel': {
          const channelDto = { ...(configuration || {}), tenantId };
          await this.channels.create(channelDto);
          break;
        }
        default:
          this.logger.log(`Installed item without specific hook: ${item.type}`);
      }
    } catch (err) {
      this.logger.warn(`Post-install hook failed for ${item.slug}: ${(err as Error).message}`);
    }
    return installation;
  }

  listInstalled(tenantId: string) {
    return this.db.tenantInstallation.findMany({
      where: { tenantId },
      include: { item: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  updateInstallation(tenantId: string, installationId: string, updates: { status?: 'installed' | 'enabled' | 'disabled'; configuration?: Record<string, unknown> }) {
    return this.db.tenantInstallation.update({
      where: { id: installationId },
      data: {
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.configuration ? { configuration: updates.configuration as any } : {}),
      },
    });
  }

  async uninstall(tenantId: string, installationId: string) {
    const inst = await this.db.tenantInstallation.findUnique({ where: { id: installationId }, include: { item: true } });
    if (!inst) throw new NotFoundException('Installation not found');
    try {
      const item = inst.item as any;
      switch (item.type) {
        case 'workflow': {
          // No direct link; best-effort cleanup could be implemented here
          break;
        }
        case 'widget': {
          const tenant = await this.tenants.findOne(tenantId);
          const settings = (tenant as any).settings || {};
          const dashboard = settings.dashboard || { widgets: [] };
          dashboard.widgets = (dashboard.widgets || []).filter((w: any) => w.slug !== item.slug);
          await this.tenants.updateDashboardConfig(tenantId, dashboard);
          break;
        }
        default:
          // No-op cleanup
          break;
      }
    } catch (err) {
      this.logger.warn(`Post-uninstall hook failed for installation ${installationId}: ${(err as Error).message}`);
    }
    return this.db.tenantInstallation.delete({ where: { id: installationId } });
  }

  addReview(itemId: string, userId: string, rating: number, comment?: string) {
    return this.db.marketplaceReview.create({
      data: { itemId, userId, rating, comment },
      include: {
        user: { select: { firstName: true, lastName: true } },
        item: { select: { name: true } }
      }
    }).then(review => ({
      ...review,
      authorName: `${review.user.firstName} ${review.user.lastName}`.trim()
    }));
  }

  async getReviewsByItemSlug(slug: string) {
    const item = await this.getBySlug(slug);
    if (!item) throw new NotFoundException('Item not found');
    return this.db.marketplaceReview.findMany({
      where: { itemId: item.id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }).then(reviews => reviews.map((r: any) => ({
      ...r,
      authorName: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || 'Anonymous'
    })));
  }

  async seedDemo(tenantId: string, userId: string) {
    // Create demo items if missing
    const existing = await this.db.marketplaceItem.findMany({ where: { vendorName: 'Glavito' } });
    const names = new Set(existing.map(i => i.slug));
    const toCreate: Array<Parameters<typeof this.db.marketplaceItem.create>[0]['data']> = [];

    if (!names.has('auto-assign-workflow')) {
      toCreate.push({
        type: 'workflow',
        name: 'Auto-Assign by Load',
        slug: 'auto-assign-workflow',
        description: 'Automatically assign tickets to the least-loaded available agent.',
        category: 'workflow',
        tags: ['workflow', 'routing', 'automation'] as any,
        isPremium: false,
        rating: 4.6,
        ratingCount: 123,
        installCount: 0,
        vendorName: 'Glavito',
        screenshots: [] as any,
        metadata: {} as any,
        content: {
          name: 'Auto-Assign by Load',
          type: 'n8n',
          triggers: [{ type: 'ticket.created' }],
          actions: [],
          conditions: [],
          metadata: { category: 'routing' },
        } as any,
      });
    }

    if (!names.has('whatsapp-channel')) {
      toCreate.push({
        type: 'channel',
        name: 'WhatsApp Business',
        slug: 'whatsapp-channel',
        description: 'Connect WhatsApp Business for inbound and outbound messaging.',
        category: 'integration',
        tags: ['channel', 'whatsapp'] as any,
        isPremium: false,
        rating: 4.8,
        ratingCount: 220,
        installCount: 0,
        vendorName: 'Glavito',
        screenshots: [] as any,
        metadata: {} as any,
        content: {
          type: 'channel',
          configuration: { provider: 'whatsapp', apiKey: '', phoneNumber: '' },
        } as any,
      });
    }

    for (const data of toCreate) {
      await this.db.marketplaceItem.create({ data });
    }

    return { success: true, created: toCreate.length };
  }
}


