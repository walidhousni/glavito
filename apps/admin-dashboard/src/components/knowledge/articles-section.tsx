'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Clock, Eye, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

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
    <Card className="shadow-xl bg-white/90 dark:bg-slate-900/90 rounded-2xl overflow-hidden border-slate-200/60 dark:border-slate-700/60">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-slate-200/60 dark:border-slate-700/60">
        <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800 dark:text-slate-200">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          {t('articles', { fallback: 'Articles' })}
          <Badge variant="secondary" className="ml-auto bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
            {articles.length}
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
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {t('noArticles', { fallback: 'No articles found' })}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article, index) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-300/60 dark:hover:border-blue-600/60 hover:shadow-lg transition-all duration-300 cursor-pointer bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800"
                onClick={() => onArticleClick?.(article)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-2 ml-4">
                    {article.views && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Eye className="h-3 w-3" />
                        {formatViews(article.views)}
                      </div>
                    )}
                    {article.helpful && (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <TrendingUp className="h-3 w-3" />
                        {article.helpful}%
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                  {article.snippet}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    {article.updatedAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
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
                          className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {article.tags.length > 2 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          +{article.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
