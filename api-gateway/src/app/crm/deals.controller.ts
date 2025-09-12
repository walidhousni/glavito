import { Controller, Get, Post, Body, Query, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DealsService } from './deals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, Roles } from '@glavito/shared-auth';

@ApiTags('CRM - Deals')
@Controller('crm/deals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  @Roles('admin', 'agent')
  list(
    @Req() req: any, 
    @Query('pipelineId') pipelineId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ) {
    const options = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    };
    return this.deals.list(req?.user?.tenantId, pipelineId, options);
  }

  @Post()
  @Roles('admin', 'agent')
  create(@Req() req: any, @Body() dto: any) {
    return this.deals.create(req?.user?.tenantId, dto);
  }

  @Get(':id')
  @Roles('admin', 'agent')
  get(@Param('id') id: string, @Req() req: any) {
    return this.deals.get(id, req?.user?.tenantId);
  }

  @Patch(':id')
  @Roles('admin', 'agent')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: any) {
    return this.deals.update(id, req?.user?.tenantId, dto);
  }

  // Convenience endpoint for stage move via DnD
  @Patch(':id/stage/:stage')
  @Roles('admin', 'agent')
  moveStage(@Param('id') id: string, @Param('stage') stage: string, @Req() req: any) {
    return this.deals.update(id, req?.user?.tenantId, { stage });
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.deals.remove(id, req?.user?.tenantId);
  }
}


