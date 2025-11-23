'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FaFileAlt, 
  FaClock, 
  FaEye, 
  FaChartLine 
} from 'react-icons/fa'

interface Article {
  id: string
  title: string
  snippet: string
  views?: number
  helpful?: number
  updatedAt?: string
  tags?: string[]
}

interface ArticlesSectionProps {
  articles: Article[]
  loading: boolean
  onArticleClick?: (article: Article) => void
}

export function ArticlesSection({ articles, loading, onArticleClick }: ArticlesSectionProps) {
  const t = useTranslations('knowledge')

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString()
  }

  const formatViews = (views?: number) => {
    if (!views) return '0'
    if (views >= 1000) return `${(views / 1000).toFixed(1)}k`
    return views.toString()
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50">
            <FaFileAlt className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          {t('articles', { fallback: 'Articles' })}
          <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0 shadow-sm">
            {articles.length}
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
                <div className="h-2.5 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 w-fit mx-auto mb-3">
              <FaFileAlt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('noArticles', { fallback: 'No articles found' })}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article) => (
              <div
                key={article.id}
                className="group p-3 rounded-lg border-0 shadow-sm hover:shadow-md transition-all cursor-pointer bg-muted/30 hover:bg-muted/50"
                onClick={() => onArticleClick?.(article)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xs font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 flex-1">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-2 ml-2">
                    {article.views && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <FaEye className="h-2.5 w-2.5" />
                        {formatViews(article.views)}
                      </div>
                    )}
                    {article.helpful && (
                      <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                        <FaChartLine className="h-2.5 w-2.5" />
                        {article.helpful}%
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {article.snippet}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    {article.updatedAt && (
                      <div className="flex items-center gap-1">
                        <FaClock className="h-2.5 w-2.5" />
                        {formatDate(article.updatedAt)}
                      </div>
                    )}
                  </div>
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      {article.tags.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] h-4 px-1.5 border-0 shadow-sm"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {article.tags.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{article.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
