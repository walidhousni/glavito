import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '@glavito/shared-auth';
import { WhiteLabelService } from './white-label.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { DomainService } from './domain.service';
import { TemplateEngineService } from './template-engine.service';
import { EmailService } from '../email/email.service';
import type { EmailTheme, TenantWhiteLabelSettings, UpsertWhiteLabelTemplateRequest } from '@glavito/shared-types';

@ApiTags('white-label')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('white-label')
export class WhiteLabelController {
  constructor(private readonly wl: WhiteLabelService, private readonly domains: DomainService, private readonly tpl: TemplateEngineService, private readonly email: EmailService) {}

  // Settings
  @Get('settings')
  @ApiOperation({ summary: 'Get white label settings for current tenant' })
  async getSettings(@Req() req: { user?: { tenantId?: string } }) {
    return this.wl.getSettings(String(req.user?.tenantId || ''));
  }

  @Patch('settings')
  @Roles('admin')
  @ApiOperation({ summary: 'Update white label settings for current tenant' })
  async updateSettings(@Req() req: { user?: { tenantId?: string } }, @Body() body: Partial<TenantWhiteLabelSettings>) {
    return this.wl.updateSettings(String(req.user?.tenantId || ''), body);
  }

  // Convenience scoped updates for company and localization subsections
  @Patch('settings/company')
  @Roles('admin')
  @ApiOperation({ summary: 'Update company profile settings (name, website, contacts, address, business hours)' })
  async updateCompany(
    @Req() req: { user?: { tenantId?: string } },
    @Body() body: { name?: string; website?: string; industry?: string; size?: string; contact?: { email?: string; phone?: string }; address?: { street?: string; city?: string; state?: string; postalCode?: string; country?: string }; businessHours?: { enabled?: boolean; timezone?: string; days?: Array<{ day: string; enabled: boolean; openTime?: string; closeTime?: string }> } },
  ) {
    const tenantId = String(req.user?.tenantId || '');
    const current = await this.wl.getSettings(tenantId);
    const next = { ...(current || {}), company: { ...(current as any)?.company, ...(body || {}) } } as any;
    return this.wl.updateSettings(tenantId, next);
  }

  @Patch('settings/localization')
  @Roles('admin')
  @ApiOperation({ summary: 'Update localization settings (language, timezone, currency, formats)' })
  async updateLocalization(
    @Req() req: { user?: { tenantId?: string } },
    @Body() body: { language?: string; timezone?: string; currency?: string; dateFormat?: string; timeFormat?: string },
  ) {
    const tenantId = String(req.user?.tenantId || '');
    const current = await this.wl.getSettings(tenantId);
    const next = { ...(current || {}), localization: { ...(current as any)?.localization, ...(body || {}) } } as any;
    return this.wl.updateSettings(tenantId, next);
  }

  // Assets
  @Get('assets')
  @ApiOperation({ summary: 'List brand assets' })
  async listAssets(@Req() req: { user?: { tenantId?: string } }) {
    return this.wl.listAssets(String(req.user?.tenantId || ''));
  }

  @Post('assets')
  @Roles('admin')
  @ApiOperation({ summary: 'Create a brand asset (metadata record)' })
  async createAsset(
    @Req() req: { user?: { tenantId?: string } },
    @Body() body: { type: string; originalUrl: string; variants?: Array<Record<string, unknown>>; metadata?: Record<string, unknown> },
  ) {
    return this.wl.createAsset(String(req.user?.tenantId || ''), body as any);
  }

  @Post('assets/upload')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and process a brand asset (image variants)' })
  async uploadAsset(@Req() req: { user?: { tenantId?: string } }, @UploadedFile() file: Express.Multer.File, @Query('type') type = 'logo') {
    return this.wl.processAndCreateAsset(String(req.user?.tenantId || ''), type, file);
  }

  @Patch('assets/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a brand asset' })
  async updateAsset(@Req() req: { user?: { tenantId?: string } }, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.wl.updateAsset(String(req.user?.tenantId || ''), id, body as Record<string, unknown>);
  }

  @Post('assets/:id/activate')
  @Roles('admin')
  @ApiOperation({ summary: 'Activate a brand asset and deactivate others of the same type' })
  async activateAsset(@Req() req: { user?: { tenantId?: string } }, @Param('id') id: string) {
    return this.wl.activateAsset(String(req.user?.tenantId || ''), id);
  }

  @Delete('assets/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a brand asset' })
  async deleteAsset(@Req() req: { user?: { tenantId?: string } }, @Param('id') id: string) {
    return this.wl.deleteAsset(String(req.user?.tenantId || ''), id);
  }

  // Templates
  @Get('templates')
  @ApiOperation({ summary: 'List white-label templates' })
  async listTemplates(@Req() req: { user?: { tenantId?: string } }, @Query('type') type?: string) {
    return this.wl.listTemplates(String(req.user?.tenantId || ''), type);
  }

  @Post('templates')
  @Roles('admin')
  @ApiOperation({ summary: 'Upsert a white-label template' })
  async upsertTemplate(
    @Req() req: { user?: { tenantId?: string } },
    @Body() body: UpsertWhiteLabelTemplateRequest & { subject?: string },
  ) {
    return this.wl.upsertTemplate(String(req.user?.tenantId || ''), body);
  }

  @Delete('templates/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a white-label template' })
  async deleteTemplate(@Req() req: { user?: { tenantId?: string } }, @Param('id') id: string) {
    return this.wl.deleteTemplate(String(req.user?.tenantId || ''), id);
  }

  @Post('templates/preview')
  @Roles('admin')
  @ApiOperation({ summary: 'Preview template rendering with variables' })
  async previewTemplate(@Req() req: { user?: { tenantId?: string } }, @Body() body: { content: string; variables?: Record<string, unknown> }) {
    const tenantId = String(req.user?.tenantId || '');
    const result = this.tpl.render(String(body?.content || ''), (body?.variables as any) || {});
    
    // Wrap in email theme for consistency with actual sends
    const theme = await this.wl.computeTheme(tenantId);
    const settings = await this.wl.getSettings(tenantId);
    const wrappedHtml = this.tpl.wrapEmailHtml({
      html: result.content,
      theme: theme.email as EmailTheme,
      logoUrl: theme.assets.logoUrl,
      brandName: (settings as any)?.company?.name || 'Glavito',
    });
    
    return { content: wrappedHtml, engine: result.engine, success: true };
  }

  @Post('templates/:id/test-send')
  @Roles('admin')
  @ApiOperation({ summary: 'Test send an email template to a recipient' })
  async testSendTemplate(
    @Req() req: { user?: { tenantId?: string } },
    @Param('id') id: string,
    @Body() body: { to: string; variables?: Record<string, unknown> }
  ) {
    const tenantId = String(req.user?.tenantId || '');
    const tpl = await this.wl.getTemplateById(tenantId, id);
    if ((tpl as any).type !== 'email') {
      return { success: false, error: 'Template is not of type email' };
    }
    
    // Check DNS validation for sender domain
    const settings = await this.wl.getSettings(tenantId);
    const smtp = (settings as any)?.smtp || null;
    const fromEmail = smtp?.from || process.env.EMAIL_FROM || '';
    const senderDomain = fromEmail.includes('@') ? fromEmail.split('@')[1] : null;
    
    if (senderDomain) {
      try {
        const dnsValidation = await this.domains.validateEmailDns(tenantId, senderDomain);
        if (!dnsValidation.passed) {
          return {
            success: false,
            error: 'DNS validation required',
            message: 'Please configure SPF, DKIM, and DMARC records for your sender domain before sending emails. Use the DNS guidance tool to get the required records.',
            dnsValidation,
          };
        }
      } catch (dnsError) {
        // If DNS validation fails due to error (not missing records), allow sending but warn
        // This handles cases where DNS lookup fails temporarily
      }
    }
    const subjectRendered = this.tpl.render((tpl as any).subject || tpl.name, body?.variables || {}).content;
    let htmlRendered = this.tpl.render((tpl as any).content || '', body?.variables || {}).content;
    // Wrap in email theme
    const theme = await this.wl.computeTheme(tenantId);
    htmlRendered = this.tpl.wrapEmailHtml({
      html: htmlRendered,
      theme: theme.email as EmailTheme,
      logoUrl: theme.assets.logoUrl,
      brandName: (await this.wl.getSettings(tenantId) as any)?.branding?.name || 'Glavito',
    });
    // Inject tracking pixel
    const deliveryId = (await this.wl.createDelivery(tenantId, { to: String(body?.to || ''), subject: subjectRendered, templateId: (tpl as any).id, variables: body?.variables || {} as any, messageId: null })).id;
    const baseUrl = process.env.PUBLIC_API_BASE_URL || '';
    const pixelUrl = `${baseUrl}/white-label/t/open?d=${encodeURIComponent(deliveryId)}&t=${encodeURIComponent(tenantId)}`;
    htmlRendered = `${htmlRendered}\n<img src="${pixelUrl}" alt="" width="1" height="1" style="display:none"/>`;
    // Rewrite links to pass through click tracker
    htmlRendered = htmlRendered.replace(/href="(.*?)"/g, (_m, p1) => {
      let url = String(p1 || '');
      try { url = this.wl.validateRedirectUrl(url); } catch { /* ignore invalid, keep original */ }
      const tracked = `${baseUrl}/white-label/t/click?d=${encodeURIComponent(deliveryId)}&u=${encodeURIComponent(url)}&t=${encodeURIComponent(tenantId)}`;
      return `href="${tracked}"`;
    });
    const { messageId } = await this.email.dispatchEmailForTenant(tenantId, { to: String(body?.to || ''), subject: subjectRendered, html: htmlRendered });
    if (messageId) {
      try { await this.wl['db'].emailDelivery.update({ where: { id: deliveryId }, data: { messageId } as any }); } catch { /* best-effort */ }
    }
    return { success: true, deliveryId } as any;
  }

  // SMTP settings
  @Get('smtp')
  @Roles('admin')
  @ApiOperation({ summary: 'Get per-tenant SMTP configuration (password redacted)' })
  async getSmtp(@Req() req: { user?: { tenantId?: string } }) {
    const settings = await this.wl.getSettings(String(req.user?.tenantId || ''));
    const smtp = (settings as any)?.smtp || null;
    if (!smtp) return { smtp: null };
    const rest = { ...(smtp as any) };
    delete (rest as any).pass;
    return { smtp: rest };
  }

  // Deliveries
  @Get('deliveries')
  @Roles('admin')
  @ApiOperation({ summary: 'List recent email deliveries for current tenant' })
  async listDeliveries(@Req() req: { user?: { tenantId?: string } }, @Query('take') take?: string, @Query('status') status?: string, @Query('q') q?: string) {
    return this.wl.listDeliveriesWithFilters(String(req.user?.tenantId || ''), { take: Number(take || 50), status: status ? String(status) : undefined, q: q ? String(q) : undefined });
  }

  @Post('email/webhook')
  @ApiOperation({ summary: 'Inbound webhook for SMTP provider events (delivered/bounce/failed/spam)' })
  async emailWebhook(@Body() body: any) {
    const messageId = String(body?.messageId || body?.MessageID || body?.message_id || body?.['message-id'] || '');
    const eventRaw = String(body?.event || body?.Event || body?.type || '').toLowerCase();
    const map: Record<string, 'delivered' | 'bounce' | 'spam' | 'failed'> = {
      delivered: 'delivered',
      delivery: 'delivered',
      bounced: 'bounce',
      bounce: 'bounce',
      complaint: 'spam',
      spam: 'spam',
      rejected: 'failed',
      failure: 'failed',
      failed: 'failed',
      hard_bounce: 'bounce',
      soft_bounce: 'bounce',
    };
    const event = map[eventRaw] || 'failed';
    if (!messageId) return { ok: false };
    await this.wl.recordDeliveryEventByMessageId(messageId, event, { ip: body?.ip, userAgent: body?.userAgent });
    return { ok: true };
  }

  @Patch('smtp')
  @Roles('admin')
  @ApiOperation({ summary: 'Update per-tenant SMTP configuration' })
  async updateSmtp(@Req() req: any, @Body() body: { host: string; port: number; user: string; pass?: string; from?: string; secure?: boolean }) {
    const current = await this.wl.getSettings(req.user?.tenantId as string);
    const next = { ...(current as any), smtp: { ...(current as any)?.smtp, ...body } } as any;
    const saved = await this.wl.updateSettings(req.user?.tenantId as string, next);
    const rest = { ...((saved as any).smtp || {}) };
    delete (rest as any).pass;
    return { smtp: rest };
  }

  @Post('smtp/test')
  @Roles('admin')
  @ApiOperation({ summary: 'Verify SMTP connectivity (does not send an email)' })
  async testSmtp(@Body() body: { host: string; port: number; user: string; pass?: string; from?: string; secure?: boolean }) {
    const result = await this.email.testSmtpConfig({
      host: String(body?.host || ''),
      port: Number(body?.port || 0),
      user: String(body?.user || ''),
      pass: String(body?.pass || ''),
      from: body?.from ? String(body.from) : undefined,
      secure: Boolean(body?.secure),
    });
    return result;
  }

  // Feature toggles
  @Get('toggles')
  @ApiOperation({ summary: 'List feature toggles' })
  async listToggles(@Req() req: { user?: { tenantId?: string } }) {
    return this.wl.listToggles(String(req.user?.tenantId || ''));
  }

  @Post('toggles')
  @Roles('admin')
  @ApiOperation({ summary: 'Upsert a feature toggle' })
  async upsertToggle(@Req() req: { user?: { tenantId?: string } }, @Body() body: { featureKey: string; isEnabled?: boolean; configuration?: Record<string, unknown>; restrictions?: unknown }) {
    return this.wl.upsertToggle(String(req.user?.tenantId || ''), body as any);
  }

  @Delete('toggles/:featureKey')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a feature toggle by key' })
  async deleteToggle(@Req() req: { user?: { tenantId?: string } }, @Param('featureKey') featureKey: string) {
    return this.wl.deleteToggle(String(req.user?.tenantId || ''), featureKey);
  }

  // Theme
  @Get('theme')
  @ApiOperation({ summary: 'Get computed white-label theme' })
  async getTheme(@Req() req: { user?: { tenantId?: string } }) {
    return this.wl.computeTheme(String(req.user?.tenantId || ''));
  }

  // Mobile
  @Get('mobile/config')
  @ApiOperation({ summary: 'Get mobile app config' })
  async getMobile(@Req() req: { user?: { tenantId?: string } }) {
    return this.wl.getMobileConfig(String(req.user?.tenantId || ''));
  }

  @Post('mobile/config')
  @Roles('admin')
  @ApiOperation({ summary: 'Upsert mobile app config' })
  async upsertMobile(@Req() req: { user?: { tenantId?: string } }, @Body() body: Record<string, unknown>) {
    return this.wl.upsertMobileConfig(String(req.user?.tenantId || ''), body as any);
  }

  // Domains
  @Get('domains')
  @ApiOperation({ summary: 'List custom domains' })
  async listDomains(@Req() req: { user?: { tenantId?: string } }) {
    return this.domains.listDomains(String(req.user?.tenantId || ''));
  }

  @Post('domains')
  @Roles('admin')
  @ApiOperation({ summary: 'Create custom domain and get verification instructions' })
  async createDomain(@Req() req: { user?: { tenantId?: string } }, @Body() body: { domain: string; portalId?: string }) {
    return this.domains.createDomain(String(req.user?.tenantId || ''), body);
  }

  @Post('domains/:id/check')
  @Roles('admin')
  @ApiOperation({ summary: 'Check DNS TXT verification status' })
  async checkDomain(@Req() req: { user?: { tenantId?: string } }, @Param('id') id: string) {
    return this.domains.checkVerification(String(req.user?.tenantId || ''), id);
  }

  @Post('domains/:id/ssl')
  @Roles('admin')
  @ApiOperation({ summary: 'Request SSL certificate (ACME placeholder)' })
  async requestSSL(@Req() req: { user?: { tenantId?: string } }, @Param('id') id: string) {
    return this.domains.requestSSL(String(req.user?.tenantId || ''), id);
  }

  @Delete('domains/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete custom domain' })
  async deleteDomain(@Req() req: { user?: { tenantId?: string } }, @Param('id') id: string) {
    return this.domains.deleteDomain(String(req.user?.tenantId || ''), id);
  }

  // Email DNS (DKIM/SPF/DMARC)
  @Get('domains/:domain/email-dns-guidance')
  @ApiOperation({ summary: 'Get SPF/DKIM/DMARC DNS records guidance for email sending' })
  async emailDnsGuidance(@Req() req: { user?: { tenantId?: string } }, @Param('domain') domain: string) {
    return this.domains.getEmailDnsGuidance(String(req.user?.tenantId || ''), domain);
  }

  @Get('domains/:domain/email-dns-validate')
  @ApiOperation({ summary: 'Validate SPF/DKIM/DMARC DNS records for the domain' })
  async emailDnsValidate(@Req() req: { user?: { tenantId?: string } }, @Param('domain') domain: string) {
    return this.domains.validateEmailDns(String(req.user?.tenantId || ''), domain);
  }
}


