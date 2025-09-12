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
  HttpStatus,
  HttpCode,
  Logger
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '@glavito/shared-auth'
import { CurrentTenant } from '@glavito/shared-auth'
import { WorkflowService, WorkflowExecutionService, N8NSyncService } from '@glavito/shared-workflow'
import { WorkflowTemplates } from '@glavito/shared-workflow'
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  ExecuteWorkflowDto,
  WorkflowFiltersDto,
  CreateIntegrationDto
} from './dto/workflow.dto'

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workflows')
export class WorkflowsController {
  private readonly logger = new Logger(WorkflowsController.name)

  constructor(
    private readonly workflowService: WorkflowService,
    private readonly workflowExecutionService: WorkflowExecutionService,
    private readonly n8nSyncService: N8NSyncService
  ) {}

  @Post()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async createWorkflow(
    @Body() createWorkflowDto: CreateWorkflowDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any
  ) {
    try {
      // Handle both old and new workflow structures
      const workflowData = {
        name: createWorkflowDto.name,
        description: createWorkflowDto.description,
        type: createWorkflowDto.type ?? 'n8n',
        priority: createWorkflowDto.priority ?? 0,
        triggers: createWorkflowDto.triggers ?? [],
        // Support both old structure (conditions/actions) and new structure (nodes/connections)
        conditions: createWorkflowDto.conditions ?? {},
        actions: createWorkflowDto.actions ?? {},
        nodes: createWorkflowDto.nodes ?? [],
        connections: createWorkflowDto.connections ?? [],
        isActive: createWorkflowDto.isActive ?? true,
        metadata: {
          // Start with existing metadata
          ...createWorkflowDto.metadata,
          // Include new structure in metadata if provided
          ...(createWorkflowDto.nodes && { nodes: createWorkflowDto.nodes }),
          ...(createWorkflowDto.connections && { connections: createWorkflowDto.connections }),
          ...(createWorkflowDto.settings && { settings: createWorkflowDto.settings }),
          ...(createWorkflowDto.variables && { variables: createWorkflowDto.variables }),
          // Set default values for new fields
          category: createWorkflowDto.metadata?.category || 'general',
          tags: createWorkflowDto.metadata?.tags || [],
          version: createWorkflowDto.metadata?.version || '1.0',
          createdBy: createWorkflowDto.metadata?.createdBy || user?.id || 'system',
          status: createWorkflowDto.metadata?.status || (createWorkflowDto.isActive ? 'active' : 'inactive')
        }
      }

      const workflow = await this.workflowService.createWorkflow(tenantId, workflowData)
      
      return {
        success: true,
        data: workflow,
        message: 'Workflow created successfully'
      }
    } catch (error) {
      this.logger.error('Failed to create workflow:', error)
      throw error
    }
  }

  @Get()
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: 'Get all workflows' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
  async getWorkflows(
    @CurrentTenant() tenantId: string,
    @Query() filters: WorkflowFiltersDto
  ) {
    try {
      const workflows = await this.workflowService.getWorkflows(tenantId)
      
      // Apply filters if provided
      let filteredWorkflows = workflows
      
      if (filters.status) {
        if (filters.status === 'active') {
          filteredWorkflows = filteredWorkflows.filter((w: any) => !!w.isActive)
        } else if (filters.status === 'inactive') {
          filteredWorkflows = filteredWorkflows.filter((w: any) => !w.isActive)
        } else if (filters.status === 'draft') {
          filteredWorkflows = filteredWorkflows.filter((w: any) => (w.metadata as any)?.status === 'draft')
        }
      }
      
      if (filters.category) {
        filteredWorkflows = filteredWorkflows.filter((w: any) => (w.metadata as any)?.category === filters.category)
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        filteredWorkflows = filteredWorkflows.filter((w: any) => 
          (w.name || '').toLowerCase().includes(searchLower) ||
          (w.description || '').toLowerCase().includes(searchLower)
        )
      }

      return {
        success: true,
        data: filteredWorkflows,
        total: filteredWorkflows.length
      }
    } catch (error) {
      this.logger.error('Failed to get workflows:', error)
      throw error
    }
  }

  @Get('templates')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Get workflow templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getWorkflowTemplates(@CurrentTenant() tenantId: string) {
    try {
      const templates = WorkflowTemplates.getAllTemplates(tenantId)
      
      return {
        success: true,
        data: templates.map(template => ({
          // stable slug inferred from name used by frontend to create from template
          slug: (template.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          name: template.name,
          description: template.description,
          category: template.category,
          tags: template.tags,
          nodeCount: (template.nodes || []).length,
          triggerTypes: (template.triggers || []).map(t => t.type)
        }))
      }
    } catch (error) {
      this.logger.error('Failed to get workflow templates:', error)
      throw error
    }
  }

  @Post('templates/:templateName')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Create workflow from template' })
  @ApiResponse({ status: 201, description: 'Workflow created from template successfully' })
  async createFromTemplate(
    @Param('templateName') templateName: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: any,
    @Body() customizations?: any
  ) {
    try {
      const template = WorkflowTemplates.getTemplate(templateName, tenantId)
      
      if (!template) {
        return {
          success: false,
          message: 'Template not found'
        }
      }

      // Apply customizations if provided
      const merged = { ...template, ...(customizations || {}) }
      const workflowData = {
        name: merged.name,
        description: merged.description,
        type: 'n8n',
        priority: 0,
        triggers: merged.triggers ?? [],
        conditions: {},
        actions: {},
        isActive: merged.status === ('active' as any),
        nodes: merged.nodes,
        connections: merged.connections,
        metadata: {
          category: merged.category,
          tags: merged.tags,
          version: merged.version,
          createdBy: user?.id || 'system',
          status: merged.status || 'active',
          nodes: merged.nodes,
          connections: merged.connections,
          settings: merged.settings,
          variables: merged.variables
        }
      }

      const workflow = await this.workflowService.createWorkflow(tenantId, workflowData)
      
      return {
        success: true,
        data: workflow,
        message: 'Workflow created from template successfully'
      }
    } catch (error) {
      this.logger.error('Failed to create workflow from template:', error)
      throw error
    }
  }

  @Get(':id')
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: 'Get workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow retrieved successfully' })
  async getWorkflow(@Param('id') id: string) {
    try {
      const workflow = await this.workflowService.getWorkflow(id)
      
      return {
        success: true,
        data: workflow
      }
    } catch (error) {
      this.logger.error(`Failed to get workflow ${id}:`, error)
      throw error
    }
  }

  @Put(':id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  async updateWorkflow(
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
    @CurrentTenant() tenantId: string
  ) {
    try {
      const updateData = {
        name: updateWorkflowDto.name,
        description: updateWorkflowDto.description,
        type: updateWorkflowDto.type,
        priority: updateWorkflowDto.priority,
        triggers: updateWorkflowDto.triggers,
        // Support both old and new structures
        conditions: updateWorkflowDto.conditions,
        actions: updateWorkflowDto.actions,
        nodes: updateWorkflowDto.nodes,
        connections: updateWorkflowDto.connections,
        isActive: updateWorkflowDto.isActive,
        metadata: {
          ...updateWorkflowDto.metadata,
          // Include new structure in metadata if provided
          ...(updateWorkflowDto.nodes && { nodes: updateWorkflowDto.nodes }),
          ...(updateWorkflowDto.connections && { connections: updateWorkflowDto.connections }),
          ...(updateWorkflowDto.settings && { settings: updateWorkflowDto.settings }),
          ...(updateWorkflowDto.variables && { variables: updateWorkflowDto.variables })
        }
      }

      const workflow = await this.workflowService.updateWorkflow(id, updateData)
      
      return {
        success: true,
        data: workflow,
        message: 'Workflow updated successfully'
      }
    } catch (error) {
      this.logger.error(`Failed to update workflow ${id}:`, error)
      throw error
    }
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 204, description: 'Workflow deleted successfully' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWorkflow(@Param('id') id: string) {
    try {
      await this.workflowService.deleteWorkflow(id)
      
      return {
        success: true,
        message: 'Workflow deleted successfully'
      }
    } catch (error) {
      this.logger.error(`Failed to delete workflow ${id}:`, error)
      throw error
    }
  }

  @Post(':id/execute')
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: 'Execute workflow manually' })
  @ApiResponse({ status: 200, description: 'Workflow execution started' })
  async executeWorkflow(
    @Param('id') id: string,
    @Body() executeWorkflowDto: ExecuteWorkflowDto,
    @CurrentUser() user: any
  ) {
    try {
      const execution = await this.workflowService.executeWorkflow(
        id,
        { data: (executeWorkflowDto as any)?.input || {} } as any,
        user?.id || 'system'
      )
      
      return {
        success: true,
        data: execution,
        message: 'Workflow execution started'
      }
    } catch (error) {
      this.logger.error(`Failed to execute workflow ${id}:`, error)
      throw error
    }
  }

  @Get(':id/executions')
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: 'Get workflow execution history' })
  @ApiResponse({ status: 200, description: 'Execution history retrieved successfully' })
  async getWorkflowExecutions(
    @Param('id') id: string,
    @Query('limit') limit?: number
  ) {
    try {
      const executions = await this.workflowService.getWorkflowExecutionHistory(id, limit)
      
      return {
        success: true,
        data: executions,
        total: executions.length
      }
    } catch (error) {
      this.logger.error(`Failed to get executions for workflow ${id}:`, error)
      throw error
    }
  }

  @Get(':id/analytics')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Get workflow analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getWorkflowAnalytics(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    try {
      const dateRange = startDate && endDate ? {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      } : undefined

      const analytics = await this.workflowService.getWorkflowAnalytics(id, dateRange as any)
      
      return {
        success: true,
        data: analytics
      }
    } catch (error) {
      this.logger.error(`Failed to get analytics for workflow ${id}:`, error)
      throw error
    }
  }

  @Post(':id/activate')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Activate workflow' })
  @ApiResponse({ status: 200, description: 'Workflow activated successfully' })
  async activateWorkflow(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    try {
      const updatedWorkflow = await this.workflowService.updateWorkflow(id, { isActive: true })
      
      return {
        success: true,
        data: updatedWorkflow,
        message: 'Workflow activated successfully'
      }
    } catch (error) {
      this.logger.error(`Failed to activate workflow ${id}:`, error)
      throw error
    }
  }

  @Post(':id/deactivate')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Deactivate workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deactivated successfully' })
  async deactivateWorkflow(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    try {
      const updatedWorkflow = await this.workflowService.updateWorkflow(id, { isActive: false })
      
      return {
        success: true,
        data: updatedWorkflow,
        message: 'Workflow deactivated successfully'
      }
    } catch (error) {
      this.logger.error(`Failed to deactivate workflow ${id}:`, error)
      throw error
    }
  }

  // Execution Management Endpoints
  @Get('executions/:executionId')
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: 'Get execution details' })
  @ApiResponse({ status: 200, description: 'Execution details retrieved successfully' })
  async getExecution(@Param('executionId') executionId: string) {
    try {
      // This would need to be implemented in the execution service
      return {
        success: true,
        message: 'Execution details endpoint - to be implemented'
      }
    } catch (error) {
      this.logger.error(`Failed to get execution ${executionId}:`, error)
      throw error
    }
  }

  @Post('executions/:executionId/retry')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Retry failed execution' })
  @ApiResponse({ status: 200, description: 'Execution retry started' })
  async retryExecution(@Param('executionId') executionId: string) {
    try {
      const execution = await this.workflowExecutionService.retryExecution(executionId)
      
      return {
        success: true,
        data: execution,
        message: 'Execution retry started'
      }
    } catch (error) {
      this.logger.error(`Failed to retry execution ${executionId}:`, error)
      throw error
    }
  }

  @Post('executions/:executionId/cancel')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Cancel running execution' })
  @ApiResponse({ status: 200, description: 'Execution cancelled successfully' })
  async cancelExecution(@Param('executionId') executionId: string) {
    try {
      await this.workflowExecutionService.cancelExecution(executionId)
      
      return {
        success: true,
        message: 'Execution cancelled successfully'
      }
    } catch (error) {
      this.logger.error(`Failed to cancel execution ${executionId}:`, error)
      throw error
    }
  }

  @Get('executions/:executionId/logs')
  @Roles('admin', 'supervisor', 'agent')
  @ApiOperation({ summary: 'Get execution logs' })
  @ApiResponse({ status: 200, description: 'Execution logs retrieved successfully' })
  async getExecutionLogs(@Param('executionId') executionId: string) {
    try {
      const logs = await this.workflowExecutionService.getExecutionLogs(executionId)
      
      return {
        success: true,
        data: logs
      }
    } catch (error) {
      this.logger.error(`Failed to get logs for execution ${executionId}:`, error)
      throw error
    }
  }

  // Integration Management Endpoints
  @Post('integrations')
  @Roles('admin')
  @ApiOperation({ summary: 'Create integration' })
  @ApiResponse({ status: 201, description: 'Integration created successfully' })
  async createIntegration(@Body() createIntegrationDto: CreateIntegrationDto) {
    try {
      const integration = await this.workflowService.createIntegration(createIntegrationDto)
      
      return {
        success: true,
        data: integration,
        message: 'Integration created successfully'
      }
    } catch (error) {
      this.logger.error('Failed to create integration:', error)
      throw error
    }
  }

  @Post('integrations/:integrationId/test')
  @Roles('admin')
  @ApiOperation({ summary: 'Test integration' })
  @ApiResponse({ status: 200, description: 'Integration test completed' })
  async testIntegration(@Param('integrationId') integrationId: string) {
    try {
      const testResult = await this.workflowService.testIntegration(integrationId)
      
      return {
        success: true,
        data: testResult
      }
    } catch (error) {
      this.logger.error(`Failed to test integration ${integrationId}:`, error)
      throw error
    }
  }

  // N8N Sync Endpoints
  @Post(':id/sync')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Sync workflow to N8N' })
  @ApiResponse({ status: 200, description: 'Workflow synced to N8N successfully' })
  async syncWorkflowToN8N(@Param('id') id: string) {
    try {
      const n8nWorkflowId = await this.n8nSyncService.syncWorkflowToN8N(id)
      
      return {
        success: true,
        data: { n8nWorkflowId },
        message: 'Workflow synced to N8N successfully'
      }
    } catch (error) {
      this.logger.error(`Failed to sync workflow ${id} to N8N:`, error)
      throw error
    }
  }

  @Post('sync-all')
  @Roles('admin')
  @ApiOperation({ summary: 'Sync all workflows to N8N' })
  @ApiResponse({ status: 200, description: 'All workflows synced to N8N successfully' })
  async syncAllWorkflowsToN8N(@CurrentTenant() tenantId: string) {
    try {
      const workflows = await this.workflowService.getWorkflows(tenantId)
      const results = []

      for (const workflow of workflows) {
        try {
          const n8nWorkflowId = await this.n8nSyncService.syncWorkflowToN8N(workflow.id)
          results.push({ workflowId: workflow.id, n8nWorkflowId, status: 'success' })
        } catch (error) {
          results.push({ 
            workflowId: workflow.id, 
            n8nWorkflowId: null, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }
      
      return {
        success: true,
        data: results,
        message: 'Workflow sync completed'
      }
    } catch (error) {
      this.logger.error('Failed to sync all workflows to N8N:', error)
      throw error
    }
  }

  @Post('sync-from-n8n')
  @Roles('admin')
  @ApiOperation({ summary: 'Sync workflows from N8N to database' })
  @ApiResponse({ status: 200, description: 'Workflows synced from N8N successfully' })
  async syncWorkflowsFromN8N() {
    try {
      await this.n8nSyncService.syncN8NToDatabase()
      
      return {
        success: true,
        message: 'Workflows synced from N8N successfully'
      }
    } catch (error) {
      this.logger.error('Failed to sync workflows from N8N:', error)
      throw error
    }
  }
}