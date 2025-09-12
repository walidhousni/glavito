import api from './config'

export type PublicChatMessage = { role: 'user' | 'assistant'; text: string; ts: number }

export const publicChatApi = {
  async start(payload?: { email?: string; name?: string }) {
    const { data } = await api.post('/public/chat/start', payload || {})
    const body = (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) ? (data as Record<string, unknown>)['data'] : data
    return body as { sessionId: string | null }
  },
  async message(sessionId: string | null, text: string) {
    const { data } = await api.post('/public/chat/message', { sessionId: sessionId || undefined, text })
    const body = (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) ? (data as Record<string, unknown>)['data'] : data
    return body as { sessionId?: string; reply: string; suggestions?: Array<{ id: string; title: string }> }
  },
  async history(sessionId: string) {
    const { data } = await api.get('/public/chat/history', { params: { sessionId } })
    const body = (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) ? (data as Record<string, unknown>)['data'] : data
    return body as { messages: PublicChatMessage[] }
  },
  stream(sessionId: string): EventSource | null {
    if (typeof window === 'undefined') return null
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/$/, '')
    const url = `${base}/public/chat/stream?sessionId=${encodeURIComponent(sessionId)}`
    return new EventSource(url)
  },
  async whatsappLink(sessionId?: string, phone?: string) {
    const { data } = await api.get('/public/chat/whatsapp-link', { params: { sessionId, phone } })
    const body = (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) ? (data as Record<string, unknown>)['data'] : data
    return body as { url: string; tenantId?: string }
  },
  async email(sessionId: string | null, email: string, message: string) {
    const { data } = await api.post('/public/chat/email', { sessionId: sessionId || undefined, email, message })
    const body = (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) ? (data as Record<string, unknown>)['data'] : data
    return body as { ok: boolean }
  },
  async magicLink(sessionId: string, email?: string) {
    const { data } = await api.post('/public/chat/magic-link', { sessionId, email })
    const body = (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) ? (data as Record<string, unknown>)['data'] : data
    return body as { ok: boolean; token?: string }
  },
  async resume(token: string) {
    const { data } = await api.post('/public/chat/resume', { token })
    const body = (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) ? (data as Record<string, unknown>)['data'] : data
    return body as { ok: boolean; sessionId?: string; tenantId?: string }
  }
}


