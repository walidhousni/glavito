import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PipelinesService } from './pipelines.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, Roles } from '@glavito/shared-auth';

@ApiTags('CRM - Pipelines')
@Controller('crm/pipelines')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PipelinesController {
  constructor(private readonly pipelines: PipelinesService) {}

  @Get()
  @Roles('admin', 'agent')
  list(@Req() req: any) {
    return this.pipelines.list(req?.user?.tenantId);
  }

  @Post()
  @Roles('admin')
  create(@Req() req: any, @Body() dto: any) {
    return this.pipelines.create(req?.user?.tenantId, dto);
  }

  @Get(':id')
  @Roles('admin', 'agent')
  get(@Param('id') id: string, @Req() req: any) {
    return this.pipelines.get(id, req?.user?.tenantId);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: any) {
    return this.pipelines.update(id, req?.user?.tenantId, dto);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.pipelines.remove(id, req?.user?.tenantId);
  }
}


