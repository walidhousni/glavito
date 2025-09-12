import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '@glavito/shared-auth';
import { CustomFieldsService, CreateCustomFieldDto, UpdateCustomFieldDto } from './custom-fields.service';

@ApiTags('Custom Fields')
@Controller('custom-fields')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomFieldsController {
  constructor(private readonly service: CustomFieldsService) {}

  @Get()
  @ApiOperation({ summary: 'List custom field definitions' })
  async list(@CurrentTenant() tenantId: string, @Query('entity') entity?: 'ticket' | 'customer') {
    return this.service.list(tenantId, entity);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get custom field definition by ID' })
  async get(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.get(tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create custom field definition' })
  async create(@CurrentTenant() tenantId: string, @Body() body: CreateCustomFieldDto) {
    return this.service.create(tenantId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update custom field definition' })
  async update(@CurrentTenant() tenantId: string, @Param('id') id: string, @Body() body: UpdateCustomFieldDto) {
    return this.service.update(tenantId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete custom field definition' })
  async remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}


