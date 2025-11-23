export interface WorkflowRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'routing' | 'escalation' | 'automation' | 'sla';
  priority: number;
  isActive: boolean;
  conditions: any[];
  actions: WorkflowAction[];
  triggers: WorkflowTrigger[];
  schedule?: any;
  metadata: Record<string, any>;
  executionCount: number;
  lastExecuted?: Date;
  createdAt: Date;
  updatedAt: Date;
  executions?: WorkflowExecution[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  tenantId?: string;
  triggeredBy: string;
  triggerType: string;
  triggerData: Record<string, any>;
  status: ExecutionStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  errorMessage?: string;
  errorDetails?: any;
  contextData: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  name: string;
  enabled: boolean;
  configuration: Record<string, any>;
  conditions?: any[];
}

export interface WorkflowAction {
  id: string;
  type: ActionType;
  name: string;
  enabled: boolean;
  configuration: Record<string, any>;
  onError?: {
    action: 'continue' | 'stop' | 'retry';
    retryCount?: number;
    retryDelay?: number;
  };
}

export interface WorkflowInput {
  data: Record<string, any>;
  context?: Record<string, any>;
  triggerData?: Record<string, any>;
}

export interface NodeExecution {
  nodeId: string;
  nodeName: string;
  status: ExecutionStatus;
  input: Record<string, any>;
  output: Record<string, any>;
  startedAt: Date;
  completedAt: Date;
  duration?: number;
  errorMessage?: string;
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

export enum TriggerType {
  EVENT = 'event',
  SCHEDULE = 'schedule',
  WEBHOOK = 'webhook',
  MANUAL = 'manual',
  TIME_BASED = 'time_based',
  SLA_BREACH = 'sla_breach'
}

export enum ActionType {
  ASSIGN_TICKET = 'assign_ticket',
  UPDATE_FIELD = 'update_field',
  ADD_TAG = 'add_tag',
  REMOVE_TAG = 'remove_tag',
  SEND_EMAIL = 'send_email',
  SEND_NOTIFICATION = 'send_notification',
  CREATE_TICKET = 'create_ticket',
  ESCALATE_TICKET = 'escalate_ticket',
  CLOSE_TICKET = 'close_ticket',
  API_CALL = 'api_call',
  DELAY = 'delay',
  CONDITION = 'condition',
  // Extended actions supported by services
  ADD_TICKET_NOTE = 'add_ticket_note',
  ADD_TICKET_TIMELINE = 'add_ticket_timeline',
  CHANGE_STATUS = 'change_status',
  NOTIFY_TEAM = 'notify_team',
  SEND_TEMPLATE_MESSAGE = 'send_template_message',
  CREATE_OR_UPDATE_TICKET = 'create_or_update_ticket',
  FETCH_INVOICE = 'fetch_invoice'
}

export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value?: any;
  values?: any[];
  logic?: 'AND' | 'OR';
  conditions?: WorkflowCondition[];
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN = 'less_than',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IN = 'in',
  NOT_IN = 'not_in',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists',
  REGEX = 'regex'
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  conditions?: WorkflowCondition[];
  metadata: Record<string, any>;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  successRate: number;
  lastExecuted?: Date;
  executionsToday: number;
  executionsThisWeek: number;
  executionsThisMonth: number;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface WorkflowExecutionContext {
  tenantId: string;
  userId?: string;
  ticketId?: string;
  customerId?: string;
  conversationId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface WorkflowExecutionLog {
  id: string;
  executionId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, any>;
  timestamp: Date;
}

// Node types for node-based workflow definitions
export enum NodeType {
  START = 'start',
  END = 'end',
  CONDITION = 'condition',
  DELAY = 'delay',
  LOOP = 'loop',
  SEND_EMAIL = 'send_email',
  SEND_NOTIFICATION = 'send_notification',
  TEMPLATE_MESSAGE = 'template_message',
  API_CALL = 'api_call',
  WEBHOOK = 'webhook',
  LOG_EVENT = 'log_event',
  DATABASE_QUERY = 'database_query',
  CUSTOMER_LOOKUP = 'customer_lookup',
  CUSTOMER_SCORING = 'customer_scoring',
  AI_ANALYSIS = 'ai_analysis',
  TICKET_ASSIGNMENT = 'ticket_assignment',
  TICKET_ESCALATION = 'ticket_escalation'
}

export interface WorkflowNodeDefinition {
  id: string;
  type: NodeType;
  name: string;
  position: { x: number; y: number };
  configuration: Record<string, any>;
  inputs: Array<{ name: string; type: string; required?: boolean }>;
  outputs: Array<{ name: string; type: string; description?: string }>;
}

export interface WorkflowConnectionDefinition {
  id: string;
  sourceNodeId: string;
  sourceOutput: string;
  targetNodeId: string;
  targetInput: string;
}

export interface WorkflowDefinition {
  tenantId: string;
  name: string;
  description?: string;
  version?: string;
  status?: 'active' | 'inactive' | 'draft' | string;
  category?: string;
  tags?: string[];
  createdBy?: string;
  triggers: WorkflowTrigger[];
  nodes: WorkflowNodeDefinition[];
  connections: WorkflowConnectionDefinition[];
  settings?: Record<string, any>;
  variables?: Array<{ name: string; type: string; defaultValue?: any; required?: boolean; description?: string }>;
}