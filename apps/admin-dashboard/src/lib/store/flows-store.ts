import { create } from 'zustand'

export interface FlowsState {
  flows: any[]
  loading: boolean
  error: string | null
  fetch: (tenantId?: string) => Promise<void>
}

export const useFlowsStore = create<FlowsState>((set) => ({
  flows: [],
  loading: false,
  error: null,
  fetch: async (tenantId?: string) => {
    set({ loading: true, error: null })
    try {
      // Stub implementation - replace with actual API call
      set({ flows: [], loading: false })
    } catch (error: any) {
      set({ error: error?.message || 'Failed to fetch flows', loading: false })
    }
  },
}))
