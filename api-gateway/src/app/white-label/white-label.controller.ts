import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WhiteLabelService } from './white-label.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { DomainService } from './domain.service';
import { TemplateEngineService } from './template-engine.service';
import { EmailService } from '../auth/email.service';

@ApiTags('white-label')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('white-label')
export class WhiteLabelController {
  constructor(private readonly wl: WhiteLabelService, private readonly domains: DomainService, private readonly tpl: TemplateEngineService, private readonly email: EmailService) {}

  // Settings
  @Get('settings')
  @ApiOperation({ summary: 'Get white label settings for current tenant' })
  async getSettings(@Req() req: any) {
    return this.wl.getSettings(req.user?.tenantId as string);
  }

  @Patch('settings')
  @Roles('admin')
  @ApiOperation({ summary: 'Update white label settings for current tenant' })
  async updateSettings(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.wl.updateSettings(req.user?.tenantId as string, body as any);
  }

  // Assets
  @Get('assets')
  @ApiOperation({ summary: 'List brand assets' })
  async listAssets(@Req() req: any) {
    return this.wl.listAssets(req.user?.tenantId as string);
  }

  @Post('assets')
  @Roles('admin')
  @ApiOperation({ summary: 'Create a brand asset (metadata record)' })
  async createAsset(@Req() req: any, @Body() body: { type: string; originalUrl: string; variants?: any[]; metadata?: Record<string, unknown> }) {
    return this.wl.createAsset(req.user?.tenantId as string, body as any);
  }

  @Post('assets/upload')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and process a brand asset (image variants)' })
  async uploadAsset(@Req() req: any, @UploadedFile() file: any, @Query('type') type = 'logo') {
    return this.wl.processAndCreateAsset(req.user?.tenantId as string, type, file);
  }

  @Patch('assets/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a brand asset' })
  async updateAsset(@Req() req: any, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.wl.updateAsset(req.user?.tenantId as string, id, body as any);
  }

  @Delete('assets/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a brand asset' })
  async deleteAsset(@Req() req: any, @Param('id') id: string) {
    return this.wl.deleteAsset(req.user?.tenantId as string, id);
  }

  // Templates
  @Get('templates')
  @ApiOperation({ summary: 'List white-label templates' })
  async listTemplates(@Req() req: any, @Query('type') type?: string) {
    return this.wl.listTemplates(req.user?.tenantId as string, type);
  }

  @Post('templates')
  @Roles('admin')
  @ApiOperation({ summary: 'Upsert a white-label template' })
  async upsertTemplate(@Req() req: any, @Body() body: { type: string; name: string; subject?: string; content: string; variables?: any[]; isActive?: boolean }) {
    return this.wl.upsertTemplate(req.user?.tenantId as string, body as any);
  }

  @Delete('templates/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a white-label template' })
  async deleteTemplate(@Req() req: any, @Param('id') id: string) {
    return this.wl.deleteTemplate(req.user?.tenantId as string, id);
  }

  @Post('templates/preview')
  @Roles('admin')
  @ApiOperation({ summary: 'Preview template rendering with variables' })
  async previewTemplate(@Req() req: any, @Body() body: { content: string; variables?: Record<string, unknown> }) {
    const result = this.tpl.render(String(body?.content || ''), (body?.variables as any) || {});
    return { ...result, success: true };
  }

  @Post('templates/:id/test-send')
  @Roles('admin')
  @ApiOperation({ summary: 'Test send an email template to a recipient' })
  async testSendTemplate(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { to: string; variables?: Record<string, unknown> }
  ) {
    const tpl = await this.wl.getTemplateById(req.user?.tenantId as string, id);
    if ((tpl as any).type !== 'email') {
      return { success: false, error: 'Template is not of type email' };
    }
    const tenantId = String(req.user?.tenantId || '');
    const subjectRendered = this.tpl.render((tpl as any).subject || tpl.name, body?.variables || {}).content;
    let htmlRendered = this.tpl.render((tpl as any).content || '', body?.variables || {}).content;
    // Inject tracking pixel
    const deliveryId = (await this.wl.createDelivery(tenantId, { to: String(body?.to || ''), subject: subjectRendered, templateId: (tpl as any).id, variables: body?.variables || {} as any, messageId: null })).id;
    const baseUrl = process.env.PUBLIC_API_BASE_URL || '';
    const pixelUrl = `${baseUrl}/white-label/t/open?d=${encodeURIComponent(deliveryId)}&t=${encodeURIComponent(tenantId)}`;
    htmlRendered = `${htmlRendered}\n<img src="${pixelUrl}" alt="" width="1" height="1" style="display:none"/>`;
    // Rewrite links to pass through click tracker
    htmlRendered = htmlRendered.replace(/href=\"(.*?)\"/g, (_m, p1) => {
      const tracked = `${baseUrl}/white-label/t/click?d=${encodeURIComponent(deliveryId)}&u=${encodeURIComponent(p1)}&t=${encodeURIComponent(tenantId)}`;
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
  async getSmtp(@Req() req: any) {
    const settings = await this.wl.getSettings(req.user?.tenantId as string);
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
  async listDeliveries(@Req() req: any, @Query('take') take?: string, @Query('status') status?: string, @Query('q') q?: string) {
    return this.wl.listDeliveriesWithFilters(req.user?.tenantId as string, { take: Number(take || 50), status: status ? String(status) : undefined, q: q ? String(q) : undefined });
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
  async listToggles(@Req() req: any) {
    return this.wl.listToggles(req.user?.tenantId as string);
  }

  @Post('toggles')
  @Roles('admin')
  @ApiOperation({ summary: 'Upsert a feature toggle' })
  async upsertToggle(@Req() req: any, @Body() body: { featureKey: string; isEnabled?: boolean; configuration?: Record<string, unknown>; restrictions?: any }) {
    return this.wl.upsertToggle(req.user?.tenantId as string, body as any);
  }

  @Delete('toggles/:featureKey')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a feature toggle by key' })
  async deleteToggle(@Req() req: any, @Param('featureKey') featureKey: string) {
    return this.wl.deleteToggle(req.user?.tenantId as string, featureKey);
  }

  // Mobile
  @Get('mobile/config')
  @ApiOperation({ summary: 'Get mobile app config' })
  async getMobile(@Req() req: any) {
    return this.wl.getMobileConfig(req.user?.tenantId as string);
  }

  @Post('mobile/config')
  @Roles('admin')
  @ApiOperation({ summary: 'Upsert mobile app config' })
  async upsertMobile(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.wl.upsertMobileConfig(req.user?.tenantId as string, body as any);
  }

  // Domains
  @Get('domains')
  @ApiOperation({ summary: 'List custom domains' })
  async listDomains(@Req() req: any) {
    return this.domains.listDomains(req.user?.tenantId as string);
  }

  @Post('domains')
  @Roles('admin')
  @ApiOperation({ summary: 'Create custom domain and get verification instructions' })
  async createDomain(@Req() req: any, @Body() body: { domain: string; portalId?: string }) {
    return this.domains.createDomain(req.user?.tenantId as string, body);
  }

  @Post('domains/:id/check')
  @Roles('admin')
  @ApiOperation({ summary: 'Check DNS TXT verification status' })
  async checkDomain(@Req() req: any, @Param('id') id: string) {
    return this.domains.checkVerification(req.user?.tenantId as string, id);
  }

  @Post('domains/:id/ssl')
  @Roles('admin')
  @ApiOperation({ summary: 'Request SSL certificate (ACME placeholder)' })
  async requestSSL(@Req() req: any, @Param('id') id: string) {
    return this.domains.requestSSL(req.user?.tenantId as string, id);
  }

  @Delete('domains/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete custom domain' })
  async deleteDomain(@Req() req: any, @Param('id') id: string) {
    return this.domains.deleteDomain(req.user?.tenantId as string, id);
  }

  // Email DNS (DKIM/SPF/DMARC)
  @Get('domains/:domain/email-dns-guidance')
  @ApiOperation({ summary: 'Get SPF/DKIM/DMARC DNS records guidance for email sending' })
  async emailDnsGuidance(@Req() req: any, @Param('domain') domain: string) {
    return this.domains.getEmailDnsGuidance(req.user?.tenantId as string, domain);
  }

  @Get('domains/:domain/email-dns-validate')
  @ApiOperation({ summary: 'Validate SPF/DKIM/DMARC DNS records for the domain' })
  async emailDnsValidate(@Req() req: any, @Param('domain') domain: string) {
    return this.domains.validateEmailDns(req.user?.tenantId as string, domain);
  }
}


