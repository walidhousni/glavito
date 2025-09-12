import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { FilesService } from '../files/files.service';

@Injectable()
export class CustomerPortalService {
  constructor(private readonly db: DatabaseService, private readonly files: FilesService) {}

  // Portal CRUD
  async getPortalByTenant(tenantId: string) {
    const portal = await this.db.customerPortal.findFirst({ where: { tenantId } });
    return portal || null;
  }

  async upsertPortal(tenantId: string, payload: {
    name?: string;
    description?: string;
    subdomain?: string;
    customDomain?: string | null;
    branding?: Record<string, unknown>;
    features?: Record<string, unknown>;
    customization?: Record<string, unknown>;
    seoSettings?: Record<string, unknown>;
    isActive?: boolean;
  }) {
    const existing = await this.db.customerPortal.findFirst({ where: { tenantId } });
    if (existing) {
      return this.db.customerPortal.update({ where: { id: existing.id }, data: payload as any });
    }
    return this.db.customerPortal.create({ data: { tenantId, name: payload.name || 'Customer Portal', subdomain: payload.subdomain || 'support', ...(payload as any) } });
  }

  async publish(tenantId: string) {
    const portal = await this.getPortalByTenant(tenantId);
    if (!portal) throw new NotFoundException('Portal not found');
    return this.db.customerPortal.update({ where: { id: portal.id }, data: { isPublished: true, publishedAt: new Date(), lastPublishedAt: new Date() } });
  }

  // Pages
  async listPages(tenantId: string) {
    const portal = await this.getPortalByTenant(tenantId);
    if (!portal) return [];
    return this.db.customerPortalPage.findMany({ where: { portalId: portal.id }, orderBy: { sortOrder: 'asc' } });
  }

  async upsertPage(tenantId: string, payload: {
    id?: string;
    name: string;
    slug: string;
    title: string;
    content: string;
    pageType?: string;
    sortOrder?: number;
    seoTitle?: string | null;
    seoDescription?: string | null;
    customCss?: string | null;
    customJs?: string | null;
    isActive?: boolean;
  }) {
    const portal = await this.getPortalByTenant(tenantId);
    if (!portal) throw new NotFoundException('Portal not found');
    if (payload.id) {
      const existing = await this.db.customerPortalPage.findFirst({ where: { id: payload.id, portalId: portal.id } });
      if (!existing) throw new NotFoundException('Page not found');
      return this.db.customerPortalPage.update({ where: { id: existing.id }, data: { ...payload, portalId: portal.id } as any });
    }
    return this.db.customerPortalPage.create({ data: { ...payload, portalId: portal.id } as any });
  }

  async deletePage(tenantId: string, pageId: string) {
    const portal = await this.getPortalByTenant(tenantId);
    if (!portal) throw new NotFoundException('Portal not found');
    const page = await this.db.customerPortalPage.findFirst({ where: { id: pageId, portalId: portal.id } });
    if (!page) throw new NotFoundException('Page not found');
    await this.db.customerPortalPage.delete({ where: { id: page.id } });
    return { success: true } as const;
  }

  // Themes
  async listThemes(tenantId: string) {
    const portal = await this.getPortalByTenant(tenantId);
    if (!portal) return [];
    return this.db.customerPortalTheme.findMany({ where: { portalId: portal.id }, orderBy: { updatedAt: 'desc' } });
  }

  async upsertTheme(tenantId: string, payload: {
    id?: string;
    name: string;
    description?: string | null;
    colors?: Record<string, unknown>;
    typography?: Record<string, unknown>;
    layout?: Record<string, unknown>;
    components?: Record<string, unknown>;
    customCss?: string | null;
    isActive?: boolean;
  }) {
    const portal = await this.getPortalByTenant(tenantId);
    if (!portal) throw new NotFoundException('Portal not found');
    if (payload.id) {
      const existing = await this.db.customerPortalTheme.findFirst({ where: { id: payload.id, portalId: portal.id } });
      if (!existing) throw new NotFoundException('Theme not found');
      return this.db.customerPortalTheme.update({ where: { id: existing.id }, data: { ...payload, portalId: portal.id } as any });
    }
    return this.db.customerPortalTheme.create({ data: { ...payload, portalId: portal.id } as any });
  }

  // Widgets
  async listWidgets(tenantId: string) {
    const portal = await this.getPortalByTenant(tenantId);
    if (!portal) return [];
    return this.db.portalWidget.findMany({ where: { portalId: portal.id }, orderBy: { sortOrder: 'asc' } });
  }

  async upsertWidget(tenantId: string, payload: {
    id?: string;
    name: string;
    type: string;
    configuration?: Record<string, unknown>;
    position?: Record<string, unknown>;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const portal = await this.getPortalByTenant(tenantId);
    if (!portal) throw new NotFoundException('Portal not found');
    if (payload.id) {
      const existing = await this.db.portalWidget.findFirst({ where: { id: payload.id, portalId: portal.id } });
      if (!existing) throw new NotFoundException('Widget not found');
      return this.db.portalWidget.update({ where: { id: existing.id }, data: { ...payload, portalId: portal.id } as any });
    }
    return this.db.portalWidget.create({ data: { ...payload, portalId: portal.id } as any });
  }

  async deleteWidget(tenantId: string, widgetId: string) {
    const portal = await this.getPortalByTenant(tenantId);
    if (!portal) throw new NotFoundException('Portal not found');
    const widget = await this.db.portalWidget.findFirst({ where: { id: widgetId, portalId: portal.id } });
    if (!widget) throw new NotFoundException('Widget not found');
    await this.db.portalWidget.delete({ where: { id: widget.id } });
    return { success: true } as const;
  }
}


