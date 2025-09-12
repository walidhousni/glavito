import { Controller, Get, Post, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SegmentsService } from './segments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, Roles } from '@glavito/shared-auth';

@ApiTags('CRM Segments')
@Controller('crm/segments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SegmentsController {
  constructor(private readonly segments: SegmentsService) { }

  @Get()
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'List customer segments' })
  async list(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeMetrics') includeMetrics?: string
  ) {
    const tenantId = req.user.tenantId as string;
    const options = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      includeMetrics: includeMetrics === 'true',
    };
    const result = await this.segments.listSegments(tenantId, options);
    return { success: true, ...result };
  }

  @Get('metrics')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Get metrics for all segments' })
  async metrics(@Request() req: any) {
    const tenantId = req.user.tenantId as string;
    const metrics = await this.segments.getSegmentMetrics(tenantId);
    return { success: true, data: metrics };
  }

  @Post()
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Create customer segment' })
  async create(@Body() body: any, @Request() req: any) {
    const tenantId = req.user.tenantId as string;
    const created = await this.segments.createSegment(tenantId, body || {});
    return { success: true, data: created };
  }

  @Post(':id')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Update customer segment' })
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    const tenantId = req.user.tenantId as string;
    const updated = await this.segments.updateSegment(tenantId, id, body || {});
    return { success: true, data: updated };
  }

  @Post(':id/preview')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Preview customers matching segment criteria' })
  async preview(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.user.tenantId as string;
    const result = await this.segments.previewMembers(tenantId, id);
    return { success: true, data: result };
  }

  @Post(':id/recalculate')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Recalculate segment memberships' })
  async recalc(@Param('id') id: string, @Request() req: any) {
    const tenantId = req.user.tenantId as string;
    const result = await this.segments.recalculateMemberships(tenantId, id);
    return { success: true, data: result };
  }

  @Get(':id/export')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Export segment customers' })
  async export(@Param('id') id: string, @Query('format') format: 'json' | 'csv' = 'json', @Request() req: any) {
    const tenantId = req.user.tenantId as string;
    const data = await this.segments.exportSegment(tenantId, id, format);
    return { success: true, data };
  }

  @Post(':id/trigger-workflow/:workflowId')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Trigger workflow for all customers in a segment' })
  async triggerWorkflow(@Param('id') id: string, @Param('workflowId') workflowId: string, @Request() req: any) {
    const tenantId = req.user.tenantId as string;
    const result = await this.segments.triggerWorkflowForSegment(tenantId, id, workflowId);
    return { success: true, data: result };
  }
}


