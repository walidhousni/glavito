import { create } from 'zustand'
import { marketingApi, CampaignItem } from '@/lib/api/marketing-client'

interface MarketingState {
  campaigns: CampaignItem[]
  loading: boolean
  error?: string
  refresh: () => Promise<void>
  create: (payload: Record<string, unknown>) => Promise<void>
  update: (id: string, payload: Record<string, unknown>) => Promise<void>
  launch: (id: string) => Promise<void>
  schedule: (id: string, startDate: string) => Promise<void>
}

export const useMarketingStore = create<MarketingState>((set, get) => ({
  campaigns: [],
  loading: false,
  async refresh() {
    set({ loading: true, error: undefined })
    try {
      const items = await marketingApi.list()
      set({ campaigns: items })
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load campaigns' })
    } finally {
      set({ loading: false })
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


