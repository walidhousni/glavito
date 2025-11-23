import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { TenantGuard } from '@glavito/shared-auth';
import { CurrentTenant } from '@glavito/shared-auth';
import { CurrentUser } from '@glavito/shared-auth';
import { JwtAuthGuard } from '../../auth/guards';
import { BenchmarkService, CreateBenchmarkDto } from '../services/benchmark.service';

@Controller('analytics/benchmarks')
@UseGuards(JwtAuthGuard, TenantGuard)
export class BenchmarksController {
  constructor(private benchmarkService: BenchmarkService) {}

  @Get('industries')
  async getIndustries() {
    return this.benchmarkService.getAvailableIndustries();
  }

  @Get('metrics/:industry')
  async getMetrics(@Param('industry') industry: string) {
    return this.benchmarkService.getAvailableMetrics(industry);
  }

  @Get(':industry/:metric')
  async getBenchmark(
    @Param('industry') industry: string,
    @Param('metric') metric: string,
    @Query('period') period?: string
  ) {
    return this.benchmarkService.getIndustryBenchmark(industry, metric, period);
  }

  @Get(':industry')
  async getAllBenchmarks(
    @Param('industry') industry: string,
    @Query('period') period?: string,
    @Query('limit') limit?: string
  ) {
    return this.benchmarkService.getIndustryBenchmarks(
      industry,
      period,
      limit ? parseInt(limit, 10) : 50
    );
  }

  @Get(':industry/:metric/trends')
  async getTrends(
    @Param('industry') industry: string,
    @Param('metric') metric: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('period') period?: string
  ) {
    return this.benchmarkService.getBenchmarkTrends(
      industry,
      metric,
      new Date(startDate),
      new Date(endDate),
      period
    );
  }

  @Post('compare')
  async compareTenant(
    @CurrentTenant() tenantId: string,
    @Body() body: { metric: string; value: number; period?: string }
  ) {
    return this.benchmarkService.compareTenantToIndustry(
      tenantId,
      body.metric,
      body.value,
      body.period
    );
  }

  @Post('snapshots')
  async createSnapshot(
    @CurrentTenant() tenantId: string,
    @Body()
    body: {
      snapshotDate: string;
      snapshotType: 'daily' | 'weekly' | 'monthly';
      metrics: Record<string, unknown>;
    }
  ) {
    await this.benchmarkService.createAnalyticsSnapshot(
      tenantId,
      new Date(body.snapshotDate),
      body.snapshotType,
      body.metrics
    );
    return { success: true };
  }

  @Get('snapshots')
  async getSnapshots(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('type') type: 'daily' | 'weekly' | 'monthly'
  ) {
    return this.benchmarkService.getTenantSnapshots(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      type
    );
  }

  // Admin only
  @Post('admin/upsert')
  async upsertBenchmark(@Body() data: CreateBenchmarkDto) {
    return this.benchmarkService.upsertBenchmark(data);
  }

  @Post('admin/bulk-import')
  async bulkImport(@Body() benchmarks: CreateBenchmarkDto[]) {
    const imported = await this.benchmarkService.bulkImportBenchmarks(benchmarks);
    return { imported, total: benchmarks.length };
  }
}

