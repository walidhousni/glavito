import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  NotFoundException,
  Inject,
  Optional,
  Req
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomerAnalyticsService } from './customer-analytics.service';

@ApiTags('Customer 360')
@Controller('customers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class Customer360Controller {
  constructor(
    private readonly customerAnalyticsService: CustomerAnalyticsService,
    @Optional() @Inject('EVENT_PUBLISHER') private readonly eventPublisher?: { emit?: (event: string, payload: Record<string, unknown>) => void }
  ) {}

  @Get(':id/360-profile')
  @ApiOperation({ summary: 'Get comprehensive Customer 360 profile' })
  @ApiResponse({ status: 200, description: 'Customer 360 profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getCustomer360Profile(
    @Param('id') customerId: string,
    @Req() req: { user: { tenantId: string; sub: string } }
  ): Promise<unknown> {
    try {
      const profile = await this.customerAnalyticsService.getCustomer360Profile(
        customerId,
        req.user.tenantId
      );

      // Publish analytics event
      if (this.eventPublisher && typeof this.eventPublisher.emit === 'function') {
        this.eventPublisher.emit('customer.profile_viewed', {
          customerId,
          tenantId: req.user.tenantId,
          viewedBy: req.user.sub,
          timestamp: new Date().toISOString()
        });
      }

      return profile;
    } catch (error: unknown) {
      if ((error as { message?: string })?.message === 'Customer not found') {
        throw new NotFoundException('Customer not found');
      }
      throw error;
    }
  }

  @Get(':id/health-score')
  @ApiOperation({ summary: 'Get customer health score and risk assessment' })
  @ApiResponse({ status: 200, description: 'Health score calculated successfully' })
  async getCustomerHealthScore(
    @Param('id') customerId: string,
    @Req() req: { user: { tenantId: string } }
  ): Promise<unknown> {
    const healthScore = await this.customerAnalyticsService.calculateHealthScore(
      customerId,
      req.user.tenantId
    );

    return healthScore;
  }

  @Get(':id/lifetime-value')
  @ApiOperation({ summary: 'Get customer lifetime value analysis' })
  @ApiResponse({ status: 200, description: 'Lifetime value calculated successfully' })
  async getCustomerLifetimeValue(
    @Param('id') customerId: string,
    @Req() req: { user: { tenantId: string } }
  ): Promise<unknown> {
    const lifetimeValue = await this.customerAnalyticsService.calculateLifetimeValue(
      customerId,
      req.user.tenantId
    );

    return lifetimeValue;
  }

  @Get(':id/journey')
  @ApiOperation({ summary: 'Get customer journey and touchpoint analysis' })
  @ApiResponse({ status: 200, description: 'Customer journey retrieved successfully' })
  async getCustomerJourney(
    @Param('id') customerId: string,
    @Req() req: { user: { tenantId: string } }
  ): Promise<unknown> {
    const journey = await this.customerAnalyticsService.getCustomerJourney(
      customerId,
      req.user.tenantId
    );

    return journey;
  }

  @Get(':id/segments')
  @ApiOperation({ summary: 'Get customer segments and classifications' })
  @ApiResponse({ status: 200, description: 'Customer segments retrieved successfully' })
  async getCustomerSegments(
    @Param('id') customerId: string,
    @Req() req: { user: { tenantId: string } }
  ): Promise<unknown> {
    const segments = await this.customerAnalyticsService.getCustomerSegments(
      customerId,
      req.user.tenantId
    );

    return segments;
  }

  @Get(':id/relationships')
  @ApiOperation({ summary: 'Get customer relationships and account hierarchy' })
  @ApiResponse({ status: 200, description: 'Customer relationships retrieved successfully' })
  async getCustomerRelationships(
    @Param('id') customerId: string,
    @Req() req: { user: { tenantId: string } }
  ): Promise<unknown> {
    const relationships = await this.customerAnalyticsService.getCustomerRelationships(
      customerId,
      req.user.tenantId
    );

    return relationships;
  }

  @Get('segments/overview')
  @ApiOperation({ summary: 'Get overview of all customer segments' })
  @ApiResponse({ status: 200, description: 'Segments overview retrieved successfully' })
  async getSegmentsOverview(
    @Req() req: { user: { tenantId: string } }
  ) {
    return this.customerAnalyticsService.getSegmentsOverview(req.user.tenantId);
  }

  @Get('analytics/dashboard')
  @ApiOperation({ summary: 'Get customer analytics dashboard data' })
  @ApiResponse({ status: 200, description: 'Analytics dashboard data retrieved successfully' })
  async getAnalyticsDashboard(
    @Req() req: { user: { tenantId: string } }
  ) {
    return this.customerAnalyticsService.getAnalyticsDashboard(req.user.tenantId);
  }

  @Post(':id/update-health-score')
  @ApiOperation({ summary: 'Manually trigger health score recalculation' })
  @ApiResponse({ status: 200, description: 'Health score updated successfully' })
  async updateHealthScore(
    @Param('id') customerId: string,
    @Req() req: { user: { tenantId: string; sub: string } }
  ): Promise<unknown> {
    const healthScore = await this.customerAnalyticsService.calculateHealthScore(
      customerId,
      req.user.tenantId
    );

    // Publish health score update event
    if (this.eventPublisher && typeof this.eventPublisher.emit === 'function') {
      this.eventPublisher.emit('customer.health_score_updated', {
        customerId,
        tenantId: req.user.tenantId,
        healthScore: healthScore.score,
        riskLevel: healthScore.riskLevel,
        updatedBy: req.user.sub,
        timestamp: new Date().toISOString()
      });
    }

    return healthScore;
  }

  @Get('behavioral-analytics')
  @ApiOperation({ summary: 'Get behavioral analytics insights' })
  @ApiResponse({ status: 200, description: 'Behavioral analytics retrieved successfully' })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['7d', '30d', '90d', '1y'] })
  @ApiQuery({ name: 'segment', required: false, type: String })
  async getBehavioralAnalytics(
    @Req() req: { user: { tenantId: string } },
  ) {
    // Swagger decorators are declared above on the method
    const timeframe = undefined as unknown as '7d' | '30d' | '90d' | '1y' | undefined;
    const segment = undefined as unknown as string | undefined;
    return this.customerAnalyticsService.getBehavioralAnalytics(req.user.tenantId, timeframe as any, segment);
  }

  @Get('predictive-insights')
  @ApiOperation({ summary: 'Get predictive analytics and forecasts' })
  @ApiResponse({ status: 200, description: 'Predictive insights retrieved successfully' })
  async getPredictiveInsights(
    @Req() req: { user: { tenantId: string } }
  ) {
    return this.customerAnalyticsService.getPredictiveInsights(req.user.tenantId);
  }

  @Get(':id/analytics/insights')
  @ApiOperation({ summary: 'Get AI/customer insights for a customer' })
  @ApiResponse({ status: 200, description: 'Insights retrieved successfully' })
  async getCustomerInsights(
    @Param('id') customerId: string,
    @Req() req: { user: { tenantId: string } }
  ) {
    return this.customerAnalyticsService.getCustomerInsights(customerId, req.user.tenantId);
  }
}