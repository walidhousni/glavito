import api from './config'
import { publicChatApi } from './public-chat-client'
import { publicKnowledgeApi } from './public-knowledge-client'

export type ChannelType = 'whatsapp' | 'instagram' | 'email'

export interface ChannelStatus {
  whatsapp: { linked: boolean; verified?: boolean; phoneNumber?: string; attemptsLeft?: number }
  instagram: { linked: boolean; verified?: boolean; igHandle?: string; attemptsLeft?: number }
  email: { linked: boolean; verified?: boolean; email?: string }
}

export const helpCenterApi = {
  // Re-export existing APIs
  chat: publicChatApi,
  knowledge: publicKnowledgeApi,

  // Channel management
  async linkChannel(sessionId: string, channel: ChannelType, contact: string) {
    const { data } = await api.post('/public/chat/link-channel', { sessionId, channel, contact })
    const body = (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) ? (data as Record<string, unknown>)['data'] : data
    return body as { ok: boolean; error?: string; requiresVerification: boolean }
  },

  async verifyContact(sessionId: string, channel: 'whatsapp' | 'instagram', code: string) {
    const { data } = await api.post('/public/chat/verify-contact', { sessionId, channel, code })
    const body = (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) ? (data as Record<string, unknown>)['data'] : data
    return body as { ok: boolean; verified?: boolean; error?: string }
  },

  async getChannelStatus(sessionId: string) {
    const { data } = await api.get('/public/chat/channel-status', { params: { sessionId } })
    const body = (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) ? (data as Record<string, unknown>)['data'] : data
    return body as { ok: boolean; channels?: ChannelStatus; error?: string }
  },

  async sendToChannel(sessionId: string, channel: ChannelType, message: string) {
    const { data } = await api.post('/public/chat/send-to-channel', { sessionId, channel, message })
    const body = (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) ? (data as Record<string, unknown>)['data'] : data
    return body as { ok: boolean; error?: string }
  },
}

