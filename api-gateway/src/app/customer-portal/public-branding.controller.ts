import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { WhiteLabelService } from '../white-label/white-label.service';

@Controller('public/portal')
export class PublicPortalBrandingController {
  constructor(private readonly db: DatabaseService, private readonly wl: WhiteLabelService) {}

  private async resolveTenantId(host?: string, subdomain?: string): Promise<string | null> {
    if (subdomain) {
      const tenant = await this.db.tenant.findFirst({ where: { subdomain: String(subdomain).toLowerCase() } });
      if (tenant) return (tenant as any).id as string;
    }
    const rawHost = String(host || '').toLowerCase();
    if (!rawHost) return null;
    const custom = await this.db.customDomain.findFirst({ where: { domain: rawHost, status: 'active' } });
    if (custom) return (custom as any).tenantId as string;
    const base = (process.env.BASE_APP_DOMAIN || '').toLowerCase();
    if (base && rawHost.endsWith(base)) {
      const sub = rawHost.slice(0, -base.length).replace(/\.$/, '');
      const sd = sub.split('.').filter(Boolean).pop();
      if (sd) {
        const t = await this.db.tenant.findFirst({ where: { subdomain: sd } });
        if (t) return (t as any).id as string;
      }
    }
    return null;
  }

  // JSON branding payload for portals
  @Get('branding.json')
  async getBrandingJson(@Headers('host') host: string, @Query('subdomain') subdomain?: string) {
    const tenantId = await this.resolveTenantId(host, subdomain);
    if (!tenantId) return { name: 'Portal', theme: null };
    const theme = await this.wl.computeTheme(tenantId);
    const tenant = await this.db.tenant.findUnique({ where: { id: tenantId } });
    const name = ((tenant as any)?.whiteLabelSettings as any)?.name || (tenant as any)?.name || 'Portal';
    return { name, theme };
  }

  // Lightweight script to inject portal theme
  @Get('branding.js')
  async getBrandingScript(@Headers('host') host: string, @Query('subdomain') subdomain?: string) {
    const data = (await this.getBrandingJson(host, subdomain)) as any;
    const script = `(() => {
      try {
        const branding = ${JSON.stringify(data)};
        window.__PORTAL_BRANDING__ = branding;
        if (branding?.theme?.colors?.primary) {
          const root = document.documentElement;
          root.style.setProperty('--portal-primary', branding.theme.colors.primary);
          root.style.setProperty('--portal-accent', branding.theme.colors.accent || branding.theme.colors.primary);
        }
      } catch {}
    })();`;
    return { 'content-type': 'application/javascript; charset=utf-8', body: script } as any;
  }
}


