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
import { TenantGuard } from '@glavito/shared-auth';
import { CurrentTenant } from '@glavito/shared-auth';
import { CurrentUser } from '@glavito/shared-auth';
import { JwtAuthGuard } from '../../auth/guards';
import {
  ReportBuilderService,
  CreateReportDto,
  UpdateReportDto,
  CreateScheduleDto,
  UpdateScheduleDto,
} from '../services/report-builder.service';

@Controller('analytics/reports')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ReportsController {
  constructor(private reportService: ReportBuilderService) {}

  @Get()
  async listReports(
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string,
    @Query('category') category?: string,
    @Query('industry') industry?: string,
    @Query('createdBy') createdBy?: string,
    @Query('isFavorite') isFavorite?: string
  ) {
    return this.reportService.listReports(tenantId, userId, {
      category,
      industry,
      createdBy,
      isFavorite: isFavorite === 'true',
    });
  }

  @Get('categories')
  async getCategories() {
    return this.reportService.getAvailableCategories();
  }

  @Get('metrics/:category')
  async getMetrics(@Param('category') category: string) {
    return this.reportService.getAvailableMetrics(category);
  }

  @Get(':id')
  async getReport(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string
  ) {
    return this.reportService.getReport(id, tenantId, userId);
  }

  @Post()
  async createReport(
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string,
    @Body() data: CreateReportDto
  ) {
    return this.reportService.createReport(tenantId, userId, data);
  }

  @Put(':id')
  async updateReport(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string,
    @Body() data: UpdateReportDto
  ) {
    return this.reportService.updateReport(id, tenantId, userId, data);
  }

  @Delete(':id')
  async deleteReport(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string
  ) {
    await this.reportService.deleteReport(id, tenantId, userId);
    return { success: true };
  }

  @Post(':id/generate')
  async generateReport(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string
  ) {
    return this.reportService.generateReport(id, tenantId, userId);
  }

  // Schedules
  @Get(':id/schedules')
  async getSchedules(
    @Param('id') reportId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string
  ) {
    return this.reportService.getReportSchedules(reportId, tenantId, userId);
  }

  @Post(':id/schedules')
  async createSchedule(
    @Param('id') reportId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string,
    @Body() data: Omit<CreateScheduleDto, 'reportId'>
  ) {
    return this.reportService.createSchedule(tenantId, userId, {
      ...data,
      reportId,
    });
  }

  @Put('schedules/:scheduleId')
  async updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string,
    @Body() data: UpdateScheduleDto
  ) {
    return this.reportService.updateSchedule(scheduleId, tenantId, userId, data);
  }

  @Delete('schedules/:scheduleId')
  async deleteSchedule(
    @Param('scheduleId') scheduleId: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string
  ) {
    await this.reportService.deleteSchedule(scheduleId, tenantId, userId);
    return { success: true };
  }
}

