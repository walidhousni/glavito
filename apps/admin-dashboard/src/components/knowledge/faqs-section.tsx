'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FaQuestionCircle, 
  FaEdit, 
  FaEye, 
  FaEyeSlash, 
  FaLink 
} from 'react-icons/fa'
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
        tags: faq.tags || []
      } as any)
    } catch {
      onEdit({
        id: faq.id,
        title: faq.title,
        content: '',
        tags: faq.tags || []
      } as any)
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <div className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950/50">
            <FaQuestionCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          </div>
          {t('faqs', { fallback: 'FAQs' })}
          <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0 shadow-sm">
            {faqs.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-2.5 bg-muted rounded w-full mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/50 w-fit mx-auto mb-3">
              <FaQuestionCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('noFaqs', { fallback: 'No FAQs found' })}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.id}
                className="group p-3 rounded-lg border-0 shadow-sm bg-muted/30 hover:bg-muted/50 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-xs font-semibold text-foreground group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors mb-1">
                      {faq.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{formatDate(faq.updatedAt)}</span>
                      {faq.tags && faq.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {faq.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-[10px] h-4 px-1.5 border-0 shadow-sm"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-2">
                    <Badge
                      variant={faq.isPublished ? 'default' : 'secondary'}
                      className={`text-[10px] h-4 px-1.5 border-0 shadow-sm ${
                        faq.isPublished
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {faq.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </div>

                {expandedRelated[faq.id] && expandedRelated[faq.id]!.length > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-muted/50 border-0 shadow-sm">
                    <h4 className="text-[10px] font-medium text-foreground mb-1.5">Related Articles:</h4>
                    <div className="space-y-1">
                      {expandedRelated[faq.id]!.map((related) => (
                        <div key={related.id} className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                          <span className="line-clamp-1">{related.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPublishToggle(faq.id, !faq.isPublished)}
                    className="h-7 text-[10px] border-0 shadow-sm"
                  >
                    {faq.isPublished ? <FaEyeSlash className="h-2.5 w-2.5 mr-1" /> : <FaEye className="h-2.5 w-2.5 mr-1" />}
                    {faq.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEdit(faq)}
                    className="h-7 text-[10px] border-0 shadow-sm"
                  >
                    <FaEdit className="h-2.5 w-2.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleRelated(faq.id)}
                    className="h-7 text-[10px] border-0 shadow-sm"
                  >
                    <FaLink className="h-2.5 w-2.5 mr-1" />
                    Related
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
