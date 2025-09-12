export interface WorkflowRule {
  id: string
  tenantId: string
  name: string
  description?: string
  type: string
  priority: number
  isActive: boolean
  conditions: any
  actions: any
  triggers: any
  schedule?: any
  metadata: WorkflowMetadata
  executionCount?: number
  lastExecuted?: Date | string
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowMetadata {
  // Legacy fields for backward compatibility
  category?: string
  tags?: string[]
  version?: string
  createdBy?: string
  status?: 'draft' | 'active' | 'inactive'
  
  // New node-based structure
  nodes?: WorkflowNode[]
  connections?: WorkflowConnection[]
  settings?: WorkflowSettings
  variables?: WorkflowVariable[]
  
  // Analytics and execution data
  avgExecutionTime?: number
  successRate?: number
  lastExecutionStatus?: string
  errorCount?: number
  
  // N8N integration
  n8nWorkflowId?: string
  n8nExecutionId?: string
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  tenantId: string
  triggeredBy: string
  triggerType: string
  triggerData: any
  status: ExecutionStatus
  input: any
  output?: any
  contextData: any
  metadata: any
  startedAt: Date
  completedAt?: Date
  duration?: number
  errorMessage?: string
  errorDetails?: any
  createdAt: Date
  updatedAt: Date
  // Additional fields for better tracking
  ticketId?: string
  nodeExecutions?: NodeExecution[]
  n8nExecutionId?: string
}

export interface NodeExecution {
  nodeId: string
  nodeName: string
  status: ExecutionStatus
  input?: any
  output?: any
  error?: string
  startedAt: Date
  completedAt?: Date
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  TIMEOUT = 'timeout'
}

export enum NodeType {
  START = 'start',
  END = 'end',
  CONDITION = 'condition',
  API_CALL = 'api_call',
  EMAIL = 'email',
  SEND_EMAIL = 'send_email',
  DATABASE_QUERY = 'database_query',
  DELAY = 'delay',
  WEBHOOK = 'webhook',
  TICKET_ESCALATION = 'ticket_escalation',
  TICKET_ASSIGNMENT = 'ticket_assignment',
  LOG_EVENT = 'log_event',
  CUSTOMER_LOOKUP = 'customer_lookup',
  LOOP = 'loop',
  SEND_NOTIFICATION = 'send_notification',
  CUSTOMER_SCORING = 'customer_scoring',
  AI_ANALYSIS = 'ai_analysis'
}

export enum TriggerType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  EVENT = 'event',
  WEBHOOK = 'webhook',
  API = 'api'
}

export interface WorkflowNode {
  id: string
  type: NodeType
  name: string
  position: { x: number; y: number }
  configuration: any
  inputs: Array<{ name: string; type: string; required: boolean }>
  outputs: Array<{ name: string; type: string; description?: string }>
}

export interface WorkflowConnection {
  id: string
  sourceNodeId: string
  sourceOutput: string
  targetNodeId: string
  targetInput: string
}

export interface WorkflowDefinition {
  id?: string
  tenantId?: string
  name: string
  description: string
  version: string
  status?: string
  category: string
  tags: string[]
  createdBy?: string
  trigger?: {
    type: TriggerType
    configuration: any
  }
  triggers?: Array<{
    id: string
    type: TriggerType
    name: string
    configuration: any
    enabled: boolean
  }>
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  settings?: {
    timeout: number
    maxRetries: number
    errorHandling: string
    logging: string
    executionMode: string
    priority: string
    permissions: Array<{ role: string; actions: string[] }>
    allowedIntegrations: string[]
  }
  variables?: Array<{
    name: string
    type: string
    defaultValue: any
    required: boolean
    description: string
  }>
}

export interface WorkflowInput {
  data?: any
  triggerData?: any
  context?: any
}

export interface WorkflowTrigger {
  type: string
  conditions: any
  configuration: any
}

export interface WorkflowAction {
  type: string
  configuration: any
  order: number
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  triggers: WorkflowTrigger[]
  actions: WorkflowAction[]
  configuration: any
  isPublic: boolean
}

export interface WorkflowExecutionContext {
  tenantId: string
  userId?: string
  conversationId?: string
  messageId?: string
  metadata?: any
}

export interface WorkflowEvent {
  type: string
  data: any
  context: WorkflowExecutionContext
  timestamp: Date
}

export interface WorkflowSettings {
  timeout: number
  maxRetries: number
  errorHandling: string
  logging: string
  executionMode: string
  priority: string
  permissions: Array<{ role: string; actions: string[] }>
  allowedIntegrations: string[]
}

export interface WorkflowVariable {
  name: string
  type: string
  defaultValue: any
  required: boolean
  description?: string
}