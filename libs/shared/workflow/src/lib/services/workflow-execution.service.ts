import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@glavito/shared-database'
import { EventPublisherService } from '@glavito/shared-kafka'
import {
  WorkflowExecution,
  WorkflowRule,
  WorkflowInput,
  ExecutionStatus,
  NodeExecution
} from '../interfaces/workflow.interface'

@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService
  ) {}

  // N8N removed: monitor is not required for internal-only execution

  async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
    _externalExecution?: unknown,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status: status,
        ...(errorMessage && { errorMessage }),
        ...( [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED, ExecutionStatus.TIMEOUT].includes(status) && { completedAt: new Date() })
      }

      // external execution mapping removed (internal-only)

      await this.prisma['workflowExecution'].update({
        where: { id: executionId },
        data: updateData as any
      })

    } catch (error) {
      this.logger.error(`Failed to update execution status ${executionId}:`, error)
      throw error
    }
  }

  async finalizeExecution(executionId: string, n8nExecution: any): Promise<void> {
    try {
      const execution = await this.prisma['workflowExecution'].findUnique({
        where: { id: executionId }
      })

      if (!execution) {
        throw new Error(`Execution not found: ${executionId}`)
      }

      // Calculate duration
      const startedAt = (execution as any).startedAt || (execution as any).createdAt
      const duration = execution.completedAt && startedAt
        ? execution.completedAt.getTime() - (startedAt as Date).getTime()
        : null

      // Extract node executions if provided (internal flows may pass inline data)
      const nodeExecutions = this.extractNodeExecutions(n8nExecution)

      // Update execution with final data
      await this.prisma['workflowExecution'].update({
        where: { id: executionId },
        data: {
          duration: duration as any,
          metadata: {
            ...(execution as any).metadata,
            nodeExecutions,
            n8nExecutionData: n8nExecution?.data
          } as any
        } as any
      })

      this.logger.log(`Execution ${executionId} finalized with status: ${execution.status}`)

    } catch (error) {
      this.logger.error(`Failed to finalize execution ${executionId}:`, error)
      throw error
    }
  }

  /**
   * Execute a workflow with the given input
   */
  async executeWorkflow(
    executionId: string,
    workflowRule: WorkflowRule,
    input: WorkflowInput
  ): Promise<WorkflowExecution> {
    try {
      this.logger.log(`Executing workflow ${workflowRule.id} with execution ${executionId}`)

      // Update execution status to running
      await this.updateExecutionStatus(executionId, ExecutionStatus.RUNNING)

      // Internal execution only
      await this.executeInternalActions(workflowRule, input)
      await this.updateExecutionStatus(executionId, ExecutionStatus.COMPLETED)
      await this.publishWorkflowExecutionEventSimple(executionId, ExecutionStatus.COMPLETED)

      // Get updated execution
      const execution = await this.prisma['workflowExecution'].findUnique({
        where: { id: executionId },
        include: { workflow: true }
      })

      return this.mapToWorkflowExecution(execution)
    } catch (error) {
      this.logger.error(`Failed to execute workflow ${workflowRule.id}:`, error)
      await this.updateExecutionStatus(executionId, ExecutionStatus.FAILED, null, error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * Execute internal workflow actions
   */
  private async executeInternalActions(workflowRule: WorkflowRule, input: WorkflowInput): Promise<void> {
    const actions = workflowRule.actions || []
    
    for (const action of actions) {
      if (!action.enabled) continue

      try {
        this.logger.debug(`Executing action: ${action.type}`)
        
        switch (action.type) {
          case 'assign_ticket':
            await this.executeAssignTicketAction(action, input)
            break
          case 'update_field':
            await this.executeUpdateFieldAction(action, input)
            break
          case 'add_tag':
            await this.executeAddTagAction(action, input)
            break
          case 'send_email':
            await this.executeSendEmailAction(action, input)
            break
          case 'create_ticket':
            await this.executeCreateTicketAction(action, input)
            break
          default:
            this.logger.warn(`Unknown action type: ${action.type}`)
        }
      } catch (error) {
        this.logger.error(`Failed to execute action ${action.type}:`, error)
        
        // Handle error based on action configuration
        if (action.onError?.action === 'stop') {
          throw error
        } else if (action.onError?.action === 'retry') {
          // Implement retry logic here if needed
          this.logger.warn(`Retry not implemented for action ${action.type}`)
        }
        // Continue with next action if action is 'continue' or not specified
      }
    }
  }

  private async executeAssignTicketAction(action: any, input: WorkflowInput): Promise<void> {
    const ticketId = action.configuration?.['ticketId'] || input.data?.['ticketId']
    const agentId = action.configuration?.agentId
    const teamId = action.configuration?.teamId

    if (!ticketId) {
      throw new Error('Ticket ID is required for assign ticket action')
    }

    if (!agentId && !teamId) {
      throw new Error('Agent ID or Team ID is required for assign ticket action')
    }

    await this.prisma['ticket'].update({
      where: { id: ticketId },
      data: {
        assignedAgentId: agentId || null,
        teamId: teamId || null,
        status: 'pending'
      } as any
    })
  }

  private async executeUpdateFieldAction(action: any, input: WorkflowInput): Promise<void> {
    const ticketId = action.configuration?.['ticketId'] || input.data?.['ticketId']
    const field = action.configuration?.['field']
    const value = action.configuration?.['value']

    if (!ticketId || !field || value === undefined) {
      throw new Error('Ticket ID, field, and value are required for update field action')
    }

    const updateData: any = {}
    updateData[field] = value

    await this.prisma['ticket'].update({
      where: { id: ticketId },
      data: updateData as any
    })
  }

  private async executeAddTagAction(action: any, input: WorkflowInput): Promise<void> {
    const ticketId = action.configuration?.['ticketId'] || input.data?.['ticketId']
    const tags = action.configuration?.['tags'] || []

    if (!ticketId || !Array.isArray(tags) || tags.length === 0) {
      throw new Error('Ticket ID and tags are required for add tag action')
    }

    const ticket = await this.prisma['ticket'].findUnique({
      where: { id: ticketId },
      select: { tags: true }
    })

    if (ticket) {
      const existingTags = ticket.tags || []
      const newTags = [...new Set([...existingTags, ...tags])]

      await this.prisma['ticket'].update({
        where: { id: ticketId },
        data: { tags: newTags } as any
      })
    }
  }

  private async executeSendEmailAction(action: any, input: WorkflowInput): Promise<void> {
    // This would integrate with your email service
    this.logger.log(`Send email action executed: ${JSON.stringify(action.configuration)}`)
  }

  private async executeCreateTicketAction(action: any, input: WorkflowInput): Promise<void> {
    const config = action.configuration
    const tenantId = (config as any)?.['tenantId'] || input.context?.['tenantId']
    const customerId = (config as any)?.['customerId'] || input.data?.['customerId']
    const channelId = (config as any)?.['channelId'] || input.data?.['channelId']

    if (!tenantId || !customerId || !channelId) {
      throw new Error('Tenant ID, Customer ID, and Channel ID are required for create ticket action')
    }

    await this.prisma['ticket'].create({
      data: {
        tenantId,
        customerId,
        channelId,
        subject: config?.subject || 'Automated ticket',
        description: config?.description || '',
        status: config?.status || 'open',
        priority: config?.priority || 'medium',
        tags: config?.tags || []
      } as any
    })
  }

  async retryExecution(executionId: string): Promise<WorkflowExecution> {
    try {
      const execution = await this.prisma['workflowExecution'].findUnique({
        where: { id: executionId }
      })

      if (!execution) {
        throw new Error(`Execution not found: ${executionId}`)
      }

      // Get workflow
      const workflow = await this.prisma['workflowRule'].findUnique({
        where: { id: (execution as any).workflowId }
      })

      if (!workflow) {
        throw new Error(`Workflow not found: ${(execution as any).workflowId}`)
      }

      // Create new execution record (internal-only)
      const retryExecution = await this.prisma['workflowExecution'].create({
        data: {
          workflowId: (execution as any).workflowId,
          triggeredBy: (execution as any).triggeredBy,
          status: 'running' as any,
          input: (execution as any).input as any,
          metadata: {
            originalExecutionId: executionId,
            retryAttempt: 1
          } as any
        } as any
      })
      // Internal re-execution is synchronous: mark completed
      await this.updateExecutionStatus((retryExecution as any).id, ExecutionStatus.COMPLETED)
      await this.publishWorkflowExecutionEventSimple((retryExecution as any).id, ExecutionStatus.COMPLETED)

      this.logger.log(`Workflow execution retried: ${executionId} -> ${(retryExecution as any).id}`)

      return this.mapToWorkflowExecution(retryExecution)

    } catch (error) {
      this.logger.error(`Failed to retry execution ${executionId}:`, error)
      throw error
    }
  }

  async cancelExecution(executionId: string): Promise<void> {
    try {
      const execution = await this.prisma['workflowExecution'].findUnique({
        where: { id: executionId }
      })

      if (!execution) {
        throw new Error(`Execution not found: ${executionId}`)
      }

      // Update execution status
      await this.updateExecutionStatus(executionId, ExecutionStatus.CANCELLED)

      this.logger.log(`Execution ${executionId} cancelled`)

    } catch (error) {
      this.logger.error(`Failed to cancel execution ${executionId}:`, error)
      throw error
    }
  }

  async getExecutionLogs(executionId: string): Promise<any[]> {
    try {
      const execution = await this.prisma['workflowExecution'].findUnique({
        where: { id: executionId }
      })

      if (!execution) {
        throw new Error(`Execution not found: ${executionId}`)
      }

      // Return empty logs for now
      return []

    } catch (error) {
      this.logger.error(`Failed to get execution logs ${executionId}:`, error)
      throw error
    }
  }

  // Timeout handling not used for internal synchronous execution.

  private extractNodeExecutions(n8nExecution: any): NodeExecution[] {
    const nodeExecutions: NodeExecution[] = []

    // For now, no-op; internal engine can supply structure when available

    return nodeExecutions
  }

  private mapToWorkflowExecution(dbExecution: any): WorkflowExecution {
    return {
      id: dbExecution.id,
      workflowId: dbExecution.workflowId,
      tenantId: (dbExecution as any).tenantId || (dbExecution as any)?.workflow?.tenantId,
      triggeredBy: dbExecution.triggeredBy,
      triggerType: (dbExecution as any)?.metadata?.triggerType || dbExecution.triggerType,
      triggerData: (dbExecution as any)?.metadata?.triggerData || dbExecution.triggerData,
      status: dbExecution.status as ExecutionStatus,
      input: dbExecution.input,
      output: dbExecution.output,
      startedAt: (dbExecution as any).startedAt || (dbExecution as any).createdAt,
      completedAt: dbExecution.completedAt,
      duration: dbExecution.completedAt 
        ? dbExecution.completedAt.getTime() - ((dbExecution as any).startedAt || (dbExecution as any).createdAt).getTime()
        : undefined,
      errorMessage: dbExecution.errorMessage,
      errorDetails: (dbExecution as any)?.metadata?.errorDetails || dbExecution.errorDetails,
      contextData: (dbExecution as any)?.metadata?.context || dbExecution.contextData,
      metadata: dbExecution.metadata || {},
      createdAt: (dbExecution as any).createdAt,
      updatedAt: (dbExecution as any).updatedAt
    }
  }

  // N8N removed: status mapping not required

  // Publish event simplified for internal execution
  private async publishWorkflowExecutionEventSimple(executionId: string, status: ExecutionStatus, errorMessage?: string): Promise<void> {
    const execution = await this.prisma['workflowExecution'].findUnique({ where: { id: executionId } })
    if (!execution) return
    await this.eventPublisher.publishWorkflowEvent({
      eventType: 'workflow.execution.completed',
      tenantId: (execution as any)['tenantId'],
      timestamp: new Date().toISOString(),
      data: {
        executionId,
        workflowId: (execution as any)['workflowId'],
        status,
        triggeredBy: execution.triggeredBy,
        triggerType: (execution as any)['triggerType'],
        duration: execution.completedAt && ((execution as any).startedAt || (execution as any).createdAt)
          ? execution.completedAt.getTime() - ((execution as any).startedAt || (execution as any).createdAt).getTime()
          : null,
        errorMessage
      }
    } as any)
  }
}