'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { knowledgeApi } from '@/lib/api/knowledge-client'
import { useKnowledgeStore } from '@/lib/store/knowledge-store'
import { KnowledgeHeader } from '@/components/knowledge/knowledge-header'
import { ArticlesSection } from '@/components/knowledge/articles-section'
import { FAQsSection } from '@/components/knowledge/faqs-section'
import { AnalyticsSection } from '@/components/knowledge/analytics-section'
import { MaintenanceSection } from '@/components/knowledge/maintenance-section'
import { ArticleEditor } from '@/components/knowledge/article-editor'

export default function KnowledgePage() {
  const { q, semantic, searchLoading, result, authorItems, authorLoading, analytics, outdated, maintLoading, setQuery, setSemantic, search, loadAuthoring, publishToggle, loadAnalytics, loadOutdated, markReviewed } = useKnowledgeStore()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<{ id?: string; title: string; content: string; tags: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedRelated, setExpandedRelated] = useState<Record<string, { id: string; title: string; snippet: string }[] | undefined>>({})
  const params = useSearchParams()

  useEffect(() => { search() }, [q, semantic, search])

  useEffect(() => {
    const articleId = params.get('articleId')
    const faqId = params.get('faqId')
    if (articleId) setQuery(articleId)
    else if (faqId) setQuery(faqId)
  }, [params, setQuery])

  // Load authoring list
  useEffect(() => { loadAuthoring() }, [q, loadAuthoring])

  // Analytics & Maintenance
  useEffect(() => { loadAnalytics(30) }, [loadAnalytics])

  useEffect(() => { loadOutdated({ thresholdDays: 90, minHelpfulRate: 0.1, minViews: 20 }) }, [loadOutdated])

  const handleCreateArticle = () => {
            setEditing({ id: undefined, title: '', content: '', tags: '' })
            setEditorOpen(true)
  }

  const handleEditArticle = (article: { id: string; title: string; tags?: string[] }) => {
    setEditing({
      id: article.id,
      title: article.title,
      content: '',
      tags: (article.tags || []).join(',')
    })
                    setEditorOpen(true)
  }

  const handleSaveArticle = async () => {
                if (!editing) return
                setSaving(true)
                try {
                  const tags = editing.tags.split(',').map(t => t.trim()).filter(Boolean)
                  if (editing.id) {
                    await knowledgeApi.updateArticle(editing.id, { title: editing.title, content: editing.content, tags })
                  } else {
                    await knowledgeApi.createArticle({ title: editing.title, content: editing.content, tags, publish: false })
                  }
                  await loadAuthoring()
                  setEditorOpen(false)
                } catch {
                  // ignore
                } finally {
                  setSaving(false)
                }
  }

  const handleUpdateEditing = (updates: Partial<{ title: string; content: string; tags: string }>) => {
    if (editing) {
      setEditing({ ...editing, ...updates })
    }
  }

  const handleToggleRelated = async (id: string) => {
    if (expandedRelated[id]) {
      const copy = { ...expandedRelated }
      delete copy[id]
      setExpandedRelated(copy)
      return
    }
    try {
      const rel = await knowledgeApi.related(id)
      setExpandedRelated(prev => ({ ...prev, [id]: rel }))
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <KnowledgeHeader
        query={q}
        semantic={semantic}
        onQueryChange={setQuery}
        onSemanticChange={setSemantic}
        onCreateArticle={handleCreateArticle}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ArticlesSection
          articles={Array.isArray(result.articles) ? result.articles : []}
          loading={searchLoading}
          onArticleClick={handleEditArticle}
        />
        <FAQsSection
          faqs={Array.isArray(authorItems) ? authorItems : []}
          loading={authorLoading}
          expandedRelated={expandedRelated}
          onEdit={handleEditArticle}
          onPublishToggle={publishToggle}
          onToggleRelated={handleToggleRelated}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalyticsSection
          analytics={analytics}
          loading={!analytics}
        />
        <MaintenanceSection
          items={Array.isArray(outdated) ? outdated : []}
          loading={maintLoading}
          onMarkReviewed={markReviewed}
        />
      </div>

      <ArticleEditor
        isOpen={editorOpen}
        editing={editing}
        saving={saving}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveArticle}
        onUpdate={handleUpdateEditing}
      />
    </div>
  )
}


