import { create } from 'zustand'
import { helpCenterApi, ChannelType, ChannelStatus } from '../api/help-center-client'

export interface Message {
  role: 'user' | 'assistant'
  text: string
  ts: number
  channel?: string
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
}

export interface HelpCenterState {
  // Session
  sessionId: string | null
  tenantId: string | null
  isInitialized: boolean
  
  // Messages
  messages: Message[]
  isLoading: boolean
  
  // Channels
  linkedChannels: ChannelStatus | null
  channelStatuses: Record<string, 'connecting' | 'connected' | 'error' | 'disconnected'>
  activeChannel: 'web' | 'whatsapp' | 'instagram' | 'email'
  
  // UI State
  isChatOpen: boolean
  isLinkingChannel: boolean
  pendingVerification: { channel: 'whatsapp' | 'instagram'; contact: string } | null
  
  // Knowledge base
  searchQuery: string
  searchResults: { articles: any[]; faqs: any[] }
  selectedArticle: any | null
  
  // Actions
  initSession: () => Promise<void>
  sendMessage: (text: string, broadcastToChannels?: boolean) => Promise<void>
  linkChannel: (channel: ChannelType, contact: string) => Promise<{ success: boolean; requiresVerification: boolean; error?: string }>
  verifyChannel: (channel: 'whatsapp' | 'instagram', code: string) => Promise<{ success: boolean; error?: string }>
  refreshChannelStatus: () => Promise<void>
  switchChannel: (channel: 'web' | 'whatsapp' | 'instagram' | 'email') => void
  toggleChat: () => void
  setSearchQuery: (query: string) => void
  searchKnowledge: (query: string) => Promise<void>
  selectArticle: (article: any) => void
  reset: () => void
}

export const useHelpCenterStore = create<HelpCenterState>((set, get) => ({
  // Initial state
  sessionId: null,
  tenantId: null,
  isInitialized: false,
  messages: [],
  isLoading: false,
  linkedChannels: null,
  channelStatuses: {},
  activeChannel: 'web',
  isChatOpen: false,
  isLinkingChannel: false,
  pendingVerification: null,
  searchQuery: '',
  searchResults: { articles: [], faqs: [] },
  selectedArticle: null,

  // Initialize session
  initSession: async () => {
    const state = get()
    if (state.isInitialized) return

    try {
      // Try to restore from localStorage
      const savedSessionId = typeof window !== 'undefined' ? localStorage.getItem('helpcenter_session') : null
      
      if (savedSessionId) {
        set({ sessionId: savedSessionId, isInitialized: true })
        // Refresh channel status
        await get().refreshChannelStatus()
        // Load message history
        try {
          const history = await helpCenterApi.chat.history(savedSessionId)
          set({ messages: history.messages || [] })
        } catch {
          // Ignore history load errors
        }
      } else {
        // Start new session
        const result = await helpCenterApi.chat.start()
        const sessionId = result.sessionId
        if (sessionId) {
          set({ sessionId, isInitialized: true })
          if (typeof window !== 'undefined') {
            localStorage.setItem('helpcenter_session', sessionId)
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize session:', error)
      set({ isInitialized: true }) // Mark as initialized even on error
    }
  },

  // Send message
  sendMessage: async (text: string, broadcastToChannels = true) => {
    const state = get()
    if (!state.sessionId) {
      await get().initSession()
    }

    const sessionId = get().sessionId
    if (!sessionId) return

    try {
      set({ isLoading: true })
      
      // Add user message to local state immediately
      const userMessage: Message = { role: 'user', text, ts: Date.now(), status: 'sending' }
      set(state => ({ messages: [...state.messages, userMessage] }))

      // Send message
      const response = await helpCenterApi.chat.message(sessionId, text)
      
      // Update user message status
      set(state => ({
        messages: state.messages.map(m => 
          m.ts === userMessage.ts ? { ...m, status: 'sent' as const } : m
        )
      }))

      // Add assistant reply
      if (response.reply) {
        const assistantMessage: Message = { 
          role: 'assistant', 
          text: response.reply, 
          ts: Date.now(),
          status: 'sent'
        }
        set(state => ({ messages: [...state.messages, assistantMessage] }))
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Mark message as failed
      set(state => ({
        messages: state.messages.map(m => 
          m.text === text ? { ...m, status: 'failed' as const } : m
        )
      }))
    } finally {
      set({ isLoading: false })
    }
  },

  // Link channel
  linkChannel: async (channel: ChannelType, contact: string) => {
    const state = get()
    const sessionId = state.sessionId
    if (!sessionId) return { success: false, requiresVerification: false, error: 'No active session' }

    try {
      set({ isLinkingChannel: true })
      const result = await helpCenterApi.linkChannel(sessionId, channel, contact)
      
      if (result.ok && result.requiresVerification) {
        set({ 
          pendingVerification: { 
            channel: channel as 'whatsapp' | 'instagram', 
            contact 
          } 
        })
      }

      // Refresh channel status
      await get().refreshChannelStatus()

      return { 
        success: result.ok, 
        requiresVerification: result.requiresVerification,
        error: result.error 
      }
    } catch (error: any) {
      return { 
        success: false, 
        requiresVerification: false, 
        error: error?.message || 'Unknown error' 
      }
    } finally {
      set({ isLinkingChannel: false })
    }
  },

  // Verify channel
  verifyChannel: async (channel: 'whatsapp' | 'instagram', code: string) => {
    const state = get()
    const sessionId = state.sessionId
    if (!sessionId) return { success: false, error: 'No active session' }

    try {
      const result = await helpCenterApi.verifyContact(sessionId, channel, code)
      
      if (result.ok && result.verified) {
        set({ pendingVerification: null })
        await get().refreshChannelStatus()
        return { success: true }
      }

      return { success: false, error: result.error || 'Verification failed' }
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unknown error' }
    }
  },

  // Refresh channel status
  refreshChannelStatus: async () => {
    const state = get()
    const sessionId = state.sessionId
    if (!sessionId) return

    try {
      const result = await helpCenterApi.getChannelStatus(sessionId)
      if (result.ok && result.channels) {
        set({ linkedChannels: result.channels })
        
        // Update channel statuses
        const statuses: Record<string, 'connected' | 'disconnected'> = {}
        if (result.channels.whatsapp.linked && result.channels.whatsapp.verified) {
          statuses['whatsapp'] = 'connected'
        }
        if (result.channels.instagram.linked && result.channels.instagram.verified) {
          statuses['instagram'] = 'connected'
        }
        if (result.channels.email.linked) {
          statuses['email'] = 'connected'
        }
        set({ channelStatuses: statuses })
      }
    } catch (error) {
      console.error('Failed to refresh channel status:', error)
    }
  },

  // Switch channel
  switchChannel: (channel: 'web' | 'whatsapp' | 'instagram' | 'email') => {
    set({ activeChannel: channel })
  },

  // Toggle chat
  toggleChat: () => {
    set(state => ({ isChatOpen: !state.isChatOpen }))
  },

  // Set search query
  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  // Search knowledge base
  searchKnowledge: async (query: string) => {
    try {
      const results = await helpCenterApi.knowledge.search(null, query, 10)
      set({ searchResults: results })
    } catch (error) {
      console.error('Failed to search knowledge base:', error)
      set({ searchResults: { articles: [], faqs: [] } })
    }
  },

  // Select article
  selectArticle: (article: any) => {
    set({ selectedArticle: article })
  },

  // Reset
  reset: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('helpcenter_session')
    }
    set({
      sessionId: null,
      tenantId: null,
      isInitialized: false,
      messages: [],
      linkedChannels: null,
      channelStatuses: {},
      activeChannel: 'web',
      isChatOpen: false,
      pendingVerification: null,
      searchQuery: '',
      searchResults: { articles: [], faqs: [] },
      selectedArticle: null,
    })
  },
}))

