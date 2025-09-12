'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { useKnowledgeStore } from '@/lib/store/knowledge-store'

export default function AgentKnowledgePage() {
  const t = useTranslations()
  const { q, setQuery, semantic, setSemantic, search, searchLoading, result } = useKnowledgeStore()

  React.useEffect(() => { search() }, [q, semantic, search])

  const articles = Array.isArray(result.articles) ? result.articles : []
  const faqs = Array.isArray(result.faqs) ? result.faqs : []

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Input placeholder={t('knowledge.searchPlaceholder') || 'Search...'} value={q} onChange={(e) => setQuery(e.target.value)} />
        <label className="text-sm text-muted-foreground">
          <input type="checkbox" checked={semantic} onChange={(e) => setSemantic(e.target.checked)} className="mr-2" />
          Semantic
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('knowledge.articles') || 'Articles'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {searchLoading && <div className="text-sm text-muted-foreground">{t('common.loading') || 'Loading...'}</div>}
            {!searchLoading && articles.length === 0 && (
              <div className="text-sm text-muted-foreground">{t('knowledge.noResults') || 'No results'}</div>
            )}
            {articles.map((a) => (
              <div key={a.id} className="p-3 rounded border hover-card">
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
            {searchLoading && <div className="text-sm text-muted-foreground">{t('common.loading') || 'Loading...'}</div>}
            {!searchLoading && faqs.length === 0 && (
              <div className="text-sm text-muted-foreground">{t('knowledge.noResults') || 'No results'}</div>
            )}
            {faqs.map((a) => (
              <div key={a.id} className="p-3 rounded border hover-card">
                <div className="font-medium">{a.question}</div>
                <div className="text-sm text-muted-foreground">{a.answer}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


