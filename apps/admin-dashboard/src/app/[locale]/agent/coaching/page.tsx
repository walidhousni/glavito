'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store/auth-store'
import { aiApi } from '@/lib/api/ai-client'

export default function AgentCoachingPage() {
  const { user } = useAuthStore()
  const [recent, setRecent] = React.useState<any[]>([])
  const [trends, setTrends] = React.useState<{ byDay: Array<{ date: string; clarityScore?: number; fillerWordRate?: number; sentimentBalance?: number }>; totals: { count: number; avgClarity?: number; avgFillerRate?: number; avgSentimentBalance?: number } } | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)

  React.useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          setLoading(true)
          const [recentItems, trendsData] = await Promise.all([
            aiApi.recentAnalyses?.(20, user?.id).catch(() => [] as any[]),
            aiApi.coachingTrends?.().catch(() => null as any)
          ])
          if (!cancelled) {
            setRecent(Array.isArray(recentItems) ? recentItems : [])
            setTrends((trendsData as any)?.data || trendsData || null)
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    return () => { cancelled = true }
  }, [user?.id])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Coaching</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Analyses</div>
          <div className="text-2xl font-bold">{trends?.totals?.count || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Avg Clarity</div>
          <div className="text-2xl font-bold">{typeof trends?.totals?.avgClarity === 'number' ? Math.round((trends?.totals?.avgClarity || 0) * 100) + '%' : '-'}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Avg Sentiment</div>
          <div className="text-2xl font-bold">{typeof trends?.totals?.avgSentimentBalance === 'number' ? Math.round((trends?.totals?.avgSentimentBalance || 0) * 100) + '%' : '-'}</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">Recent Coaching Analyses</div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-2">
            {recent.slice(0, 10).map((it) => (
              <div key={it.id} className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <div className="text-sm font-medium">{new Date(it.createdAt).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">confidence {(Number(it.confidence || 0) * 100).toFixed(0)}%</div>
                </div>
                <Button variant="outline" size="sm">Open</Button>
              </div>
            ))}
            {recent.length === 0 && (
              <div className="text-sm text-muted-foreground">No items</div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}


