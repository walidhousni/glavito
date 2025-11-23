import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { FilesService } from '../files/files.service';
import type {
  BrandAssetDTO,
  CreateBrandAssetRequest,
  FeatureToggleDTO,
  MobileAppConfigDTO,
  UpsertFeatureToggleRequest,
  UpsertMobileAppConfigRequest,
  UpsertWhiteLabelTemplateRequest,
  WhiteLabelTemplateDTO,
  TenantWhiteLabelSettings,
  WhiteLabelTheme,
  EmailTheme,
} from '@glavito/shared-types';

@Injectable()
export class WhiteLabelService {
  constructor(private readonly db: DatabaseService, private readonly files: FilesService) {}

  // Settings on Tenant
  async getSettings(tenantId: string): Promise<TenantWhiteLabelSettings> {
    const tenant = await this.db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const tier = ((tenant as any).whiteLabelTier || 'basic') as 'basic' | 'advanced' | 'enterprise';
    const settings = ((tenant as any).whiteLabelSettings || {}) as TenantWhiteLabelSettings;
    return { ...(settings || {}), tier } as TenantWhiteLabelSettings;
  }

  async updateSettings(tenantId: string, patch: Partial<TenantWhiteLabelSettings>) {
    const tenant = await this.db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const current = ((tenant as any).whiteLabelSettings || {}) as Record<string, unknown>;
    const merged = { ...current, ...patch } as any;
    await this.db.tenant.update({ where: { id: tenantId }, data: { whiteLabelSettings: merged as any } });
    return merged as TenantWhiteLabelSettings;
  }

  // Brand assets
  async listAssets(tenantId: string) {
    return this.db.brandAsset.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } }) as unknown as BrandAssetDTO[];
  }

  async createAsset(tenantId: string, payload: CreateBrandAssetRequest) {
    return this.db.brandAsset.create({ data: { tenantId, ...(payload as any) } }) as unknown as BrandAssetDTO;
  }

  async updateAsset(tenantId: string, id: string, patch: Partial<CreateBrandAssetRequest> & { isActive?: boolean; version?: number }) {
    const asset = await this.db.brandAsset.findFirst({ where: { id, tenantId } });
    if (!asset) throw new NotFoundException('Brand asset not found');
    return this.db.brandAsset.update({ where: { id }, data: patch as any }) as unknown as BrandAssetDTO;
  }

  async deleteAsset(tenantId: string, id: string) {
    const asset = await this.db.brandAsset.findFirst({ where: { id, tenantId } });
    if (!asset) throw new NotFoundException('Brand asset not found');
    await this.db.brandAsset.delete({ where: { id } });
    return { success: true } as const;
  }

  async processAndCreateAsset(
    tenantId: string,
    type: string,
    file: Express.Multer.File
  ): Promise<BrandAssetDTO> {
    if (!file) throw new NotFoundException('No file');
    const original = await this.files.uploadFile(file, { folder: 'brand-assets/originals' });
    const variants = await this.files.generateImageVariants(file, (type as any) || 'logo');
    const asset = await this.db.brandAsset.create({
      data: {
        tenantId,
        type,
        originalUrl: original.url,
        variants: variants as any,
        metadata: {
          mimeType: file.mimetype,
          size: file.size,
          originalKey: original.key,
        } as any,
      },
    });
    return asset as unknown as BrandAssetDTO;
  }

  // Templates
  async listTemplates(tenantId: string, type?: string) {
    return this.db.whiteLabelTemplate.findMany({ where: type ? { tenantId, type } : { tenantId }, orderBy: { updatedAt: 'desc' } }) as unknown as WhiteLabelTemplateDTO[];
  }

  async getTemplateById(tenantId: string, id: string) {
    const tpl = await this.db.whiteLabelTemplate.findFirst({ where: { id, tenantId } });
    if (!tpl) throw new NotFoundException('Template not found');
    return tpl as unknown as WhiteLabelTemplateDTO;
  }

  async upsertTemplate(tenantId: string, payload: UpsertWhiteLabelTemplateRequest & { subject?: string }) {
    const existing = await this.db.whiteLabelTemplate.findFirst({ where: { tenantId, type: payload.type, name: payload.name } });
    if (existing) {
      return this.db.whiteLabelTemplate.update({ where: { id: existing.id }, data: payload as any }) as unknown as WhiteLabelTemplateDTO;
    }
    return this.db.whiteLabelTemplate.create({ data: { tenantId, ...(payload as any) } }) as unknown as WhiteLabelTemplateDTO;
  }

  async deleteTemplate(tenantId: string, id: string) {
    const tpl = await this.db.whiteLabelTemplate.findFirst({ where: { id, tenantId } });
    if (!tpl) throw new NotFoundException('Template not found');
    await this.db.whiteLabelTemplate.delete({ where: { id } });
    return { success: true } as const;
  }

  // Email tracking helpers
  async createDelivery(tenantId: string, args: { to: string; subject: string; templateId?: string | null; variables?: Record<string, unknown>; messageId?: string | null }) {
    return this.db.emailDelivery.create({
      data: {
        tenantId,
        to: String(args.to),
        subject: String(args.subject),
        templateId: args.templateId || null,
        variables: (args.variables || {}) as any,
        status: 'sent',
        messageId: args.messageId || null,
        sentAt: new Date(),
      },
    });
  }

  async listDeliveries(tenantId: string, take = 50) {
    return this.db.emailDelivery.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take });
  }

  async listDeliveriesWithFilters(tenantId: string, opts: { take?: number; status?: string; q?: string }) {
    const where: any = { tenantId };
    if (opts?.status) where.status = opts.status;
    if (opts?.q) where.OR = [{ to: { contains: opts.q, mode: 'insensitive' } }, { subject: { contains: opts.q, mode: 'insensitive' } }];
    return this.db.emailDelivery.findMany({ where, orderBy: { createdAt: 'desc' }, take: Number(opts?.take || 50) });
  }

  async recordEmailOpen(tenantId: string, deliveryId: string, meta?: { ip?: string; userAgent?: string }) {
    const delivery = await this.db.emailDelivery.findFirst({ where: { id: deliveryId, tenantId } });
    if (!delivery) return;
    const now = new Date();
    await this.db.$transaction([
      this.db.emailEvent.create({ data: { tenantId, deliveryId, type: 'open', ip: meta?.ip || null, userAgent: meta?.userAgent || null } }),
      this.db.emailDelivery.update({ where: { id: deliveryId }, data: { openedAt: delivery.openedAt || now, openCount: (delivery.openCount || 0) + 1, status: 'opened' } }),
    ]);
  }

  async recordEmailClick(tenantId: string, deliveryId: string, url: string, meta?: { ip?: string; userAgent?: string }) {
    const delivery = await this.db.emailDelivery.findFirst({ where: { id: deliveryId, tenantId } });
    if (!delivery) return;
    await this.db.$transaction([
      this.db.emailEvent.create({ data: { tenantId, deliveryId, type: 'click', url, ip: meta?.ip || null, userAgent: meta?.userAgent || null } }),
      this.db.emailDelivery.update({ where: { id: deliveryId }, data: { clickCount: (delivery.clickCount || 0) + 1, status: 'clicked' } }),
    ]);
  }

  async updateDeliveryMessageId(tenantId: string, deliveryId: string, messageId: string) {
    const delivery = await this.db.emailDelivery.findFirst({ where: { id: deliveryId, tenantId } });
    if (!delivery) return;
    await this.db.emailDelivery.update({ where: { id: deliveryId }, data: { messageId } });
  }

  async findDeliveryByMessageId(messageId: string) {
    return this.db.emailDelivery.findFirst({ where: { messageId } });
  }

  async recordDeliveryEventByMessageId(messageId: string, type: 'delivered' | 'bounce' | 'spam' | 'failed', meta?: { url?: string; ip?: string; userAgent?: string }) {
    const d = await this.findDeliveryByMessageId(messageId);
    if (!d) return;
    const now = new Date();
    const nextStatus = type === 'delivered' ? 'delivered' : type === 'bounce' ? 'bounced' : type === 'spam' ? 'failed' : 'failed';
    await this.db.$transaction([
      this.db.emailEvent.create({ data: { tenantId: d.tenantId, deliveryId: d.id, type, url: meta?.url || null, ip: meta?.ip || null, userAgent: meta?.userAgent || null } }),
      this.db.emailDelivery.update({ where: { id: d.id }, data: { status: nextStatus, deliveredAt: type === 'delivered' ? (d as any).deliveredAt || now : (d as any).deliveredAt || null } as any }),
    ]);
  }

  // Feature toggles
  async listToggles(tenantId: string) {
    return this.db.featureToggle.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } }) as unknown as FeatureToggleDTO[];
  }

  async upsertToggle(tenantId: string, payload: UpsertFeatureToggleRequest) {
    const existing = await this.db.featureToggle.findFirst({ where: { tenantId, featureKey: payload.featureKey } });
    if (existing) {
      return this.db.featureToggle.update({ where: { id: existing.id }, data: payload as any }) as unknown as FeatureToggleDTO;
    }
    return this.db.featureToggle.create({ data: { tenantId, ...(payload as any) } }) as unknown as FeatureToggleDTO;
  }

  async deleteToggle(tenantId: string, featureKey: string) {
    const existing = await this.db.featureToggle.findFirst({ where: { tenantId, featureKey } });
    if (!existing) throw new NotFoundException('Feature toggle not found');
    await this.db.featureToggle.delete({ where: { id: existing.id } });
    return { success: true } as const;
  }

  // Mobile app config
  async getMobileConfig(tenantId: string) {
    const cfg = await this.db.mobileAppConfig.findFirst({ where: { tenantId }, orderBy: { updatedAt: 'desc' } });
    return (cfg || null) as unknown as MobileAppConfigDTO | null;
  }

  async upsertMobileConfig(tenantId: string, payload: UpsertMobileAppConfigRequest) {
    const existing = await this.db.mobileAppConfig.findFirst({ where: { tenantId, bundleId: payload.bundleId } });
    if (existing) {
      return this.db.mobileAppConfig.update({ where: { id: existing.id }, data: payload as any }) as unknown as MobileAppConfigDTO;
    }
    return this.db.mobileAppConfig.create({ data: { tenantId, ...(payload as any) } }) as unknown as MobileAppConfigDTO;
  }

  // Theme computation
  async computeTheme(tenantId: string): Promise<WhiteLabelTheme> {
    const tenant = await this.db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const wl: any = (tenant as any).whiteLabelSettings || {};
    const branding: any = wl.branding || (tenant as any).brandingConfig || {};
    // Attempt to find active assets for logo and favicon
    const [logoAsset] = (await this.db.brandAsset.findMany({ where: { tenantId, type: 'logo', isActive: true }, orderBy: { updatedAt: 'desc' }, take: 1 })) as any[];
    const [faviconAsset] = (await this.db.brandAsset.findMany({ where: { tenantId, type: 'favicon', isActive: true }, orderBy: { updatedAt: 'desc' }, take: 1 })) as any[];
    const logoUrl = branding?.logoUrl || wl?.assets?.logoUrl || logoAsset?.originalUrl || '';
    const faviconUrl = branding?.faviconUrl || wl?.assets?.faviconUrl || faviconAsset?.originalUrl || '';
    const primary = branding?.primaryColor || wl?.branding?.primaryColor || '#2563EB';
    const secondary = branding?.secondaryColor || wl?.branding?.secondaryColor || '#0EA5E9';
    const accent = branding?.accentColor || wl?.branding?.accentColor || '#10B981';
    const surface = '#ffffff';
    const onPrimary = '#ffffff';
    const fontFamily = branding?.fontFamily || wl?.branding?.fontFamily || 'Arial, Helvetica, sans-serif';
    const emailTheme: EmailTheme = wl?.emailTheme || {
      headerBackground: primary,
      bodyBackground: '#F6F8FA',
      contentBackground: '#FFFFFF',
      textColor: '#111827',
      linkColor: primary,
      buttonBackground: primary,
      buttonTextColor: '#FFFFFF',
      footerText: 'You are receiving this email because you interacted with our services.',
    };
    return {
      colors: { primary, secondary, accent, surface, onPrimary },
      typography: { fontFamily },
      assets: { logoUrl, faviconUrl },
      email: emailTheme,
    } as WhiteLabelTheme;
  }

  // Activate a specific brand asset (and optionally deactivate others of same type)
  async activateAsset(tenantId: string, id: string): Promise<BrandAssetDTO> {
    const asset = await this.db.brandAsset.findFirst({ where: { id, tenantId } });
    if (!asset) throw new NotFoundException('Brand asset not found');
    // Deactivate others of same type
    await this.db.brandAsset.updateMany({ where: { tenantId, type: (asset as any).type, NOT: { id } }, data: { isActive: false } });
    const updated = await this.db.brandAsset.update({ where: { id }, data: { isActive: true, version: ((asset as any).version || 1) + 1 } });
    return updated as unknown as BrandAssetDTO;
  }

  // Simple safety for redirect URLs
  validateRedirectUrl(url: string): string {
    try {
      const u = new URL(url);
      const allowed = ['http:', 'https:'];
      if (!allowed.includes(u.protocol)) throw new Error('Invalid protocol');
      // Optionally: restrict to same-site or allow all https
      return u.toString();
    } catch {
      throw new BadRequestException('Invalid URL');
    }
  }
}


