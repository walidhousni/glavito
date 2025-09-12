import api from './config'

export type Channel = { id: string; name: string; type: string; teamId?: string; createdAt: string; updatedAt: string }
export type Message = { id: string; senderId: string; content: string; mentions: string[]; createdAt: string }
export type Participant = { userId: string; role: string; user: { id: string; email: string; firstName: string; lastName: string } }
export type Shift = { id: string; teamId?: string; userId?: string; title?: string; startTime: string; endTime: string; timezone: string }

function unwrap<T>(payload: unknown, fallback: T): T {
  const first: any = (payload as any)?.data !== undefined ? (payload as any).data : payload
  if (first == null) return fallback
  const second: any = (first as any)?.data !== undefined ? (first as any).data : first
  return (second as T) ?? fallback
}

export const collaborationApi = {
  async listChannels() {
    const { data } = await api.get('/collaboration/channels')
    return unwrap<Channel[]>(data, [])
  },
  async createChannel(payload: { name: string; type: string; teamId?: string }) {
    const { data } = await api.post('/collaboration/channels', payload)
    return unwrap<{ id: string }>(data, { id: '' })
  },
  async joinChannel(id: string) {
    const { data } = await api.post(`/collaboration/channels/${id}/join`, {})
    return unwrap<{ success: boolean }>(data, { success: true })
  },
  async listMessages(channelId: string, limit = 50) {
    const { data } = await api.get(`/collaboration/channels/${channelId}/messages`, { params: { limit } })
    const res = unwrap<unknown>(data, [])
    return Array.isArray(res) ? (res as Message[]) : []
  },
  async postMessage(channelId: string, content: string) {
    const { data } = await api.post(`/collaboration/channels/${channelId}/messages`, { content })
    return unwrap<{ id: string }>(data, { id: '' })
  },
  async listParticipants(channelId: string) {
    const { data } = await api.get(`/collaboration/channels/${channelId}/participants`)
    const res = unwrap<unknown>(data, [])
    return Array.isArray(res) ? (res as Participant[]) : []
  },
  async addParticipant(channelId: string, userId: string, role?: string) {
    const { data } = await api.post(`/collaboration/channels/${channelId}/participants`, { userId, role })
    return unwrap<{ success: boolean }>(data, { success: true })
  },
  async removeParticipant(channelId: string, userId: string) {
    const { data } = await api.post(`/collaboration/channels/${channelId}/participants/remove`, { userId })
    return unwrap<{ success: boolean }>(data, { success: true })
  },
  async searchUsers(q: string) {
    const { data } = await api.get('/collaboration/users', { params: { q } })
    const res = unwrap<unknown>(data, [])
    return Array.isArray(res) ? (res as Array<{ id: string; label: string; email: string }>) : []
  },
  async createDM(otherUserId: string) {
    const { data } = await api.post('/collaboration/dm', { otherUserId })
    return unwrap<{ id: string }>(data, { id: '' })
  },
  async createShift(payload: { teamId?: string; userId?: string; title?: string; startTime: string; endTime: string; timezone?: string }) {
    const { data } = await api.post('/collaboration/shifts', payload)
    return unwrap<{ id: string }>(data, { id: '' })
  },
  async listShifts(params: { teamId?: string; userId?: string; date?: string }) {
    const { data } = await api.get('/collaboration/shifts', { params })
    const res = unwrap<unknown>(data, [])
    return Array.isArray(res) ? (res as Shift[]) : []
  },
  async coverageByTeam(date?: string) {
    const { data } = await api.get('/collaboration/coverage', { params: { date } })
    const res = unwrap<unknown>(data, [])
    return Array.isArray(res) ? (res as Array<{ teamId: string | null; agents: number; shifts: number }>) : []
  },
}


