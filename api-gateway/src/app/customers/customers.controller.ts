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
}