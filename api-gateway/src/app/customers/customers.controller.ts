import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, NotFoundException, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomersService } from './customers.service';
import { CustomerAnalyticsService } from './customer-analytics.service';
import { CurrentTenant, Roles, Permissions, RolesGuard, PermissionsGuard } from '@glavito/shared-auth';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly customerAnalytics: CustomerAnalyticsService,
  ) {}

  @Post()
  @Roles('admin', 'agent')
  create(@Body() createCustomerDto: any, @Req() req: any) {
    const tenantId = req?.user?.tenantId;
    return this.customersService.create({ ...createCustomerDto, tenantId });
  }

  @Get()
  @Roles('admin', 'agent')
  findAll(@Req() req: any, @Query('q') q?: string) {
    return this.customersService.findAll(req?.user?.tenantId, q);
  }

  @Get(':id')
  @Roles('admin', 'agent')
  @Permissions('customers.read')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const item = await this.customersService.findOne(id, req?.user?.tenantId);
    if (!item) throw new NotFoundException('Customer not found');
    return item;
  }

  @Patch(':id')
  @Roles('admin', 'agent')
  @Permissions('customers.update')
  async update(@Param('id') id: string, @Body() updateCustomerDto: any, @Req() req: any) {
    const exists = await this.customersService.findOne(id, req?.user?.tenantId);
    if (!exists) throw new NotFoundException('Customer not found');
    return this.customersService.update(id, { ...updateCustomerDto });
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('customers.delete')
  async remove(@Param('id') id: string, @Req() req: any) {
    const exists = await this.customersService.findOne(id, req?.user?.tenantId);
    if (!exists) throw new NotFoundException('Customer not found');
    return this.customersService.remove(id);
  }

  // Data Subject Rights (DSR)
  @Get(':id/export')
  @Roles('admin')
  @Permissions('customers.read')
  async exportCustomer(@Param('id') id: string, @Req() req: any) {
    const exists = await this.customersService.findOne(id, req?.user?.tenantId);
    if (!exists) throw new NotFoundException('Customer not found');
    return this.customersService.exportDSR(id, req?.user?.tenantId);
  }

  @Delete(':id/erase')
  @Roles('admin')
  @Permissions('customers.delete')
  async eraseCustomer(@Param('id') id: string, @Req() req: any) {
    const exists = await this.customersService.findOne(id, req?.user?.tenantId);
    if (!exists) throw new NotFoundException('Customer not found');
    return this.customersService.eraseDSR(id, req?.user?.tenantId);
  }

  @Post(':id/health/rescore')
  @Roles('admin', 'agent')
  async rescoreHealth(@Param('id') id: string, @Req() req: any) {
    return this.customersService.rescoreHealth(id, req?.user?.tenantId);
  }

  // Analytics endpoints
  @Get(':id/analytics/health')
  @Roles('admin', 'agent')
  @Permissions('customers.read')
  getHealth(@Param('id') id: string, @CurrentTenant() tenantId: string): any {
    return this.customerAnalytics.calculateHealthScore(id, tenantId);
  }

  @Get(':id/analytics/lifetime-value')
  @Roles('admin', 'agent')
  @Permissions('customers.read')
  getLifetimeValue(@Param('id') id: string, @CurrentTenant() tenantId: string): any {
    return this.customerAnalytics.calculateLifetimeValue(id, tenantId);
  }

  @Get(':id/analytics/journey')
  @Roles('admin', 'agent')
  @Permissions('customers.read')
  getJourney(@Param('id') id: string, @CurrentTenant() tenantId: string): any {
    return this.customerAnalytics.getCustomerJourney(id, tenantId);
  }

  @Get(':id/analytics/segments')
  @Roles('admin', 'agent')
  @Permissions('customers.read')
  getSegments(@Param('id') id: string, @CurrentTenant() tenantId: string): any {
    return this.customerAnalytics.getCustomerSegments(id, tenantId);
  }

  @Get(':id/analytics/360')
  @Roles('admin', 'agent')
  @Permissions('customers.read')
  getCustomer360(@Param('id') id: string, @CurrentTenant() tenantId: string): any {
    return this.customerAnalytics.getCustomer360Profile(id, tenantId);
  }

  @Get(':id/analytics/insights')
  @Roles('admin', 'agent')
  @Permissions('customers.read')
  getInsights(@Param('id') id: string, @CurrentTenant() tenantId: string): any {
    return this.customerAnalytics.getCustomerInsights(id, tenantId);
  }

  // --- Preferences & Consent ---
  @Get(':id/preferences')
  @Roles('admin', 'agent')
  @Permissions('customers.read')
  async getPreferences(@Param('id') id: string, @Req() req: any) {
    return this.customersService.getPreferences(id, req?.user?.tenantId);
  }

  @Post(':id/preferences')
  @Roles('admin', 'agent')
  @Permissions('customers.update')
  async updatePreferences(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { marketingPreferences?: { whatsappOptOut?: boolean; emailOptOut?: boolean; smsOptOut?: boolean }; quietHours?: { start?: string; end?: string; timezone?: string }; language?: string }
  ) {
    return this.customersService.updatePreferences(id, req?.user?.tenantId, body || {});
  }

  @Get(':id/consent/logs')
  @Roles('admin', 'agent')
  @Permissions('customers.read')
  async getConsentLogs(@Param('id') id: string, @Req() req: any) {
    return this.customersService.listConsentLogs(id, req?.user?.tenantId);
  }

  @Post(':id/consent')
  @Roles('admin', 'agent')
  @Permissions('customers.update')
  async appendConsent(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { channel?: 'whatsapp'|'email'|'sms'|'web'; consent: boolean; reason?: string }
  ) {
    return this.customersService.appendConsent(id, req?.user?.tenantId, body);
  }

  // Recent orders (for 360 UI enrichment)
  @Get(':id/orders/recent')
  @Roles('admin', 'agent')
  @Permissions('customers.read')
  getRecentOrders(@Param('id') id: string, @CurrentTenant() tenantId: string, @Query('limit') limit?: number) {
    return this.customersService.getRecentOrders(id, tenantId, Number(limit) || 10)
  }

  @Post(':id/orders')
  @Roles('admin', 'agent')
  @Permissions('customers.update')
  createOrder(@Param('id') id: string, @CurrentTenant() tenantId: string, @Body() body: { items: Array<{ sku: string; quantity: number; unitPrice: number; currency?: string }>; notes?: string }) {
    return this.customersService.createOrderForCustomer(id, tenantId, body)
  }

  // --- Activities feed (360) ---
  @Get(':id/activities')
  @Roles('admin', 'agent')
  @Permissions('customers.read')
  async getActivities(
    @Param('id') id: string,
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('since') since?: string,
    @Query('types') types?: string | string[]
  ) {
    const parsedTypes = Array.isArray(types)
      ? types
      : (typeof types === 'string' && types.length ? types.split(',') : undefined);
    return this.customersService.getActivitiesForCustomer(id, req?.user?.tenantId, {
      limit: Number(limit) || 50,
      since,
      types: parsedTypes as any
    });
  }

  // --- Marketing Preferences (Opt-in/Opt-out WhatsApp) ---
  @Post(':id/preferences/whatsapp/opt-out')
  @Roles('admin', 'agent')
  async whatsappOptOut(@Param('id') id: string, @Req() req: any) {
    const exists = await this.customersService.findOne(id, req?.user?.tenantId);
    if (!exists) throw new NotFoundException('Customer not found');
    const cf = ((exists as any).customFields || {}) as Record<string, any>
    const marketing = { ...(cf.marketingPreferences || {}), whatsappOptOut: true }
    return this.customersService.update(id, { customFields: { ...cf, marketingPreferences: marketing } })
  }

  @Post(':id/preferences/whatsapp/opt-in')
  @Roles('admin', 'agent')
  async whatsappOptIn(@Param('id') id: string, @Req() req: any) {
    const exists = await this.customersService.findOne(id, req?.user?.tenantId);
    if (!exists) throw new NotFoundException('Customer not found');
    const cf = ((exists as any).customFields || {}) as Record<string, any>
    const mp = { ...(cf.marketingPreferences || {}), whatsappOptOut: false }
    return this.customersService.update(id, { customFields: { ...cf, marketingPreferences: mp } })
  }
}