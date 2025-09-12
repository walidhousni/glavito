import { create } from 'zustand'
import { aiApi, type AIInsightsDTO, type AIRecentAnalysisDTO } from '@/lib/api/ai-client'

type Range = '24h' | '7d' | '30d' | '90d'

function rangeToDates(range: Range) {
  const now = new Date()
  let from: Date
  switch (range) {
    case '24h':
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case '30d':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case '7d':
    default:
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }
  return { from: from.toISOString(), to: now.toISOString() }
}

interface AIState {
  timeRange: Range
  insights?: AIInsightsDTO
  recent: AIRecentAnalysisDTO[]
  isLoading: boolean
  error: string | null

  setTimeRange: (r: Range) => void
  fetchAll: () => Promise<void>
  refetch: () => Promise<void>
}

export const useAIStore = create<AIState>((set, get) => ({
  timeRange: '7d',
  recent: [],
  isLoading: false,
  error: null,

  setTimeRange: (r) => set({ timeRange: r }),

  fetchAll: async () => {
    const range = get().timeRange
    const { from, to } = rangeToDates(range)
    set({ isLoading: true, error: null })
    try {
      const [insights, recent] = await Promise.all([
        aiApi.insights({ from, to }).catch(() => ({
          totalAnalyses: 0,
          averageConfidence: 0,
          modelsActive: 0,
          topIntents: [],
          sentimentTrends: [],
          performanceMetrics: { accuracy: 0, responseTime: 0, successRate: 0 },
        } as AIInsightsDTO)),
        aiApi.recentAnalyses(20).catch(() => []),
      ])
      set({ insights, recent, isLoading: false })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load AI insights', isLoading: false })
    }
  },

  refetch: async () => {
    await get().fetchAll()
  },
}))


