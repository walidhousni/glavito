import api from './config'

export interface BotAgentDto {
  id: string
  tenantId: string
  name: string
  description?: string | null
  isActive: boolean
  operatingMode: 'draft' | 'auto'
  minConfidence: number
  allowedChannels: string[]
  guardrails?: Record<string, unknown>
  settings?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface BotBindingDto {
  id: string
  tenantId: string
  agentId: string
  channelId: string
  channelType: string
  isEnabled: boolean
  routingHints?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

function hasDataProp(obj: unknown): obj is { data?: unknown } {
  return typeof obj === 'object' && obj !== null && 'data' in (obj as Record<string, unknown>)
}

function unwrap<T>(payload: unknown): T {
  const first = hasDataProp(payload) ? (payload as { data?: unknown }).data : payload
  return (first as T)
}

class BotsApiClient {
  async listAgents(): Promise<BotAgentDto[]> {
    const { data } = await api.get('/bots/agents')
    const inner = unwrap<unknown>(data)
    return Array.isArray(inner) ? (inner as BotAgentDto[]) : []
  }

  async createAgent(payload: { name: string; description?: string; operatingMode?: 'draft' | 'auto'; minConfidence?: number; allowedChannels?: string[]; guardrails?: Record<string, unknown> }): Promise<BotAgentDto> {
    const { data } = await api.post('/bots/agents', payload)
    return unwrap<BotAgentDto>(data)
  }

  async activateAgent(id: string, active: boolean): Promise<BotAgentDto> {
    const { data } = await api.patch(`/bots/agents/${id}/activate`, { active })
    return unwrap<BotAgentDto>(data)
  }

  async listBindings(): Promise<BotBindingDto[]> {
    const { data } = await api.get('/bots/bindings')
    const inner = unwrap<unknown>(data)
    return Array.isArray(inner) ? (inner as BotBindingDto[]) : []
  }

  async bindToChannel(payload: { agentId: string; channelId: string; channelType: string; routingHints?: Record<string, unknown>; isEnabled?: boolean }): Promise<BotBindingDto> {
    const { data } = await api.post('/bots/bindings', payload)
    return unwrap<BotBindingDto>(data)
  }

  async approveDraft(payload: { conversationId: string; messageId: string }): Promise<{ success?: boolean }> {
    const res = await fetch('/bots/autopilot/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return (hasDataProp(data) ? (data as any).data : data) as { success?: boolean };
  }
}

export const botsApi = new BotsApiClient()


