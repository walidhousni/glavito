import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UseGuards } from '@nestjs/common'
import { MarketingService } from './marketing.service'
import { FeatureToggleGuard, FeatureFlag } from '../auth/guards/feature-toggle.guard'

@ApiTags('Marketing Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FeatureToggleGuard)
@Controller('marketing/campaigns')
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  @Get()
  list(@Request() req: any) {
    return this.marketing.list(req.user.tenantId)
  }

  @Get(':id')
  get(@Param('id') id: string, @Request() req: any) {
    return this.marketing.get(id, req.user.tenantId)
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.marketing.create(req.user.tenantId, body)
  }

  @Post(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.marketing.update(id, req.user.tenantId, body)
  }

  @Post(':id/launch')
  @FeatureFlag('marketing_launch')
  launch(@Param('id') id: string, @Request() req: any) {
    return this.marketing.launchNow(id, req.user.tenantId)
  }

  @Post(':id/schedule')
  schedule(@Param('id') id: string, @Body('startDate') startDate: string, @Request() req: any) {
    return this.marketing.schedule(id, req.user.tenantId, new Date(startDate))
  }

  @Get(':id/variants')
  listVariants(@Param('id') id: string, @Request() req: any) {
    return this.marketing.listVariants(id, req.user.tenantId)
  }

  @Post(':id/variants')
  createVariant(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.marketing.createVariant(id, req.user.tenantId, body)
  }

  @Get(':id/performance')
  performance(@Param('id') id: string, @Request() req: any) {
    return this.marketing.getPerformance(id, req.user.tenantId)
  }
}


