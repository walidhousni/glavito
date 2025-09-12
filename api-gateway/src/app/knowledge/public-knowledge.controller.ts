import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { KnowledgeService } from './knowledge.service';
import { DatabaseService } from '@glavito/shared-database';

// Public endpoints to power the customer portal search (no auth, but requires tenant param)
@ApiTags('public-knowledge')
@Controller('public/knowledge')
export class PublicKnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly db: DatabaseService,
  ) {}

  private normalizeHost(raw?: string): string {
    if (!raw) return ''
    const host = String(raw).toLowerCase().split(':')[0]
    return host.startsWith('www.') ? host.slice(4) : host
  }

  private async resolveTenantIdFromRequest(req: any, tenantIdParam?: string): Promise<string | null> {
    if (tenantIdParam) return tenantIdParam
    const headerTenantId = req.get('x-tenant-id') || req.get('X-Tenant-ID')
    if (headerTenantId) return String(headerTenantId)
    const rawHost = req.get('x-tenant-host') || req.get('X-Tenant-Host') || req.get('host') || ''
    const host = this.normalizeHost(rawHost)
    if (!host) return null
    // 1) Custom domain exact match
    const cd = await this.db.customDomain.findFirst({ where: { domain: host } }).catch(() => null)
    if (cd && (cd as any).tenantId) return (cd as any).tenantId as string
    // 2) Subdomain match (first label)
    const first = host.split('.')[0]
    if (first) {
      const t = await this.db.tenant.findFirst({ where: { subdomain: first } }).catch(() => null)
      if (t) return (t as any).id as string
    }
    return null
  }

  @Get('search')
  @ApiOperation({ summary: 'Public search of KB and FAQs (requires tenantId)' })
  async publicSearch(@Req() req: any, @Query('tenantId') tenantId: string, @Query('q') q: string, @Query('limit') limit?: string) {
    const resolved = await this.resolveTenantIdFromRequest(req, tenantId)
    if (!resolved) return { articles: [], faqs: [] };
    return this.knowledgeService.search(resolved, q || '', limit ? parseInt(limit, 10) : 10);
  }

  @Get('articles/:id')
  @ApiOperation({ summary: 'Public get article by id (requires tenantId)' })
  async publicArticle(@Req() req: any, @Query('tenantId') tenantId: string, @Param('id') id: string) {
    const resolved = await this.resolveTenantIdFromRequest(req, tenantId)
    if (!resolved) return null;
    return this.knowledgeService.getArticle(resolved, id);
  }

  @Get('faqs/:id')
  @ApiOperation({ summary: 'Public get FAQ by id (requires tenantId)' })
  async publicFaq(@Req() req: any, @Query('tenantId') tenantId: string, @Param('id') id: string) {
    const resolved = await this.resolveTenantIdFromRequest(req, tenantId)
    if (!resolved) return null;
    return this.knowledgeService.getFaq(resolved, id);
  }
}


