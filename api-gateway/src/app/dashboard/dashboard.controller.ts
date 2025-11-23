import { Controller, Get, Put, Body, Param, Request, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Get real-time dashboard metrics
   */
  @Get('real-time')
  async getRealTimeMetrics(@Request() req: any) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.sub;
    return this.dashboardService.getRealTimeMetrics(tenantId, userId);
  }

  /**
   * Get agent-specific metrics
   */
  @Get('agent/:userId')
  async getAgentMetrics(
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    const tenantId = req.user?.tenantId;
    return this.dashboardService.getAgentMetrics(userId, tenantId);
  }

  /**
   * Get current user's dashboard configuration
   */
  @Get('config')
  async getDashboardConfig(@Request() req: any) {
    const userId = req.user?.sub;
    return this.dashboardService.getDashboardConfig(userId);
  }

  /**
   * Save dashboard configuration
   */
  @Put('config')
  async saveDashboardConfig(
    @Request() req: any,
    @Body() config: {
      layout?: Record<string, unknown>;
      widgets?: string[];
      theme?: string;
      settings?: Record<string, unknown>;
    },
  ) {
    const userId = req.user?.sub;
    return this.dashboardService.saveDashboardConfig(userId, config);
  }
}
