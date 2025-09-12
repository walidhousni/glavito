import { Controller, Get, Req } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { DatabaseService } from '@glavito/shared-database'

@ApiTags('Public Tenants')
@Controller('public')
export class PublicTenantsController {
  constructor(private readonly db: DatabaseService) {}

  private normalizeHost(raw?: string): string {
    if (!raw) return ''
    const host = String(raw).toLowerCase().split(':')[0]
    return host.startsWith('www.') ? host.slice(4) : host
  }

  private async resolveTenantIdFromRequest(req: { get: (name: string) => string | undefined }): Promise<string | null> {
    const headerTenantId = req.get('x-tenant-id') || req.get('X-Tenant-ID')
    if (headerTenantId) return String(headerTenantId)
    const rawHost = req.get('x-tenant-host') || req.get('X-Tenant-Host') || req.get('host') || ''
    const host = this.normalizeHost(rawHost)
    if (!host) return null
    const cd = await this.db.customDomain.findFirst({ where: { domain: host } }).catch(() => null)
    if (cd && (cd as { tenantId: string }).tenantId) return (cd as { tenantId: string }).tenantId
    const first = host.split('.')[0]
    if (first) {
      const t = await this.db.tenant.findFirst({ where: { subdomain: first } }).catch(() => null)
      if (t) return (t as { id: string }).id
    }
    return null
  }

  @Get('branding')
  @ApiOperation({ summary: 'Get public branding for current host' })
  async publicBranding(@Req() req: { get: (name: string) => string | undefined }) {
    const tenantId = await this.resolveTenantIdFromRequest(req)
    if (!tenantId) return {}
    const tenant = await this.db.tenant.findUnique({ where: { id: tenantId } }).catch(() => null)
    if (!tenant) return {}
    const raw = tenant as unknown as { name: string; brandingConfig?: { name?: string; colors?: Record<string, unknown>; customCSS?: string; faviconUrl?: string; logoUrl?: string } }
    const cfg = raw?.brandingConfig || {}
    return { name: cfg.name ?? raw?.name, ...cfg }
  }
}


