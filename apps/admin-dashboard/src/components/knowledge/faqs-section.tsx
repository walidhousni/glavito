'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HelpCircle, Edit, Eye, EyeOff, Link, MoreHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'
import { knowledgeApi } from '@/lib/api/knowledge-client'

interface FAQ {
  id: string
  title: string
  updatedAt: string
  isPublished: boolean
  tags?: string[]
}

interface RelatedArticle {
  id: string
  title: string
  snippet: string
}

interface FAQsSectionProps {
  faqs: FAQ[]
  loading: boolean
  expandedRelated: Record<string, RelatedArticle[] | undefined>
  onEdit: (faq: FAQ) => void
  onPublishToggle: (id: string, published: boolean) => Promise<void>
  onToggleRelated: (id: string) => void
}

export function FAQsSection({
  faqs,
  loading,
  expandedRelated,
  onEdit,
  onPublishToggle,
  onToggleRelated
}: FAQsSectionProps) {
  const t = useTranslations('knowledge')

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleEdit = async (faq: FAQ) => {
    try {
      const full = await knowledgeApi.getArticle(faq.id)
      onEdit({
        id: faq.id,
        title: full.title,
        content: (full as unknown as { content?: string }).content || '',
        tags: (faq.tags || []).join(',')
      })
    } catch {
      onEdit({
        id: faq.id,
        title: faq.title,
        content: '',
        tags: (faq.tags || []).join(',')
      })
    }
  }

  return (
    <Card className="shadow-xl bg-white/90 dark:bg-slate-900/90 rounded-2xl overflow-hidden border-slate-200/60 dark:border-slate-700/60">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-b border-slate-200/60 dark:border-slate-700/60">
        <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800 dark:text-slate-200">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
            <HelpCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          {t('faqs', { fallback: 'FAQs' })}
          <Badge variant="secondary" className="ml-auto bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
            {faqs.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {t('noFaqs', { fallback: 'No FAQs found' })}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group p-5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 hover:border-emerald-300/60 dark:hover:border-emerald-600/60 hover:shadow-lg transition-all duration-300 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mb-2">
                      {faq.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>{formatDate(faq.updatedAt)}</span>
                      {faq.tags && faq.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {faq.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge
                      variant={faq.isPublished ? 'default' : 'secondary'}
                      className={`${
                        faq.isPublished
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {faq.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </div>

                {expandedRelated[faq.id] && expandedRelated[faq.id]!.length > 0 && (
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Related Articles:</h4>
                    <div className="space-y-2">
                      {expandedRelated[faq.id]!.map((related) => (
                        <div key={related.id} className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                          <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                          <span className="line-clamp-1">{related.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPublishToggle(faq.id, !faq.isPublished)}
                    className="h-8 text-xs border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {faq.isPublished ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                    {faq.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEdit(faq)}
                    className="h-8 text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleRelated(faq.id)}
                    className="h-8 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Link className="h-3 w-3 mr-1" />
                    Related
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
