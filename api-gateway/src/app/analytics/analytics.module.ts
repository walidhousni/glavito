import { Module } from '@nestjs/common';
import { BenchmarkService } from './services/benchmark.service';
import { DashboardBuilderService } from './services/dashboard-builder.service';
import { ReportBuilderService } from './services/report-builder.service';
import { BenchmarksController } from './controllers/benchmarks.controller';
import { DashboardsController } from './controllers/dashboards.controller';
import { ReportsController } from './controllers/reports.controller';
import { PrismaService } from '@glavito/shared-database';

@Module({
  providers: [
    PrismaService,
    BenchmarkService,
    DashboardBuilderService,
    ReportBuilderService,
  ],
  controllers: [BenchmarksController, DashboardsController, ReportsController],
  exports: [BenchmarkService, DashboardBuilderService, ReportBuilderService],
})
export class AnalyticsModule {}
