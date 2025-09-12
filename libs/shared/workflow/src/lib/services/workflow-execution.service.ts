import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@glavito/shared-database'
import { EventPublisherService } from '@glavito/shared-kafka'
import { N8NClient } from '../clients/n8n.client'
import {
  WorkflowExecution,
  ExecutionStatus,
  NodeExecution
} from '../interfaces/workflow.interface'

@Injectable()
export class WorkflowExecutionService {
  private readonly logger = new Logger(WorkflowExecutionService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService,
    private readonly n8nClient: N8NClient
  ) {}

  async monitorExecution(executionId: string, n8nExecutionId: string): Promise<void> {
    try {
      this.logger.log(`Starting execution monitoring for ${executionId}`)
      
      // Poll N8N for execution status
      const pollInterval = setInterval(async () => {
        try {
          const n8nExecution = await this.n8nClient.getExecution(n8nExecutionId)
          const status = this.mapN8NStatusToExecutionStatus(n8nExecution.status)
          
          // Update execution status
          await this.updateExecutionStatus(executionId, status, n8nExecution)
          
          // If execution is complete, stop polling
          if ([ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED].includes(status)) {
            clearInterval(pollInterval)
            await this.finalizeExecution(executionId, n8nExecution)
            
            // Publish workflow execution completed event
            await this.publishWorkflowExecutionEvent(executionId, status, n8nExecution)
          }
        } catch (error) {
          this.logger.error(`Error monitoring execution ${executionId}:`, error)
          clearInterval(pollInterval)
          
          // Mark execution as failed
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          await this.updateExecutionStatus(executionId, ExecutionStatus.FAILED, null, errorMsg)
          
          // Publish workflow execution failed event
          await this.publishWorkflowExecutionEvent(executionId, ExecutionStatus.FAILED, null, errorMsg)
        }
      }, 5000) // Poll every 5 seconds
      
      // Set timeout for long-running executions
      setTimeout(() => {
        clearInterval(pollInterval)
        this.handleExecutionTimeout(executionId)
      }, 30 * 60 * 1000) // 30 minutes timeout
      
    } catch (error) {
      this.logger.error(`Failed to start monitoring execution ${executionId}:`, error)
      throw error
    }
  }

  async updateExecutionStatus(
    executionId: string, 
    status: ExecutionStatus, 
    n8nExecution?: any,
    errorMessage?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status: status,
        ...(errorMessage && { errorMessage }),
        ...( [ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.CANCELLED, ExecutionStatus.TIMEOUT].includes(status) && { completedAt: new Date() })
      }

      if (n8nExecution?.data?.resultData) {
        updateData.output = n8nExecution.data.resultData
        updateData.errorDetails = n8nExecution.data.resultData.error
      }

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

      // Extract node executions from N8N data
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

      // Create new execution record
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

      // Execute workflow in N8N
      const n8nWorkflowId = (workflow as any).configuration?.['n8nWorkflowId'] || (workflow as any).metadata?.n8nWorkflowId
      const n8nExecution = await this.n8nClient.executeWorkflow(n8nWorkflowId, (execution as any).input)

      // Update with N8N execution ID
      await this.prisma['workflowExecution'].update({
        where: { id: (retryExecution as any).id },
        data: {
          metadata: {
            ...((retryExecution as any).metadata || {}),
            n8nExecutionId: n8nExecution?.id
          } as any
        } as any
      })

      // Start monitoring if we have a valid N8N execution ID
      if (n8nExecution?.id) {
        this.monitorExecution((retryExecution as any).id, n8nExecution.id)
      } else {
        this.logger.warn(`No N8N execution ID returned for retry ${executionId}`)
      }

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

  private async handleExecutionTimeout(executionId: string): Promise<void> {
    try {
      await this.updateExecutionStatus(executionId, ExecutionStatus.TIMEOUT, null, 'Execution timed out')
      this.logger.warn(`Execution ${executionId} timed out`)

    } catch (error) {
      this.logger.error(`Failed to handle timeout for execution ${executionId}:`, error)
    }
  }

  private extractNodeExecutions(n8nExecution: any): NodeExecution[] {
    const nodeExecutions: NodeExecution[] = []

    if (n8nExecution?.data?.resultData?.runData) {
      const runData = n8nExecution.data.resultData.runData

      Object.keys(runData).forEach(nodeId => {
        const nodeData = runData[nodeId][0]
        
        nodeExecutions.push({
          nodeId,
          nodeName: nodeId,
          status: nodeData.error ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED,
          input: nodeData.inputData || {},
          output: nodeData.data || {},
          startedAt: new Date(nodeData.startTime || n8nExecution.startedAt),
          completedAt: new Date(nodeData.executionTime || n8nExecution.stoppedAt)
        })
      })
    }

    return nodeExecutions
  }

  private mapToWorkflowExecution(dbExecution: any): WorkflowExecution {
    return {
      id: dbExecution.id,
      workflowId: dbExecution.workflowId,
      tenantId: (dbExecution as any).tenantId,
      triggeredBy: dbExecution.triggeredBy,
      triggerType: dbExecution.triggerType,
      triggerData: dbExecution.triggerData,
      status: dbExecution.status as ExecutionStatus,
      input: dbExecution.input,
      output: dbExecution.output,
      startedAt: (dbExecution as any).startedAt || (dbExecution as any).createdAt,
      completedAt: dbExecution.completedAt,
      duration: dbExecution.completedAt 
        ? dbExecution.completedAt.getTime() - ((dbExecution as any).startedAt || (dbExecution as any).createdAt).getTime()
        : undefined,
      errorMessage: dbExecution.errorMessage,
      errorDetails: dbExecution.errorDetails,
      contextData: dbExecution.contextData,
      metadata: dbExecution.metadata,
      createdAt: (dbExecution as any).createdAt,
      updatedAt: (dbExecution as any).updatedAt
    }
  }

  private mapN8NStatusToExecutionStatus(n8nStatus: string): ExecutionStatus {
    switch (n8nStatus?.toLowerCase()) {
      case 'success':
      case 'completed':
        return ExecutionStatus.COMPLETED
      case 'error':
      case 'failed':
        return ExecutionStatus.FAILED
      case 'running':
      case 'active':
        return ExecutionStatus.RUNNING
      case 'waiting':
      case 'waiting_for_webhook':
        return ExecutionStatus.PENDING
      case 'cancelled':
        return ExecutionStatus.CANCELLED
      default:
        return ExecutionStatus.FAILED
    }
  }

  private async publishWorkflowExecutionEvent(
    executionId: string, 
    status: ExecutionStatus, 
    n8nExecution?: any, 
    errorMessage?: string
  ): Promise<void> {
    try {
      const execution = await this.prisma['workflowExecution'].findUnique({
        where: { id: executionId }
      })

      if (!execution) {
        this.logger.warn(`Execution ${executionId} not found for event publishing`)
        return
      }

      const eventPayload = {
        eventType: 'workflow.execution.completed',
        tenantId: (execution as any).tenantId,
        timestamp: new Date().toISOString(),
        data: {
          executionId,
          workflowId: (execution as any).workflowId,
          status,
          triggeredBy: execution.triggeredBy,
          triggerType: (execution as any).triggerType,
          duration: execution.completedAt && ((execution as any).startedAt || (execution as any).createdAt)
            ? execution.completedAt.getTime() - ((execution as any).startedAt || (execution as any).createdAt).getTime()
            : null,
          errorMessage,
          n8nExecutionId: n8nExecution?.id,
          nodeExecutions: n8nExecution ? this.extractNodeExecutions(n8nExecution) : []
        }
      }

      await this.eventPublisher.publishWorkflowEvent(eventPayload as any)
      this.logger.log(`Published workflow execution event for ${executionId}`)
    } catch (error) {
      this.logger.warn(`Failed to publish workflow execution event for ${executionId}:`, error)
    }
  }
}