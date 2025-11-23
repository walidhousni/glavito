import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  DashboardBuilderService,
  CreateDashboardDto,
  UpdateDashboardDto,
} from '../services/dashboard-builder.service';
import { JwtAuthGuard } from '../../auth/guards';
import { CurrentTenant, CurrentUser, TenantGuard } from '@glavito/shared-auth';

@Controller('analytics/dashboards')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DashboardsController {
  constructor(private dashboardService: DashboardBuilderService) {}

  @Get()
  async listDashboards(@CurrentTenant() tenantId: string, @CurrentUser() userId: string) {
    return this.dashboardService.getUserDashboards(tenantId, userId);
  }

  @Get('default')
  async getDefault(@CurrentTenant() tenantId: string, @CurrentUser() userId: string) {
    return this.dashboardService.getDefaultDashboard(tenantId, userId);
  }

  @Get('by-role/:role')
  async getByRole(@CurrentTenant() tenantId: string, @Param('role') role: string) {
    return this.dashboardService.getDashboardsByRole(tenantId, role);
  }

  @Get('by-industry/:industry')
  async getByIndustry(
    @CurrentTenant() tenantId: string,
    @Param('industry') industry: string
  ) {
    return this.dashboardService.getDashboardsByIndustry(tenantId, industry);
  }

  @Get('widget-types')
  async getWidgetTypes() {
    return this.dashboardService.getAvailableWidgetTypes();
  }

  @Get(':id')
  async getDashboard(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string
  ) {
    return this.dashboardService.getDashboard(id, tenantId, userId);
  }

  @Post()
  async createDashboard(
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string,
    @Body() data: CreateDashboardDto
  ) {
    return this.dashboardService.createDashboard(tenantId, userId, data);
  }

  @Put(':id')
  async updateDashboard(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string,
    @Body() data: UpdateDashboardDto
  ) {
    return this.dashboardService.updateDashboard(id, tenantId, userId, data);
  }

  @Delete(':id')
  async deleteDashboard(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string
  ) {
    await this.dashboardService.deleteDashboard(id, tenantId, userId);
    return { success: true };
  }

  @Post(':id/duplicate')
  async duplicate(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string,
    @Body() body: { name: string }
  ) {
    return this.dashboardService.duplicateDashboard(id, tenantId, userId, body.name);
  }

  @Get(':id/widgets/:widgetId/data')
  async getWidgetData(
    @Param('id') dashboardId: string,
    @Param('widgetId') widgetId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string,
    @Query('config') config?: string
  ) {
    const dashboard = await this.dashboardService.getDashboard(
      dashboardId,
      tenantId,
      userId
    );
    const widget = (dashboard.widgets as any[]).find((w) => w.id === widgetId);
    if (!widget) {
      throw new Error('Widget not found');
    }
    return this.dashboardService.getWidgetData(tenantId, widgetId, widget);
  }
}

