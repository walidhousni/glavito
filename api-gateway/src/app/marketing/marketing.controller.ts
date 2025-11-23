import { Body, Controller, Get, Param, Post, Request, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UseGuards } from '@nestjs/common'
import { MarketingService } from './marketing.service'
import { FeatureToggleGuard, FeatureFlag } from '../auth/guards/feature-toggle.guard'
import { Res, Req } from '@nestjs/common'
import type { Response } from 'express'

@ApiTags('Marketing Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FeatureToggleGuard)
@Controller('marketing/campaigns')
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  @Get()
  list(@Request() req: any) {
    return this.marketing.list(req.user.tenantId)
  }

  @Get('templates')
  async listAllTemplates(@Query('type') type: string, @Request() req: any) {
    return this.marketing.listTemplates(type, req.user.tenantId);
  }

  @Post('preview')
  async previewContent(@Body() body: { content: string; vars?: Record<string, string> }, @Request() req: any) {
    return this.marketing.preview(body.content, body.vars || {}, req.user.tenantId);
  }

  @Post('reports/schedule')
  async scheduleReportEndpoint(@Body() payload: { frequency: string; email: string }, @Req() req: any) {
    return this.marketing.scheduleReport(payload, req.user.tenantId);
  }

  @Get('webhooks')
  async getWebhooksEndpoint(@Req() req: any) {
    return this.marketing.getWebhookConfigs(req.user.tenantId);
  }

  @Post('webhooks')
  async createWebhookEndpoint(@Body() payload: { url: string; events: string[]; secret?: string }, @Req() req: any) {
    return this.marketing.createWebhook(payload, req.user.tenantId);
  }

  @Get(':id')
  get(@Param('id') id: string, @Request() req: any) {
    return this.marketing.get(id, req.user.tenantId)
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.marketing.create(req.user.tenantId, body)
  }

  @Post(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.marketing.update(id, req.user.tenantId, body)
  }

  @Post(':id/launch')
  @FeatureFlag('marketing_launch')
  launch(@Param('id') id: string, @Request() req: any) {
    return this.marketing.launchNow(id, req.user.tenantId)
  }

  @Post(':id/schedule')
  schedule(@Param('id') id: string, @Body('startDate') startDate: string, @Request() req: any) {
    return this.marketing.schedule(id, req.user.tenantId, new Date(startDate))
  }

  @Post('broadcast')
  async createBroadcast(@Body() body: { name: string; description?: string; type: string; segmentId: string }, @Request() req: any) {
    return this.marketing.createBroadcast(req.user.tenantId, body);
  }

  @Post(':id/retarget')
  async retarget(@Param('id') id: string, @Body() body: { afterHours?: number; condition?: 'no_open'|'no_click' }, @Request() req: any) {
    return this.marketing.retargetCampaign(id, req.user.tenantId, body || {});
  }

  @Post(':id/checkout-link')
  async checkoutLink(
    @Param('id') id: string,
    @Body() body: { amount: number; currency: string; description?: string; customerId?: string; metadata?: Record<string, string> },
    @Request() req: any
  ) {
    return this.marketing.injectCheckoutLink(req.user.tenantId, { campaignId: id, amount: body.amount, currency: body.currency, description: body.description, customerId: body.customerId, metadata: body.metadata });
  }
  @Get(':id/variants')
  listVariants(@Param('id') id: string, @Request() req: any) {
    return this.marketing.listVariants(id, req.user.tenantId)
  }

  @Post(':id/variants')
  createVariant(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.marketing.createVariant(id, req.user.tenantId, body)
  }

  @Get(':id/performance')
  performance(@Param('id') id: string, @Request() req: any) {
    return this.marketing.getPerformance(id, req.user.tenantId)
  }

  @Get(':id/deliveries')
  deliveries(@Param('id') id: string, @Request() req: any) {
    return this.marketing.listDeliveries(id, req.user.tenantId, 20)
  }

  @Get(':id/conversions')
  async conversions(@Param('id') id: string, @Request() req: any) {
    return this.marketing.listConversions(id, req.user.tenantId);
  }

  @Get(':id/templates')
  async listTemplates(@Param('id') id: string, @Query() query: { type?: string }, @Request() req: any) {
    const type = query.type;
    const campaign = await this.marketing.get(id, req.user.tenantId);
    return this.marketing.listTemplates(type || campaign.type, req.user.tenantId);
  }

  @Post('personalize')
  async generatePersonalized(@Body() body: { campaignId: string; customerId: string; field: 'subject' | 'body' }, @Req() req: any) {
    const content = await this.marketing.getCampaignContent(body.campaignId, req.user.tenantId);
    return this.marketing.generatePersonalizedContent(body.customerId, content, body.field, req.user.tenantId);
  }

  @Get(':id/export')
  async exportCampaign(@Param('id') id: string, @Query('format') format: 'csv' | 'pdf', @Req() req: any, @Res() res: Response) {
    const data = await this.marketing.exportCampaignData(id, format, req.user.tenantId);
    if (format === 'csv') {
      const headers = ['ID','Customer','Status','SentAt'];
      const rows = data.map((d: any) => [d.id, d.customer, d.status, d.sentAt ? new Date(d.sentAt).toISOString() : '']);
      const csv = [headers.join(','), ...rows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : String(v ?? '')).join(','))].join('\n');
      res.set('Content-Type', 'text/csv');
      res.send(csv);
    } else {
      // Minimal PDF using PDFKit (stream to response)
      const PDFDocument = require('pdfkit');
      res.set('Content-Type', 'application/pdf');
      const doc = new PDFDocument({ margin: 40 });
      doc.pipe(res as any);
      doc.fontSize(16).text(`Campaign Export: ${id}`, { underline: true });
      doc.moveDown();
      doc.fontSize(10);
      data.forEach((row: any, idx: number) => {
        doc.text(`${idx + 1}. ${row.id}  ${row.customer || ''}  ${row.status}  ${row.sentAt ? new Date(row.sentAt).toLocaleString() : ''}`);
      });
      doc.end();
    }
  }

  @Get(':id/related-tickets')
  async relatedTickets(@Param('id') id: string, @Req() req: any) {
    return this.marketing.getRelatedTickets(id, req.user.tenantId)
  }
}

@ApiTags('Marketing Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FeatureToggleGuard)
@Controller('marketing/customers')
export class MarketingCustomerController {
  constructor(private readonly marketing: MarketingService) {}

  @Get(':customerId/touchpoints')
  touchpoints(@Param('customerId') customerId: string, @Request() req: any) {
    return this.marketing.listTouchpointsForCustomer(customerId, req.user.tenantId, 20)
  }
}


