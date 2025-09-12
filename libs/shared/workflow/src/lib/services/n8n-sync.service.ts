import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@glavito/shared-database'
import { N8NClient, N8NWorkflow, N8NWorkflowCreateRequest } from '../clients/n8n.client'

@Injectable()
export class N8NSyncService {
  private readonly logger = new Logger(N8NSyncService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly n8nClient: N8NClient
  ) {}

  /**
   * Sync a database workflow to N8N
   * Creates or updates the corresponding N8N workflow
   */
  async syncWorkflowToN8N(workflowId: string): Promise<string> {
    try {
      this.logger.log(`Syncing workflow ${workflowId} to N8N`)

      // Get workflow from database
      const workflow = await this.prisma['workflowRule'].findUnique({
        where: { id: workflowId }
      })

      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`)
      }

      const metadata = workflow.metadata as any || {}
      const originalNodes = Array.isArray(metadata.nodes) ? metadata.nodes : []
      const originalConnections = metadata.connections || []

      // Fallback: ensure at least a minimal start->end graph so n8n accepts the workflow
      let nodes = originalNodes
      let connections = originalConnections
      if (!Array.isArray(nodes) || nodes.length === 0) {
        nodes = [
          { id: 'start', name: 'Start', type: 'input', position: { x: 280, y: 120 }, configuration: {}, inputs: [], outputs: [] },
          { id: 'end', name: 'End', type: 'output', position: { x: 540, y: 120 }, configuration: {}, inputs: [], outputs: [] },
        ]
        connections = [
          { id: 'e1', sourceNodeId: 'start', sourceOutput: 'main', targetNodeId: 'end', targetInput: 'main' }
        ]
      }

      // Convert to N8N format
      const n8nWorkflowData: N8NWorkflowCreateRequest = {
        name: workflow.name,
        nodes: this.convertNodesToN8N(nodes),
        connections: this.convertConnectionsToN8N(connections, nodes),
        active: workflow.isActive,
        settings: {
          executionOrder: 'v1',
          saveManualExecutions: true,
          callersPolicy: 'workflowsFromSameOwner',
          errorWorkflow: null,
          ...metadata.settings
        }
      }

      // Check if N8N workflow already exists
      const existingN8nId = metadata.n8nWorkflowId
      let n8nWorkflow: N8NWorkflow

      if (existingN8nId) {
        try {
          // Update existing workflow
          n8nWorkflow = await this.n8nClient.updateWorkflow(existingN8nId, n8nWorkflowData)
          this.logger.log(`Updated N8N workflow ${existingN8nId} for database workflow ${workflowId}`)
        } catch (error) {
          this.logger.warn(`Failed to update N8N workflow ${existingN8nId}, creating new one:`, error)
          // Create new workflow if update fails
          n8nWorkflow = await this.n8nClient.createWorkflow(n8nWorkflowData)
        }
      } else {
        // Create new workflow
        n8nWorkflow = await this.n8nClient.createWorkflow(n8nWorkflowData)
        this.logger.log(`Created N8N workflow ${n8nWorkflow.id} for database workflow ${workflowId}`)
      }

      // Update database with N8N workflow ID
      await this.prisma['workflowRule'].update({
        where: { id: workflowId },
        data: {
          metadata: {
            ...metadata,
            n8nWorkflowId: n8nWorkflow.id
          } as any
        } as any
      })

      return n8nWorkflow.id

    } catch (error) {
      this.logger.error(`Failed to sync workflow ${workflowId} to N8N:`, error)
      throw error
    }
  }

  /**
   * Delete N8N workflow when database workflow is deleted
   */
  async deleteN8NWorkflow(workflowId: string): Promise<void> {
    try {
      const workflow = await this.prisma['workflowRule'].findUnique({
        where: { id: workflowId }
      })

      if (!workflow) {
        this.logger.warn(`Workflow ${workflowId} not found for N8N deletion`)
        return
      }

      const metadata = workflow.metadata as any || {}
      const n8nWorkflowId = metadata.n8nWorkflowId

      if (n8nWorkflowId) {
        await this.n8nClient.deleteWorkflow(n8nWorkflowId)
        this.logger.log(`Deleted N8N workflow ${n8nWorkflowId} for database workflow ${workflowId}`)
      }

    } catch (error) {
      this.logger.error(`Failed to delete N8N workflow for ${workflowId}:`, error)
      // Don't throw error as the database workflow is already deleted
    }
  }

  /**
   * Sync workflow status between database and N8N
   */
  async syncWorkflowStatus(workflowId: string, isActive: boolean): Promise<void> {
    try {
      const workflow = await this.prisma['workflowRule'].findUnique({
        where: { id: workflowId }
      })

      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`)
      }

      const metadata = workflow.metadata as any || {}
      const n8nWorkflowId = metadata.n8nWorkflowId

      if (n8nWorkflowId) {
        if (isActive) {
          await this.n8nClient.activateWorkflow(n8nWorkflowId)
        } else {
          await this.n8nClient.deactivateWorkflow(n8nWorkflowId)
        }
        this.logger.log(`Synced workflow status for ${workflowId}: ${isActive ? 'active' : 'inactive'}`)
      }

    } catch (error) {
      this.logger.error(`Failed to sync workflow status for ${workflowId}:`, error)
      throw error
    }
  }

  /**
   * Convert database nodes to N8N format
   */
  private convertNodesToN8N(nodes: any[]): any[] {
    return nodes.map(node => ({
      id: node.id,
      name: node.name,
      type: this.mapNodeTypeToN8N(node.type),
      typeVersion: 1,
      position: Array.isArray(node.position) ? node.position : [Number(node?.position?.x ?? 0), Number(node?.position?.y ?? 0)],
      parameters: node.configuration || {}
    }))
  }

  /**
   * Convert database connections to N8N format
   */
  private convertConnectionsToN8N(connections: any, nodes: any[]): any {
    const n8nConnections: any = {}
    const idToName = new Map<string, string>()
    nodes.forEach((n: any) => { if (n?.id && n?.name) idToName.set(String(n.id), String(n.name)) })

    if (Array.isArray(connections)) {
      connections.forEach((conn: any) => {
        const srcName = idToName.get(String(conn.sourceNodeId)) || String(conn.sourceNodeId)
        const tgtName = idToName.get(String(conn.targetNodeId)) || String(conn.targetNodeId)
        // n8n expects 'main' for port keys and link.type; output branch index handled by second dimension
        const outPort = 'main'
        const inType = 'main'

        if (!n8nConnections[srcName]) n8nConnections[srcName] = {}
        if (!Array.isArray(n8nConnections[srcName][outPort])) n8nConnections[srcName][outPort] = [[]]
        if (!Array.isArray(n8nConnections[srcName][outPort][0])) n8nConnections[srcName][outPort][0] = []
        n8nConnections[srcName][outPort][0].push({ node: tgtName, type: inType, index: 0 })
      })
      return n8nConnections
    }

    if (typeof connections === 'object' && connections !== null) {
      // Best-effort: remap keys if they match IDs instead of names
      const remapped: any = {}
      Object.keys(connections).forEach((key) => {
        const srcName = idToName.get(String(key)) || key
        remapped[srcName] = connections[key]
      })
      return remapped
    }

    return {}
  }

  /**
   * Map our node types to N8N node types
   */
  private mapNodeTypeToN8N(nodeType: string): string {
    const typeMap: Record<string, string> = {
      // ReactFlow/basic kinds
      'input': 'n8n-nodes-base.start',
      // No explicit Stop in n8n; use a generic Set node as safe sink
      'output': 'n8n-nodes-base.set',
      'default': 'n8n-nodes-base.set',
      // Logical/flow
      'condition': 'n8n-nodes-base.if',
      'delay': 'n8n-nodes-base.wait',
      // Integrations/actions
      'email': 'n8n-nodes-base.emailSend',
      'send_email': 'n8n-nodes-base.emailSend',
      'send-notification': 'n8n-nodes-base.emailSend',
      'send_notification': 'n8n-nodes-base.emailSend',
      'webhook': 'n8n-nodes-base.webhook',
      'http': 'n8n-nodes-base.httpRequest',
      'api_call': 'n8n-nodes-base.httpRequest',
      // Data
      'database': 'n8n-nodes-base.postgres',
      'database_query': 'n8n-nodes-base.postgres',
      'customer-lookup': 'n8n-nodes-base.postgres',
      'customer_lookup': 'n8n-nodes-base.postgres',
      // AI
      'ai-analysis': 'n8n-nodes-base.openAi',
      'ai_analysis': 'n8n-nodes-base.openAi',
      // Iteration/utility
      'loop': 'n8n-nodes-base.noOp',
      // Ticket workflows
      'ticket-escalation': 'n8n-nodes-base.noOp',
      'ticket_escalation': 'n8n-nodes-base.noOp',
      // Scoring
      'customer_scoring': 'n8n-nodes-base.noOp',
      // Ticket-specific placeholders map to no-op unless custom nodes exist
      'ticket-assignment': 'n8n-nodes-base.noOp',
      'ticket_assignment': 'n8n-nodes-base.noOp',
      // Utility
      'log-event': 'n8n-nodes-base.noOp',
      'log_event': 'n8n-nodes-base.noOp'
    }

    return typeMap[nodeType] || 'n8n-nodes-base.noOp'
  }

  /**
   * Get all N8N workflows and sync them back to database
   */
  async syncN8NToDatabase(): Promise<void> {
    try {
      this.logger.log('Syncing N8N workflows to database')

      const n8nWorkflows = await this.n8nClient.listWorkflows()

      for (const n8nWorkflow of n8nWorkflows) {
        // Check if workflow exists in database
        const existingWorkflow = await this.prisma['workflowRule'].findFirst({
          where: {
            metadata: {
              path: ['n8nWorkflowId'],
              equals: n8nWorkflow.id
            }
          } as any
        })

        if (!existingWorkflow) {
          // Create new database workflow from N8N
          await this.prisma['workflowRule'].create({
            data: {
              tenantId: 'default', // You might want to handle this differently
              name: n8nWorkflow.name,
              description: `Imported from N8N: ${n8nWorkflow.name}`,
              type: 'n8n',
              priority: 0,
              isActive: n8nWorkflow.active,
              conditions: {},
              actions: {},
              triggers: [],
              metadata: {
                n8nWorkflowId: n8nWorkflow.id,
                nodes: this.convertN8NNodesToDatabase(n8nWorkflow.nodes),
                connections: this.convertN8NConnectionsToDatabase(n8nWorkflow.connections),
                category: 'imported',
                tags: ['n8n-import'],
                version: '1.0',
                createdBy: 'n8n-sync',
                status: n8nWorkflow.active ? 'active' : 'inactive'
              } as any
            } as any
          })

          this.logger.log(`Created database workflow for N8N workflow ${n8nWorkflow.id}`)
        }
      }

    } catch (error) {
      this.logger.error('Failed to sync N8N workflows to database:', error)
      throw error
    }
  }

  /**
   * Convert N8N nodes back to database format
   */
  private convertN8NNodesToDatabase(n8nNodes: any[]): any[] {
    return n8nNodes.map(node => ({
      id: node.id,
      name: node.name,
      type: this.mapN8NTypeToDatabase(node.type),
      position: node.position,
      configuration: node.parameters || {}
    }))
  }

  /**
   * Convert N8N connections back to database format
   */
  private convertN8NConnectionsToDatabase(n8nConnections: any): any[] {
    const connections: any[] = []

    Object.keys(n8nConnections).forEach(sourceNodeId => {
      Object.keys(n8nConnections[sourceNodeId]).forEach(sourceOutput => {
        n8nConnections[sourceNodeId][sourceOutput].forEach((target: any, index: number) => {
          connections.push({
            id: `${sourceNodeId}-${sourceOutput}-${target.node}-${index}`,
            sourceNodeId,
            sourceOutput,
            targetNodeId: target.node,
            targetInput: target.type
          })
        })
      })
    })

    return connections
  }

  /**
   * Map N8N node types back to our database format
   */
  private mapN8NTypeToDatabase(n8nType: string): string {
    const typeMap: Record<string, string> = {
      'n8n-nodes-base.start': 'input',
      'n8n-nodes-base.stop': 'output',
      'n8n-nodes-base.noOp': 'default',
      'n8n-nodes-base.if': 'condition',
      'n8n-nodes-base.wait': 'delay',
      'n8n-nodes-base.emailSend': 'send_email',
      'n8n-nodes-base.webhook': 'webhook',
      'n8n-nodes-base.httpRequest': 'api_call',
      'n8n-nodes-base.postgres': 'database_query',
      'n8n-nodes-base.openAi': 'ai_analysis'
    }

    return typeMap[n8nType] || 'default'
  }
}
