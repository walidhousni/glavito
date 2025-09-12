import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowService } from '@glavito/shared-workflow';
import { AIAutomationService } from '../onboarding/ai-automation.service';
import type { WorkflowAutomationRequest, WorkflowAutomationResponse, N8NTemplate } from '@glavito/shared-types';

type AuthUser = { tenantId: string; id?: string; userId?: string };

@ApiTags('onboarding/workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding/workflows')
export class OnboardingWorkflowCompatController {
  constructor(private readonly workflows: WorkflowService, private readonly aiAutomation: AIAutomationService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create workflow (compat)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Workflow created' })
  async create(
    @Request() req: { user: AuthUser },
    @Body() request: WorkflowAutomationRequest
  ): Promise<WorkflowAutomationResponse> {
    const { tenantId } = req.user;

    const created = await this.workflows.createWorkflow(tenantId, {
      name: request.name,
      description: request.description,
      type: request.workflowType || 'n8n',
      triggers: (request.workflowDefinition as any)?.triggers || {},
      actions: (request.workflowDefinition as any)?.actions || {},
      triggerConditions: (request.workflowDefinition as any)?.conditions || {},
      isActive: false,
      metadata: { templateId: request.templateId }
    });

    return {
      id: (created as any).id,
      name: (created as any).name,
      description: (created as any).description,
      workflowType: (created as any).type,
      workflowId: (created as any).id,
      isActive: (created as any).isActive,
      executionCount: 0,
      createdAt: (created as any).createdAt || new Date(),
      updatedAt: (created as any).updatedAt || new Date()
    };
  }

  @Put(':workflowId/activate')
  @ApiOperation({ summary: 'Activate workflow (compat)' })
  async activate(
    @Param('workflowId') workflowId: string
  ) {
    const updated = await this.workflows.updateWorkflow(workflowId, { isActive: true });
    return { success: true, message: 'Workflow activated', workflowId: (updated as any).id };
  }

  @Get('templates')
  @ApiOperation({ summary: 'List workflow templates (compat)' })
  async templates(@Query('category') category?: string): Promise<N8NTemplate[]> {
    return this.aiAutomation.getN8NTemplates(category);
  }
}


