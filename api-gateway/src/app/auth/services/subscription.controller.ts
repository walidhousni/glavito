import { Controller, Get, Post, Put, Delete, Body, Request, UseGuards, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { SubscriptionService } from './subscription.service'

@ApiTags('subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subs: SubscriptionService) {}

  @Get('plans')
  @ApiOperation({ summary: 'List available plans' })
  @ApiResponse({ status: HttpStatus.OK })
  async plans() {
    return this.subs.getAvailablePlans()
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current tenant subscription' })
  @ApiResponse({ status: HttpStatus.OK })
  async current(@Request() req: any) {
    return this.subs.getTenantSubscription(req.user.tenantId)
  }

  @Post()
  @ApiOperation({ summary: 'Create subscription for tenant' })
  @ApiResponse({ status: HttpStatus.CREATED })
  async create(@Request() req: any, @Body() body: { planId: string; billingCycle?: 'monthly' | 'yearly' }) {
    return this.subs.createSubscription(req.user.tenantId, body.planId, body.billingCycle || 'monthly')
  }

  @Put()
  @ApiOperation({ summary: 'Update subscription plan/cycle' })
  @ApiResponse({ status: HttpStatus.OK })
  async update(@Request() req: any, @Body() body: { planId: string; billingCycle?: 'monthly' | 'yearly' }) {
    return this.subs.updateSubscription(req.user.tenantId, body.planId, body.billingCycle)
  }

  @Delete()
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: HttpStatus.OK })
  async cancel(@Request() req: any) {
    return this.subs.cancelSubscription(req.user.tenantId)
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get usage report' })
  @ApiResponse({ status: HttpStatus.OK })
  async usage(@Request() req: any) {
    return this.subs.getUsageReport(req.user.tenantId)
  }
}


