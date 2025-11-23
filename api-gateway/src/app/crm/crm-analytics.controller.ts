import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, Roles } from '@glavito/shared-auth';
import { CrmAnalyticsService } from './crm-analytics.service';

@ApiTags('CRM - Analytics')
@Controller('crm/analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CrmAnalyticsController {
  constructor(private readonly analytics: CrmAnalyticsService) {}

  @Get('pipeline')
  @Roles('admin', 'agent')
  getPipeline(@Req() req: any) {
    const tenantId = req?.user?.tenantId as string;
    return this.analytics.getPipelineMetrics(tenantId);
  }

  @Get('forecast')
  @Roles('admin', 'agent')
  getForecast(@Req() req: any, @Query('days') days?: string) {
    const tenantId = req?.user?.tenantId as string;
    const periodDays = Math.max(1, Math.min(90, Number(days || 30)));
    return this.analytics.getSalesForecast(tenantId, periodDays);
  }

  @Get('funnel')
  @Roles('admin', 'agent')
  getFunnel(@Req() req: any, @Query('pipelineId') pipelineId?: string) {
    const tenantId = req?.user?.tenantId as string;
    return this.analytics.getPipelineFunnel(tenantId, pipelineId);
  }

  @Get('rep-performance')
  @Roles('admin', 'agent')
  getRepPerformance(@Req() req: any, @Query('timeframe') timeframe?: string) {
    const tenantId = req?.user?.tenantId as string;
    const validTimeframe = ['week', 'month', 'quarter'].includes(timeframe || '')
      ? (timeframe as 'week' | 'month' | 'quarter')
      : 'month';
    return this.analytics.getRepPerformance(tenantId, validTimeframe);
  }
}


