export type FlowChannel = 'whatsapp' | 'instagram' | 'email' | 'web' | 'slack'

export enum NodeKind {
  TriggerChannel = 'trigger.channel',
  SendMessage = 'send.message',
  Condition = 'condition',
  Switch = 'switch',
  Wait = 'wait',
  TicketCreate = 'ticket.create',
  TicketUpdate = 'ticket.update',
  Notify = 'notify',
  HttpRequest = 'http.request',
  End = 'end',
}

export interface FlowPort {
  id: string
  label?: string
}

export interface FlowNodeCommon {
  id: string
  type: string
  name: string
  x: number
  y: number
}

export type FlowNodeConfig =
  | { type: NodeKind.TriggerChannel; channel: FlowChannel; filter?: Record<string, unknown> }
  | { type: NodeKind.SendMessage; channel: FlowChannel; templateId?: string; content?: string }
  | { type: NodeKind.Condition; expression: string }
  | { type: NodeKind.Switch; cases: Array<{ when: string; to: string }>; defaultTo?: string }
  | { type: NodeKind.Wait; durationMs: number }
  | { type: NodeKind.TicketCreate; project?: string; fields?: Record<string, unknown> }
  | { type: NodeKind.TicketUpdate; ticketIdRef?: string; fields: Record<string, unknown> }
  | { type: NodeKind.Notify; target: 'agent' | 'team' | 'webhook'; config: Record<string, unknown> }
  | { type: NodeKind.HttpRequest; method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; url: string; headers?: Record<string, string>; body?: unknown }
  | { type: NodeKind.End }

export interface FlowNode extends FlowNodeCommon {
  config: FlowNodeConfig
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface FlowGraph {
  nodes: FlowNode[]
  edges: FlowEdge[]
}


