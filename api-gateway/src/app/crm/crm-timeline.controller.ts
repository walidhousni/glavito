import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrmTimelineService, TimelineFilters } from './crm-timeline.service';
import { Roles, RolesGuard } from '@glavito/shared-auth';

@Controller('crm/timeline')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CrmTimelineController {
  constructor(private readonly timelineService: CrmTimelineService) {}

  @Get()
  @Roles('admin', 'agent')
  async getTimeline(
    @Req() req: any,
    @Query('customerId') customerId?: string,
    @Query('leadId') leadId?: string,
    @Query('dealId') dealId?: string,
    @Query('types') types?: string,
    @Query('channels') channels?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const tenantId = req.user.tenantId;

    const filters: TimelineFilters & { customerId?: string; leadId?: string; dealId?: string } = {
      customerId,
      leadId,
      dealId,
      types: types ? types.split(',') : undefined,
      channels: channels ? channels.split(',') : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    };

    return this.timelineService.getTimeline(tenantId, filters);
  }
}

