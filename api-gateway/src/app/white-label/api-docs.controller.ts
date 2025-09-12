import { Controller, Get, Headers, Res } from '@nestjs/common';
import { Response } from 'express';
import { DatabaseService } from '@glavito/shared-database';

@Controller('white-label/docs')
export class ApiDocsBrandingController {
  constructor(private readonly db: DatabaseService) {}

  private async resolveTenantByHost(host?: string): Promise<{ name?: string; logoUrl?: string; primary?: string; supportEmail?: string } | null> {
    try {
      const rawHost = String(host || '').toLowerCase();
      if (!rawHost) return null;
      // Try custom domain match (strip leading 'api.' if present)
      const hostNoApi = rawHost.startsWith('api.') ? rawHost.slice(4) : rawHost;
      const custom = await this.db.customDomain.findFirst({ where: { domain: hostNoApi, status: 'active' } });
      let tenantId: string | null = null;
      if (custom) tenantId = (custom as any).tenantId as string;
      if (!tenantId) {
        const base = (process.env.BASE_APP_DOMAIN || '').toLowerCase();
        if (base && rawHost.endsWith(base)) {
          const sub = rawHost.slice(0, -base.length).replace(/\.$/, '');
          const subdomain = sub.split('.').filter(Boolean).pop();
          if (subdomain) {
            const tenant = await this.db.tenant.findFirst({ where: { subdomain: subdomain } });
            if (tenant) tenantId = (tenant as any).id as string;
          }
        }
      }
      if (!tenantId) return null;
      const tenant = await this.db.tenant.findUnique({ where: { id: tenantId } });
      const wl = ((tenant as any)?.whiteLabelSettings || {}) as any;
      const branding = ((tenant as any)?.brandingConfig || {}) as any;
      return {
        name: wl?.name || branding?.name || (tenant as any)?.name || 'API',
        logoUrl: branding?.logoUrl || wl?.assets?.logoUrl || '',
        primary: branding?.colors?.primary || wl?.colors?.primary || '#2563EB',
        supportEmail: wl?.supportEmail || 'support@' + (hostNoApi || 'example.com'),
      };
    } catch {
      return null;
    }
  }

  @Get('branding.js')
  async branding(@Headers('host') host: string, @Res() res: Response) {
    const cfg = (await this.resolveTenantByHost(host)) || { name: 'Glavito API', logoUrl: '', primary: '#2563EB', supportEmail: 'support@example.com' };
    const script = `(() => {
      try {
        const brandName = ${JSON.stringify(cfg.name)};
        const logoUrl = ${JSON.stringify(cfg.logoUrl || '')};
        const primary = ${JSON.stringify(cfg.primary || '#2563EB')};
        const support = ${JSON.stringify(cfg.supportEmail || '')};
        document.title = brandName + ' — API Docs';
        const css = '.swagger-ui .topbar { background: ' + primary + ' !important; }' +
                    '.topbar a.link, .topbar .download-url-wrapper { color: #fff !important; }';
        const s = document.createElement('style'); s.innerHTML = css; document.head.appendChild(s);
        const tb = document.querySelector('.topbar');
        if (tb) {
          const link = tb.querySelector('a.link');
          if (link) link.textContent = brandName + ' API';
          if (logoUrl) {
            const img = document.createElement('img');
            img.src = logoUrl; img.alt = brandName; img.style.maxHeight='28px'; img.style.marginRight='8px';
            tb.insertBefore(img, tb.firstChild);
          }
        }
        const banner = document.createElement('div');
        banner.style.cssText = 'background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:8px 12px;font:12px/1.4 system-ui;';
        banner.textContent = 'Support: ' + support + ' • Server: ' + (window.location.origin + '/api');
        const root = document.querySelector('#swagger-ui') || document.body;
        if (root) root.parentNode?.insertBefore(banner, root);
        setTimeout(() => { try { (window as any).ui?.specActions?.setServerUrl(window.location.origin + '/api'); } catch {} }, 1200);
      } catch {}
    })();`;
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.send(script);
  }
}


