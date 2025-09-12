import { create } from 'zustand'
import { collaborationApi, type Channel, type Message, type Participant, type Shift } from '@/lib/api/collaboration-client'

export interface CollaborationState {
  channels: Channel[]
  channelsLoading: boolean
  selectedChannelId: string | null
  messages: Message[]
  messagesLoading: boolean
  participants: Participant[]
  participantsLoading: boolean
  shifts: Shift[]
  shiftsLoading: boolean
  dmResults: Array<{ id: string; label: string; email: string }>
  dmSearching: boolean
  error?: string

  fetchChannels: () => Promise<void>
  selectChannel: (id: string | null) => void
  createChannel: (payload: { name: string; type: string; teamId?: string }) => Promise<string | null>
  fetchChannelDetails: (id: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  addParticipant: (userId: string, role?: string) => Promise<void>
  removeParticipant: (userId: string) => Promise<void>
  searchUsers: (q: string) => Promise<void>
  startDM: (otherUserId: string) => Promise<string | null>
  createShift: (payload: { teamId?: string; userId?: string; title?: string; startTime: string; endTime: string; timezone?: string }) => Promise<void>
  fetchShifts: (params: { teamId?: string; userId?: string; date?: string }) => Promise<void>
}

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  channels: [],
  channelsLoading: false,
  selectedChannelId: null,
  messages: [],
  messagesLoading: false,
  participants: [],
  participantsLoading: false,
  shifts: [],
  shiftsLoading: false,
  dmResults: [],
  dmSearching: false,
  error: undefined,

  fetchChannels: async () => {
    set({ channelsLoading: true, error: undefined })
    try {
      const list = await collaborationApi.listChannels()
      set({ channels: Array.isArray(list) ? list : [], channelsLoading: false })
    } catch (err) {
      set({ channels: [], channelsLoading: false, error: (err as Error)?.message || 'Failed to load channels' })
    }
  },

  selectChannel: (id) => set({ selectedChannelId: id, messages: [], participants: [] }),

  createChannel: async (payload) => {
    try {
      const res = await collaborationApi.createChannel(payload)
      await get().fetchChannels()
      return res.id || null
    } catch (err) {
      set({ error: (err as Error)?.message || 'Failed to create channel' })
      return null
    }
  },

  fetchChannelDetails: async (id) => {
    set({ messagesLoading: true, participantsLoading: true })
    try {
      const [messages, participants] = await Promise.all([
        collaborationApi.listMessages(id),
        collaborationApi.listParticipants(id),
      ])
      set({ messages: Array.isArray(messages) ? messages : [], messagesLoading: false, participants: Array.isArray(participants) ? participants : [], participantsLoading: false })
    } catch (err) {
      set({ messages: [], messagesLoading: false, participants: [], participantsLoading: false, error: (err as Error)?.message || 'Failed to load channel details' })
    }
  },

  sendMessage: async (content) => {
    const channelId = get().selectedChannelId
    if (!channelId || !content.trim()) return
    try {
      await collaborationApi.postMessage(channelId, content)
      const messages = await collaborationApi.listMessages(channelId)
      set({ messages: Array.isArray(messages) ? messages : [] })
    } catch (err) {
      set({ error: (err as Error)?.message || 'Failed to send message' })
    }
  },

  addParticipant: async (userId, role) => {
    const channelId = get().selectedChannelId
    if (!channelId) return
    try {
      await collaborationApi.addParticipant(channelId, userId, role)
      const participants = await collaborationApi.listParticipants(channelId)
      set({ participants: Array.isArray(participants) ? participants : [] })
    } catch (err) {
      set({ error: (err as Error)?.message || 'Failed to add participant' })
    }
  },

  removeParticipant: async (userId) => {
    const channelId = get().selectedChannelId
    if (!channelId) return
    try {
      await collaborationApi.removeParticipant(channelId, userId)
      const participants = await collaborationApi.listParticipants(channelId)
      set({ participants: Array.isArray(participants) ? participants : [] })
    } catch (err) {
      set({ error: (err as Error)?.message || 'Failed to remove participant' })
    }
  },

  searchUsers: async (q) => {
    if (!q.trim()) { set({ dmResults: [], dmSearching: false }); return }
    set({ dmSearching: true })
    try {
      const results = await collaborationApi.searchUsers(q)
      set({ dmResults: Array.isArray(results) ? results : [], dmSearching: false })
    } catch (err) {
      set({ dmResults: [], dmSearching: false, error: (err as Error)?.message || 'Failed to search users' })
    }
  },

  startDM: async (otherUserId) => {
    try {
      const res = await collaborationApi.createDM(otherUserId)
      await get().fetchChannels()
      return res.id || null
    } catch (err) {
      set({ error: (err as Error)?.message || 'Failed to start DM' })
      return null
    }
  },

  createShift: async (payload) => {
    try {
      await collaborationApi.createShift(payload)
    } catch (err) {
      set({ error: (err as Error)?.message || 'Failed to create shift' })
    }
  },

  fetchShifts: async (params) => {
    set({ shiftsLoading: true })
    try {
      const items = await collaborationApi.listShifts(params)
      set({ shifts: Array.isArray(items) ? items : [], shiftsLoading: false })
    } catch (err) {
      set({ shifts: [], shiftsLoading: false, error: (err as Error)?.message || 'Failed to load shifts' })
    }
  },
}))


