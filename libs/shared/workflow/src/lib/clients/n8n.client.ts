import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'

export interface N8NExecutionResult {
  id: string
  status: 'running' | 'success' | 'error' | 'waiting'
  data?: any
  error?: string
}

export interface N8NConfig {
  baseUrl: string
  apiKey: string
  timeout?: number
  retryAttempts?: number
}

export interface N8NWorkflow {
  id: string
  name: string
  active: boolean
  nodes: any[]
  connections: any
  settings?: any
  staticData?: any
}

export interface N8NWorkflowCreateRequest {
  name: string
  nodes: any[]
  connections: any
  active?: boolean
  settings?: any
}

@Injectable()
export class N8NClient {
  private readonly logger = new Logger(N8NClient.name)
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.baseUrl = this.configService.get<string>('N8N_BASE_URL', this.configService.get<string>('N8N_API_URL', 'http://localhost:5678'))
    this.apiKey = this.configService.get<string>('N8N_API_KEY', '')
  }

  private getAuthHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.apiKey) {
      // Support both header names used across n8n versions
      headers['X-N8N-API-KEY'] = this.apiKey
      headers['X-API-KEY'] = this.apiKey
    } else {
      // Fallback to basic auth if no API key is provided
      const username = this.configService.get<string>('N8N_BASIC_AUTH_USER', 'admin')
      const password = this.configService.get<string>('N8N_BASIC_AUTH_PASSWORD', 'admin123')
      const auth = Buffer.from(`${username}:${password}`).toString('base64')
      headers['Authorization'] = `Basic ${auth}`
    }

    return headers
  }

  async executeWorkflow(workflowId: string, data: any): Promise<N8NExecutionResult> {
    try {
      this.logger.log(`Executing N8N workflow ${workflowId}`)
      
      // Try modern endpoint first
      const tryEndpoints = [
        `${this.baseUrl}/api/v1/workflows/${workflowId}/execute`,
        `${this.baseUrl}/api/v1/workflows/${workflowId}/run`,
        `${this.baseUrl}/api/v1/executions`,
        `${this.baseUrl}/rest/executions`
      ]

      let lastError: unknown = null
      for (const endpoint of tryEndpoints) {
        try {
          let payload: any = { data }
          // For executions endpoints, pass workflowId instead
          if (endpoint.endsWith('/executions')) {
            payload = { workflowId, mode: 'manual', startedBy: 'api', input: data }
          }
          const response = await firstValueFrom(
            this.httpService.post(endpoint, payload, { headers: this.getAuthHeaders() })
          )
          return {
            id: response.data.executionId || response.data.id,
            status: response.data.status || 'running',
            data: response.data.data
          }
        } catch (e) {
          lastError = e
          continue
        }
      }

      throw lastError instanceof Error ? lastError : new Error('Failed to execute workflow (no valid endpoint)')
    } catch (error) {
      this.logger.error(`Failed to execute N8N workflow ${workflowId}:`, error)
      return {
        id: '',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getExecutionStatus(executionId: string): Promise<N8NExecutionResult> {
    try {
      const paths = [
        `${this.baseUrl}/api/v1/executions/${executionId}`,
        `${this.baseUrl}/rest/executions/${executionId}`
      ]
      let lastError: unknown = null
      for (const url of paths) {
        try {
          const response = await firstValueFrom(this.httpService.get(url, { headers: this.getAuthHeaders() }))
          return {
            id: executionId,
            status: response.data.status,
            data: response.data.data
          }
        } catch (e) {
          lastError = e
          continue
        }
      }
      throw lastError instanceof Error ? lastError : new Error('Failed to get execution status')
    } catch (error) {
      this.logger.error(`Failed to get N8N execution status ${executionId}:`, error)
      return {
        id: executionId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getExecution(executionId: string): Promise<N8NExecutionResult> {
    try {
      this.logger.log(`Getting N8N execution details for ${executionId}`)
      const urls = [
        `${this.baseUrl}/api/v1/executions/${executionId}`,
        `${this.baseUrl}/rest/executions/${executionId}`
      ]
      let lastError: unknown = null
      for (const url of urls) {
        try {
          const response = await firstValueFrom(this.httpService.get(url, { headers: this.getAuthHeaders() }))
          const execution = response.data
          return {
            id: executionId,
            status: this.mapN8NStatus(execution.status),
            data: {
              resultData: execution.data,
              runData: execution.data?.resultData?.runData,
              startedAt: execution.startedAt,
              stoppedAt: execution.stoppedAt,
              finished: execution.finished,
              mode: execution.mode,
              workflowData: execution.workflowData
            }
          }
        } catch (e) {
          lastError = e
          continue
        }
      }
      throw lastError instanceof Error ? lastError : new Error('Failed to get execution')
    } catch (error) {
      this.logger.error(`Failed to get N8N execution ${executionId}:`, error)
      return {
        id: executionId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async createWorkflow(workflowData: N8NWorkflowCreateRequest): Promise<N8NWorkflow> {
    try {
      this.logger.log(`Creating N8N workflow: ${workflowData.name}`)
      
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/v1/workflows`,
          workflowData,
          {
            headers: this.getAuthHeaders()
          }
        )
      )

      return {
        id: response.data.id,
        name: response.data.name,
        active: response.data.active,
        nodes: response.data.nodes,
        connections: response.data.connections,
        settings: response.data.settings,
        staticData: response.data.staticData
      }
    } catch (error) {
      const err: any = error
      const status = err?.response?.status
      const body = err?.response?.data
      this.logger.error(`Failed to create N8N workflow ${workflowData.name}: status=${status} body=${JSON.stringify(body)}`)
      throw error
    }
  }

  async getWorkflow(workflowId: string): Promise<N8NWorkflow> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/v1/workflows/${workflowId}`,
          {
            headers: this.getAuthHeaders()
          }
        )
      )

      return {
        id: response.data.id,
        name: response.data.name,
        active: response.data.active,
        nodes: response.data.nodes,
        connections: response.data.connections,
        settings: response.data.settings,
        staticData: response.data.staticData
      }
    } catch (error) {
      this.logger.error(`Failed to get N8N workflow ${workflowId}:`, error)
      throw error
    }
  }

  async updateWorkflow(workflowId: string, workflowData: Partial<N8NWorkflowCreateRequest>): Promise<N8NWorkflow> {
    try {
      this.logger.log(`Updating N8N workflow: ${workflowId}`)
      
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.baseUrl}/api/v1/workflows/${workflowId}`,
          workflowData,
          {
            headers: this.getAuthHeaders()
          }
        )
      )

      return {
        id: response.data.id,
        name: response.data.name,
        active: response.data.active,
        nodes: response.data.nodes,
        connections: response.data.connections,
        settings: response.data.settings,
        staticData: response.data.staticData
      }
    } catch (error) {
      const err: any = error
      const status = err?.response?.status
      const body = err?.response?.data
      this.logger.error(`Failed to update N8N workflow ${workflowId}: status=${status} body=${JSON.stringify(body)}`)
      throw error
    }
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      this.logger.log(`Deleting N8N workflow: ${workflowId}`)
      
      await firstValueFrom(
        this.httpService.delete(
          `${this.baseUrl}/api/v1/workflows/${workflowId}`,
          {
            headers: this.getAuthHeaders()
          }
        )
      )
    } catch (error) {
      this.logger.error(`Failed to delete N8N workflow ${workflowId}:`, error)
      throw error
    }
  }

  async listWorkflows(): Promise<N8NWorkflow[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/v1/workflows`,
          {
            headers: this.getAuthHeaders()
          }
        )
      )

      return response.data.data.map((workflow: any) => ({
        id: workflow.id,
        name: workflow.name,
        active: workflow.active,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings,
        staticData: workflow.staticData
      }))
    } catch (error) {
      this.logger.error(`Failed to list N8N workflows:`, error)
      throw error
    }
  }

  async activateWorkflow(workflowId: string): Promise<void> {
    try {
      this.logger.log(`Activating N8N workflow: ${workflowId}`)
      
      await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/v1/workflows/${workflowId}/activate`,
          {},
          {
            headers: this.getAuthHeaders()
          }
        )
      )
    } catch (error) {
      this.logger.error(`Failed to activate N8N workflow ${workflowId}:`, error)
      throw error
    }
  }

  async deactivateWorkflow(workflowId: string): Promise<void> {
    try {
      this.logger.log(`Deactivating N8N workflow: ${workflowId}`)
      
      await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/api/v1/workflows/${workflowId}/deactivate`,
          {},
          {
            headers: this.getAuthHeaders()
          }
        )
      )
    } catch (error) {
      this.logger.error(`Failed to deactivate N8N workflow ${workflowId}:`, error)
      throw error
    }
  }

  private mapN8NStatus(n8nStatus: string): 'running' | 'success' | 'error' | 'waiting' {
    switch (n8nStatus?.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'success'
      case 'error':
      case 'failed':
        return 'error'
      case 'running':
      case 'active':
        return 'running'
      case 'waiting':
      case 'waiting_for_webhook':
        return 'waiting'
      default:
        return 'error'
    }
  }
}