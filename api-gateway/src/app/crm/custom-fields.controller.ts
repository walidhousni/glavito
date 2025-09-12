import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, Roles, Permissions } from '@glavito/shared-auth';
import { CustomFieldsService } from './custom-fields.service';

@ApiTags('CRM - Custom Fields & Objects')
@Controller('crm/custom')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CustomFieldsController {
  constructor(private readonly svc: CustomFieldsService) {}

  // ----- Field Definitions -----
  @Get('fields')
  @Roles('admin')
  @Permissions('crm.custom_fields.read')
  listDefinitions(@Req() req: any, @Query('entity') entity?: string) {
    return this.svc.listDefinitions(req?.user?.tenantId, entity);
  }

  @Post('fields')
  @Roles('admin')
  @Permissions('crm.custom_fields.create')
  createDefinition(@Req() req: any, @Body() dto: any) {
    return this.svc.createDefinition(req?.user?.tenantId, dto);
  }

  @Patch('fields/:id')
  @Roles('admin')
  @Permissions('crm.custom_fields.update')
  updateDefinition(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.updateDefinition(req?.user?.tenantId, id, dto);
  }

  @Delete('fields/:id')
  @Roles('admin')
  @Permissions('crm.custom_fields.delete')
  deleteDefinition(@Req() req: any, @Param('id') id: string) {
    return this.svc.deleteDefinition(req?.user?.tenantId, id);
  }

  // ----- Object Types -----
  @Get('object-types')
  @Roles('admin')
  @Permissions('crm.custom_objects.read')
  listObjectTypes(@Req() req: any) {
    return this.svc.listObjectTypes(req?.user?.tenantId);
  }

  @Post('object-types')
  @Roles('admin')
  @Permissions('crm.custom_objects.create')
  createObjectType(@Req() req: any, @Body() dto: any) {
    return this.svc.createObjectType(req?.user?.tenantId, dto);
  }

  @Patch('object-types/:id')
  @Roles('admin')
  @Permissions('crm.custom_objects.update')
  updateObjectType(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.updateObjectType(req?.user?.tenantId, id, dto);
  }

  @Delete('object-types/:id')
  @Roles('admin')
  @Permissions('crm.custom_objects.delete')
  deleteObjectType(@Req() req: any, @Param('id') id: string) {
    return this.svc.deleteObjectType(req?.user?.tenantId, id);
  }

  // ----- Object Records -----
  @Get('object-types/:typeId/records')
  @Roles('admin', 'agent')
  @Permissions('crm.custom_objects.read')
  listObjectRecords(@Req() req: any, @Param('typeId') typeId: string) {
    return this.svc.listObjectRecords(req?.user?.tenantId, typeId);
  }

  @Post('object-types/:typeId/records')
  @Roles('admin', 'agent')
  @Permissions('crm.custom_objects.create')
  createObjectRecord(@Req() req: any, @Param('typeId') typeId: string, @Body() dto: any) {
    return this.svc.createObjectRecord(req?.user?.tenantId, typeId, dto?.values ?? {}, dto?.references ?? {});
  }

  @Patch('records/:id')
  @Roles('admin', 'agent')
  @Permissions('crm.custom_objects.update')
  updateObjectRecord(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.updateObjectRecord(req?.user?.tenantId, id, dto ?? {});
  }

  @Delete('records/:id')
  @Roles('admin')
  @Permissions('crm.custom_objects.delete')
  deleteObjectRecord(@Req() req: any, @Param('id') id: string) {
    return this.svc.deleteObjectRecord(req?.user?.tenantId, id);
  }
}


