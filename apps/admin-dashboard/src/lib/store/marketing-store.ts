import { create } from 'zustand'
import { marketingApi, CampaignItem, RelatedTicket } from '@/lib/api/marketing-client'

interface MarketingState {
  campaigns: CampaignItem[]
  relatedTickets: Record<string, RelatedTicket[]>
  loading: boolean
  error?: string
  refresh: () => Promise<void>
  refreshTickets: () => Promise<void>
  fetchRelatedTickets: (id: string) => Promise<void>
  create: (payload: Record<string, unknown>) => Promise<void>
  update: (id: string, payload: Record<string, unknown>) => Promise<void>
  launch: (id: string) => Promise<void>
  schedule: (id: string, startDate: string) => Promise<void>
}

export const useMarketingStore = create<MarketingState>((set, get) => ({
  campaigns: [],
  relatedTickets: {},
  loading: false,
  error: undefined,
  async refresh() {
    set({ loading: true, error: undefined })
    try {
      const items = await marketingApi.list()
      set({ campaigns: items })
      // Optionally preload tickets for first few campaigns
      const firstFew = items.slice(0, 3)
      for (const item of firstFew) {
        void get().fetchRelatedTickets(item.id)
      }
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load campaigns' })
    } finally {
      set({ loading: false })
    }
  },
  async refreshTickets() {
    const { campaigns } = get()
    for (const campaign of campaigns) {
      await get().fetchRelatedTickets(campaign.id)
    }
  },
  async fetchRelatedTickets(id: string) {
    try {
      const tickets = await marketingApi.relatedTickets(id)
      set((state) => ({
        relatedTickets: { ...state.relatedTickets, [id]: tickets }
      }))
    } catch (e: any) {
      console.warn(`Failed to fetch tickets for campaign ${id}:`, e)
    }
  },
  async create(payload) {
    await marketingApi.create(payload)
    await get().refresh()
  },
  async update(id, payload) {
    await marketingApi.update(id, payload)
    await get().refresh()
  },
  async launch(id) {
    await marketingApi.launch(id)
    await get().refresh()
  },
  async schedule(id, startDate) {
    await marketingApi.schedule(id, startDate)
    await get().refresh()
  }
}))


