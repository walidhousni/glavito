import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, PermissionsGuard } from '@glavito/shared-auth';
import { Roles, Permissions } from '@glavito/shared-auth';
import { FlowService, FlowExecutionService } from '@glavito/shared-workflow';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  ExecuteWorkflowDto,
  WorkflowFiltersDto,
  BulkWorkflowActionDto,
  WorkflowExecutionFiltersDto,
  WorkflowStatsDto
} from './dto/workflow.dto';

@ApiTags('Workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class WorkflowsController {
  constructor(
    private readonly flowService: FlowService,
    private readonly flowExecutionService: FlowExecutionService
  ) {}

  @Post()
  @Roles('admin')
  @Permissions('workflows.create')
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid workflow data' })
  @ApiResponse({ status: 409, description: 'Workflow with same name already exists' })
  async create(@Body() createWorkflowDto: CreateWorkflowDto, @Req() req: any) {
    const tenantId = req.user?.tenantId;
    
    const flow = await this.flowService.createFlow({
      tenantId,
      name: createWorkflowDto.name,
      description: createWorkflowDto.description,
      nodes: (createWorkflowDto.nodes || []).map(node => ({
        key: node.id,
        kind: node.type,
        label: node.name,
        position: node.position,
        config: node.configuration,
      })),
      edges: (createWorkflowDto.connections || []).map(conn => ({
        sourceKey: conn.sourceNodeId,
        sourcePort: conn.sourceOutput,
        targetKey: conn.targetNodeId,
        targetPort: conn.targetInput,
        label: conn.id,
        condition: undefined,
      })),
    });

    return {
      success: true,
      data: flow
    };
  }

  @Get()
  @Roles('admin', 'agent')
  @Permissions('workflows.read')
  @ApiOperation({ summary: 'List workflows' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of workflows' })
  async findAll(@Query() query: WorkflowFiltersDto, @Req() req: any) {
    const tenantId = req.user?.tenantId;
    const page = parseInt(query.page?.toString() || '1', 10);
    const limit = Math.min(parseInt(query.limit?.toString() || '20', 10), 100);

    const result = await this.flowService.listFlows(
      tenantId,
      {
        status: query.status,
        search: query.search,
      },
      page,
      limit
    );

    return {
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    };
  }

  @Get('stats')
  @Roles('admin')
  @Permissions('workflows.read')
  @ApiOperation({ summary: 'Get workflow statistics' })
  @ApiResponse({ status: 200, description: 'Workflow statistics' })
  async getStats(@Req() req: any): Promise<{ success: boolean; data: WorkflowStatsDto }> {
    const tenantId = req.user?.tenantId;
    
    const stats = await this.flowService.getFlowStatistics(tenantId);

    const statsDto: WorkflowStatsDto = {
      totalWorkflows: stats.totalFlows,
      activeWorkflows: stats.publishedFlows,
      totalExecutions: stats.totalRuns,
      successfulExecutions: stats.successfulRuns,
      failedExecutions: stats.failedRuns,
      averageExecutionTime: 0, // Would need average calculation
      executionsToday: 0, // Would need date filtering
      executionsThisWeek: 0, // Would need date filtering
      executionsThisMonth: 0, // Would need date filtering
      topWorkflows: [],
      recentExecutions: stats.recentRuns || []
    };

    return {
      success: true,
      data: statsDto
    };
  }

  @Get('templates')
  @Roles('admin', 'agent')
  @Permissions('workflows.read')
  @ApiOperation({ summary: 'Get workflow templates' })
  @ApiResponse({ status: 200, description: 'List of workflow templates' })
  async getTemplates(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    const templates = await this.flowService.listFlowTemplates(tenantId);
    return { success: true, data: templates };
  }

  @Post('templates/:templateId')
  @Roles('admin')
  @Permissions('workflows.create')
  @ApiOperation({ summary: 'Create workflow from template' })
  @ApiResponse({ status: 201, description: 'Workflow created from template' })
  async createFromTemplate(
    @Param('templateId') templateId: string,
    @Body() customizations: { name?: string; description?: string },
    @Req() req: any
  ) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    const flow = await this.flowService.createFlowFromTemplate(
      templateId,
      tenantId,
      userId,
      customizations.name,
      customizations.description
    );
    
    return { success: true, data: flow };
  }

  @Get(':id')
  @Roles('admin', 'agent')
  @Permissions('workflows.read')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow found' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId;
    
    const flow = await this.flowService.getFlow(id, tenantId);
    
    if (!flow) {
      return {
        success: false,
        error: 'Workflow not found'
      };
    }

    return {
      success: true,
      data: flow
    };
  }

  @Put(':id')
  @Roles('admin')
  @Permissions('workflows.update')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async update(
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
    @Req() req: any
  ) {
    const tenantId = req.user?.tenantId;
    
    // Helper function to convert frontend node type to backend kind
    const toBackendKind = (frontendType: string): string => {
      // Map common frontend types to backend kinds
      const mapping: Record<string, string> = {
        'input': 'start',
        'output': 'end',
        'send-notification': 'send_message',
        'template-message': 'template_message',
        'send_email': 'send_email',
        'send-whatsapp': 'send_whatsapp',
        'send-instagram': 'send_instagram',
        'ticket-create': 'ticket_create',
        'ticket-update': 'ticket_update',
        'ticket-assign': 'ticket_assign',
        'ticket-close': 'ticket_close',
        'condition': 'condition',
        'delay': 'delay',
        'ai_decision': 'ai_decision',
        'ai-analysis': 'ai_analysis',
        'ai_agent': 'ai_agent',
        'ai_route': 'ai_route',
        'ai_tool_call': 'ai_tool_call',
        'ai_guardrail': 'ai_guardrail',
        'churn_risk_check': 'churn_risk_check',
        'segment_check': 'segment_check',
        'track_event': 'track_event',
        'journey_checkpoint': 'journey_checkpoint',
        'api_call': 'http_request',
        'log-event': 'log_event',
        'default': 'send_message',
      };
      
      // Check if we have a direct mapping
      if (mapping[frontendType]) {
        return mapping[frontendType];
      }
      
      // If node has backendKind stored, use it
      // Otherwise, try to infer from type
      if (frontendType.includes('ticket')) {
        if (frontendType.includes('create')) return 'ticket_create';
        if (frontendType.includes('update')) return 'ticket_update';
        if (frontendType.includes('assign')) return 'ticket_assign';
        if (frontendType.includes('close')) return 'ticket_close';
      }
      
      // Default fallback
      return frontendType.replace(/-/g, '_') || 'send_message';
    };
    
    // Convert DTO nodes to FlowService format
    const flowNodes = updateWorkflowDto.nodes?.map(node => {
      // The DTO has node.type which might be frontend type or backend kind
      // Check configuration for backendKind first, then try to convert from type
      const config = node.configuration || {};
      let backendKind = (config as any)?.backendKind;
      
      if (!backendKind) {
        // Try to convert from node.type (could be frontend type like 'ticket-create' or backend kind like 'ticket_create')
        backendKind = toBackendKind(node.type);
      }
      
      // Clean config - remove frontend-only fields
      const cleanConfig = { ...config };
      delete (cleanConfig as any).backendKind;
      delete (cleanConfig as any).label;
      delete (cleanConfig as any).type;
      delete (cleanConfig as any).status;
      delete (cleanConfig as any).outputs;
      
      return {
        key: node.id,
        kind: backendKind,
        label: node.name || node.id,
        position: node.position || { x: 0, y: 0 },
        config: cleanConfig,
      };
    });
    
    // Convert DTO connections to FlowService edges format
    const flowEdges = updateWorkflowDto.connections?.map(conn => ({
      sourceKey: conn.sourceNodeId,
      sourcePort: conn.sourceOutput || 'default',
      targetKey: conn.targetNodeId,
      targetPort: conn.targetInput || 'default',
      label: conn.id || undefined,
      condition: conn.condition || undefined,
    }));
    
    const flow = await this.flowService.updateFlow(id, {
      name: updateWorkflowDto.name,
      description: updateWorkflowDto.description,
      nodes: flowNodes,
      edges: flowEdges,
      status: updateWorkflowDto.isActive ? 'published' : 'draft',
    }, tenantId);

    return {
      success: true,
      data: flow
    };
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('workflows.delete')
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 204, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user?.tenantId;
    
    await this.flowService.deleteFlow(id, tenantId);
    
    return {
      success: true
    };
  }

  @Post(':id/execute')
  @Roles('admin', 'agent')
  @Permissions('workflows.execute')
  @ApiOperation({ summary: 'Execute workflow manually' })
  @ApiResponse({ status: 200, description: 'Workflow execution started' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async execute(
    @Param('id') id: string,
    @Body() executeWorkflowDto: ExecuteWorkflowDto,
    @Req() req: any
  ) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    
    const result = await this.flowExecutionService.executeFlow(
      id,
      executeWorkflowDto.input || {},
      {
        tenantId,
        userId,
        ...executeWorkflowDto.context
      }
    );

    return {
      success: true,
      data: result
    };
  }

  @Get(':id/executions')
  @Roles('admin', 'agent')
  @Permissions('workflows.read')
  @ApiOperation({ summary: 'Get workflow executions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of workflow executions' })
  async getExecutions(
    @Param('id') id: string,
    @Query() query: WorkflowExecutionFiltersDto,
  ) {
    const limit = Math.min(parseInt(query.limit?.toString() || '20', 10), 100);

    const runs = await this.flowExecutionService.listFlowRuns(id, limit);

    return {
      success: true,
      data: runs,
      pagination: {
        page: 1,
        limit,
        total: runs.length,
        totalPages: 1
      }
    };
  }

  @Get(':id/analytics')
  @Roles('admin')
  @Permissions('workflows.read')
  @ApiOperation({ summary: 'Get workflow analytics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Workflow analytics data' })
  async getAnalytics() {
    // Mock analytics data - would implement actual analytics
    const analytics = {
      executionCount: 0,
      successRate: 0,
      averageExecutionTime: 0,
      errorRate: 0,
      executionTrend: [],
      performanceMetrics: {
        avgCpuUsage: 0,
        avgMemoryUsage: 0,
        avgNetworkLatency: 0
      }
    };

    return {
      success: true,
      data: analytics
    };
  }

  // N8N removed: sync endpoints deleted

  @Post('bulk-action')
  @Roles('admin')
  @Permissions('workflows.update')
  @ApiOperation({ summary: 'Perform bulk action on workflows' })
  @ApiResponse({ status: 200, description: 'Bulk action completed' })
  async bulkAction(@Body() bulkActionDto: BulkWorkflowActionDto, @Req() req: any) {
    const tenantId = req.user?.tenantId;
    const results = [];

    for (const workflowId of bulkActionDto.workflowIds) {
      try {
        switch (bulkActionDto.action) {
          case 'activate':
            await this.flowService.updateFlow(workflowId, { status: 'published' }, tenantId);
            results.push({ workflowId, success: true });
            break;
          case 'deactivate':
            await this.flowService.updateFlow(workflowId, { status: 'draft' }, tenantId);
            results.push({ workflowId, success: true });
            break;
          case 'delete':
            await this.flowService.deleteFlow(workflowId, tenantId);
            results.push({ workflowId, success: true });
            break;
          case 'duplicate':
            await this.flowService.duplicateFlow(workflowId, tenantId);
            results.push({ workflowId, success: true });
            break;
          default:
            results.push({ workflowId, success: false, error: 'Unknown action' });
        }
      } catch (error) {
        results.push({ 
          workflowId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return {
      success: true,
      data: results
    };
  }
}