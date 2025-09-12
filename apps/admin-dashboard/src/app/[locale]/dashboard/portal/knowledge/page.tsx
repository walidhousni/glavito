'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { publicKnowledgeApi } from '@/lib/api/public-knowledge-client'
import { Label } from '@/components/ui/label'

export default function PortalKnowledgePreviewPage() {
  const t = useTranslations()
  const [q, setQ] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [data, setData] = useState<{ articles: Array<{ id: string; title: string; snippet: string }>; faqs: Array<{ id: string; question: string; answer: string }> }>({ articles: [], faqs: [] })
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<{ id: string; title: string; content: string } | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.host.toLowerCase()
      const noPort = host.split(':')[0]
      // Attempt to auto-fill via current authenticated tenant id stored in localStorage/session (if present)
      try {
        const authRaw = localStorage.getItem('auth') || sessionStorage.getItem('auth')
        if (authRaw && !tenantId) {
          const parsed = JSON.parse(authRaw)
          const tid = parsed?.tenant?.id || parsed?.user?.tenantId
          if (tid && typeof tid === 'string') setTenantId(tid)
        }
      } catch { /* no-op */ }
      // Optionally also set a header-based hint (axios config already includes Accept-Language)
      // If tenants use subdomains, we can hint the tenant host for backend auto-derive via header
      // This page uses the public endpoints, so we rely on server-side host sniffing.
    }
  }, [tenantId])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!tenantId) return
      setLoading(true)
      try {
        const res = await publicKnowledgeApi.search(tenantId || null, q, 10)
        if (!cancelled) setData(res)
      } catch {
        if (!cancelled) setData({ articles: [], faqs: [] })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [tenantId, q])

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Tenant ID</Label>
          <Input placeholder="tenantId" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label>{t('knowledge.searchPlaceholder') || 'Search...'}</Label>
          <Input placeholder={t('knowledge.searchPlaceholder') || 'Search...'} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('knowledge.articles') || 'Articles'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <div className="text-sm text-muted-foreground">{t('common.loading') || 'Loading...'}</div>}
            {!loading && ((data?.articles?.length ?? 0) === 0) && (
              <div className="text-sm text-muted-foreground">{t('knowledge.noResults') || 'No results'}</div>
            )}
            {(data?.articles || []).map((a) => (
              <div key={a.id} className="p-3 rounded border hover-card cursor-pointer" onClick={async () => {
                try {
                  const full = await publicKnowledgeApi.getArticle(tenantId || null, a.id)
                  setSelected(full)
                } catch {
                  /* ignore */
                }
              }}>
                <div className="font-medium">{a.title}</div>
                <div className="text-sm text-muted-foreground">{a.snippet}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('knowledge.faqs') || 'FAQs'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <div className="text-sm text-muted-foreground">{t('common.loading') || 'Loading...'}</div>}
            {!loading && ((data?.faqs?.length ?? 0) === 0) && (
              <div className="text-sm text-muted-foreground">{t('knowledge.noResults') || 'No results'}</div>
            )}
            {(data?.faqs || []).map((f) => (
              <div key={f.id} className="p-3 rounded border hover-card">
                <div className="font-medium">{f.question}</div>
                <div className="text-sm text-muted-foreground">{f.answer}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>{selected.title || 'Article'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="kb-prose" dangerouslySetInnerHTML={{ __html: String(selected.content || '') }} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}


