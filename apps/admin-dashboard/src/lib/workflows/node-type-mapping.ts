/**
 * Bidirectional mapping between backend node kinds and frontend node types
 * Backend uses: send_message, ticket_create, condition, etc.
 * Frontend uses: send-notification, template-message, condition, etc.
 */

export type BackendNodeKind =
  | 'start'
  | 'end'
  | 'send_message'
  | 'template_message'
  | 'send_email'
  | 'send_whatsapp'
  | 'send_instagram'
  | 'ai_agent'
  | 'ai_route'
  | 'ai_tool_call'
  | 'ai_guardrail'
  | 'ticket_create'
  | 'ticket_update'
  | 'ticket_assign'
  | 'ticket_close'
  | 'condition'
  | 'switch'
  | 'delay'
  | 'wait'
  | 'ai_decision'
  | 'ai_analysis'
  | 'churn_risk_check'
  | 'segment_check'
  | 'customer_segment'
  | 'track_event'
  | 'analytics_event'
  | 'journey_checkpoint'
  | 'http_request'
  | 'api_call'
  | 'notification'
  | 'set_variable'
  | 'log_event'
  | 'channel_in';

export type FrontendNodeType =
  | 'start'
  | 'end'
  | 'send-notification'
  | 'template-message'
  | 'ai_agent'
  | 'ai_route'
  | 'ai_tool_call'
  | 'ai_guardrail'
  | 'send_email'
  | 'send-whatsapp'
  | 'send-instagram'
  | 'ticket-create'
  | 'ticket-update'
  | 'ticket-assign'
  | 'ticket-close'
  | 'condition'
  | 'delay'
  | 'ai_decision'
  | 'ai-analysis'
  | 'churn_risk_check'
  | 'segment_check'
  | 'track_event'
  | 'journey_checkpoint'
  | 'api_call'
  | 'log-event'
  | 'default';

/**
 * Map backend node kind to frontend node type
 */
export const backendToFrontend: Record<BackendNodeKind, FrontendNodeType> = {
  start: 'start',
  end: 'end',
  send_message: 'send-notification',
  template_message: 'template-message',
  ai_agent: 'ai_agent',
  ai_route: 'ai_route',
  ai_tool_call: 'ai_tool_call',
  ai_guardrail: 'ai_guardrail',
  send_email: 'send_email',
  send_whatsapp: 'send-whatsapp',
  send_instagram: 'send-instagram',
  ticket_create: 'ticket-create',
  ticket_update: 'ticket-update',
  ticket_assign: 'ticket-assign',
  ticket_close: 'ticket-close',
  condition: 'condition',
  switch: 'condition',
  delay: 'delay',
  wait: 'delay',
  ai_decision: 'ai_decision',
  ai_analysis: 'ai-analysis',
  churn_risk_check: 'churn_risk_check',
  segment_check: 'segment_check',
  customer_segment: 'segment_check',
  track_event: 'track_event',
  analytics_event: 'track_event',
  journey_checkpoint: 'journey_checkpoint',
  http_request: 'api_call',
  api_call: 'api_call',
  notification: 'send-notification',
  set_variable: 'default',
  log_event: 'log-event',
  channel_in: 'default',
};

/**
 * Map frontend node type to backend node kind
 */
export const frontendToBackend: Record<FrontendNodeType, BackendNodeKind> = {
  start: 'start',
  end: 'end',
  'send-notification': 'send_message',
  'template-message': 'template_message',
  ai_agent: 'ai_agent',
  ai_route: 'ai_route',
  ai_tool_call: 'ai_tool_call',
  ai_guardrail: 'ai_guardrail',
  send_email: 'send_email',
  'send-whatsapp': 'send_whatsapp',
  'send-instagram': 'send_instagram',
  'ticket-create': 'ticket_create',
  'ticket-update': 'ticket_update',
  'ticket-assign': 'ticket_assign',
  'ticket-close': 'ticket_close',
  condition: 'condition',
  delay: 'delay',
  ai_decision: 'ai_decision',
  'ai-analysis': 'ai_analysis',
  churn_risk_check: 'churn_risk_check',
  segment_check: 'segment_check',
  track_event: 'track_event',
  journey_checkpoint: 'journey_checkpoint',
  api_call: 'api_call',
  'log-event': 'log_event',
  default: 'send_message',
};

/**
 * Get user-friendly label for a node type
 */
export const nodeTypeLabels: Record<FrontendNodeType, string> = {
  start: 'Start',
  end: 'End',
  'send-notification': 'Send Message',
  'template-message': 'Template Message',
  ai_agent: 'AI Agent',
  ai_route: 'AI Route',
  ai_tool_call: 'AI Tool Call',
  ai_guardrail: 'AI Guardrail',
  send_email: 'Send Email',
  'send-whatsapp': 'WhatsApp Message',
  'send-instagram': 'Instagram Message',
  'ticket-create': 'Create Ticket',
  'ticket-update': 'Update Ticket',
  'ticket-assign': 'Assign Ticket',
  'ticket-close': 'Close Ticket',
  condition: 'Condition',
  delay: 'Delay',
  ai_decision: 'AI Decision',
  'ai-analysis': 'AI Analysis',
  churn_risk_check: 'Churn Risk Check',
  segment_check: 'Segment Check',
  track_event: 'Track Event',
  journey_checkpoint: 'Journey Checkpoint',
  api_call: 'API Call',
  'log-event': 'Log Event',
  default: 'Action',
};

/**
 * Get user-friendly description for a node type
 */
export const nodeTypeDescriptions: Record<FrontendNodeType, string> = {
  start: 'Workflow entry point',
  end: 'Workflow completion',
  'send-notification': 'Send a message to a customer',
  'template-message': 'Send a pre-defined template message',
  ai_agent: 'Generate a reply with a selected AI agent (draft/auto)',
  ai_route: 'Route based on AI analysis results or intent map',
  ai_tool_call: 'Invoke a domain tool (orders/products/customer)',
  ai_guardrail: 'Enforce confidence/channel/policy guardrails',
  send_email: 'Send an email message',
  'send-whatsapp': 'Send a WhatsApp message',
  'send-instagram': 'Send an Instagram message',
  'ticket-create': 'Create a new support ticket',
  'ticket-update': 'Update ticket properties',
  'ticket-assign': 'Assign ticket to an agent',
  'ticket-close': 'Close and resolve ticket',
  condition: 'Branch based on conditions',
  delay: 'Wait for a specified duration',
  ai_decision: 'AI-powered decision making',
  'ai-analysis': 'Analyze content with AI',
  churn_risk_check: 'Check customer churn risk',
  segment_check: 'Check customer segment',
  track_event: 'Track analytics event',
  journey_checkpoint: 'Mark customer journey milestone',
  api_call: 'Make HTTP API request',
  'log-event': 'Log workflow event',
  default: 'Generic workflow action',
};

/**
 * Normalize backend node kind to frontend type
 */
export function normalizeNodeType(backendKind: string): FrontendNodeType {
  const normalized = backendKind.toLowerCase().replace(/[-_]/g, '');
  
  // Direct mapping
  if (backendKind in backendToFrontend) {
    return backendToFrontend[backendKind as BackendNodeKind];
  }
  
  // Fuzzy matching
  for (const [key, value] of Object.entries(backendToFrontend)) {
    const keyNorm = key.toLowerCase().replace(/[-_]/g, '');
    if (keyNorm === normalized) {
      return value;
    }
  }
  
  // Legacy/fallback mappings
  if (normalized.includes('message') || normalized.includes('send')) {
    return 'send-notification';
  }
  if (normalized.includes('ticket')) {
    if (normalized.includes('create')) return 'ticket-create';
    if (normalized.includes('update')) return 'ticket-update';
    if (normalized.includes('assign')) return 'ticket-assign';
    if (normalized.includes('close')) return 'ticket-close';
  }
  if (normalized.includes('delay') || normalized.includes('wait')) {
    return 'delay';
  }
  if (normalized.includes('condition') || normalized.includes('switch')) {
    return 'condition';
  }
  
  return 'default';
}

/**
 * Convert frontend node type to backend kind
 */
export function toBackendNodeKind(frontendType: string): BackendNodeKind {
  const normalized = frontendType.toLowerCase().replace(/[-_]/g, '');
  
  // Direct mapping
  if (frontendType in frontendToBackend) {
    return frontendToBackend[frontendType as FrontendNodeType];
  }
  
  // Fuzzy matching
  for (const [key, value] of Object.entries(frontendToBackend)) {
    const keyNorm = key.toLowerCase().replace(/[-_]/g, '');
    if (keyNorm === normalized) {
      return value;
    }
  }
  
  // Fallback
  return 'send_message';
}

/**
 * Get user-friendly label for a node
 */
export function getNodeLabel(type: string, customLabel?: string): string {
  if (customLabel) return customLabel;
  
  const frontendType = normalizeNodeType(type);
  return nodeTypeLabels[frontendType] || 'Action';
}

/**
 * Get user-friendly description for a node
 */
export function getNodeDescription(type: string): string {
  const frontendType = normalizeNodeType(type);
  return nodeTypeDescriptions[frontendType] || 'Workflow action';
}

