import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, Roles } from '@glavito/shared-auth';
import { CrmPerformanceService } from './crm-performance.service';

@ApiTags('CRM - Performance')
@Controller('crm/performance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CrmPerformanceController {
  constructor(private readonly performance: CrmPerformanceService) {}

  @Get('summary')
  @Roles('admin')
  @ApiOperation({ summary: 'Get CRM performance summary' })
  @ApiResponse({ status: 200, description: 'Performance summary retrieved successfully' })
  getPerformanceSummary(
    @Query('timeWindow') timeWindow?: string,
    @Req() req: any
  ) {
    const timeWindowMinutes = timeWindow ? parseInt(timeWindow, 10) : 60;
    return this.performance.getPerformanceSummary(timeWindowMinutes);
  }

  @Get('slow-queries')
  @Roles('admin')
  @ApiOperation({ summary: 'Get slow queries report' })
  @ApiResponse({ status: 200, description: 'Slow queries retrieved successfully' })
  getSlowQueries(
    @Query('threshold') threshold?: string,
    @Query('limit') limit?: string,
    @Req() req: any
  ) {
    const thresholdMs = threshold ? parseInt(threshold, 10) : 1000;
    const limitCount = limit ? parseInt(limit, 10) : 10;
    return this.performance.getSlowQueries(thresholdMs, limitCount);
  }

  @Get('cache-performance')
  @Roles('admin')
  @ApiOperation({ summary: 'Get cache performance metrics' })
  @ApiResponse({ status: 200, description: 'Cache performance retrieved successfully' })
  getCachePerformance(@Req() req: any) {
    return this.performance.getCachePerformance();
  }

  @Get('optimization-suggestions')
  @Roles('admin')
  @ApiOperation({ summary: 'Get database optimization suggestions' })
  @ApiResponse({ status: 200, description: 'Optimization suggestions retrieved successfully' })
  getOptimizationSuggestions(@Req() req: any) {
    return this.performance.optimizeQueries();
  }

  @Get('health')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Get CRM performance health check' })
  @ApiResponse({ status: 200, description: 'Performance health check completed' })
  getHealthCheck(@Req() req: any) {
    return this.performance.healthCheck();
  }
}
