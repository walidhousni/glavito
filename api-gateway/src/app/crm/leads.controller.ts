import { Controller, Get, Post, Body, Query, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, Roles, Permissions } from '@glavito/shared-auth';

@ApiTags('CRM - Leads')
@Controller('crm/leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @Roles('admin', 'agent')
  list(
    @Req() req: any, 
    @Query('q') q?: string, 
    @Query('status') status?: string,
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
    return this.leads.list(req?.user?.tenantId, q, status, options);
  }

  @Post()
  @Roles('admin', 'agent')
  @Permissions('crm.leads.create')
  create(@Req() req: any, @Body() dto: any) {
    return this.leads.create(req?.user?.tenantId, dto);
  }

  @Get(':id')
  @Roles('admin', 'agent')
  get(@Param('id') id: string, @Req() req: any) {
    return this.leads.get(id, req?.user?.tenantId);
  }

  @Patch(':id')
  @Roles('admin', 'agent')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: any) {
    return this.leads.update(id, req?.user?.tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.leads.remove(id, req?.user?.tenantId);
  }

  @Post(':id/score')
  @Roles('admin', 'agent')
  rescore(@Param('id') id: string, @Req() req: any) {
    return this.leads.rescore(id, req?.user?.tenantId);
  }
}


