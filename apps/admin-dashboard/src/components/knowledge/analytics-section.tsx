'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, Eye, ThumbsUp, Star } from 'lucide-react'
import { motion } from 'framer-motion'

interface AnalyticsData {
  totals?: {
    totalViews: number
  }
  helpfulRate?: number
  trending?: Array<{
    id: string
    title: string
    views: number
  }>
}

interface AnalyticsSectionProps {
  analytics: AnalyticsData | null
  loading: boolean
}

export function AnalyticsSection({ analytics, loading }: AnalyticsSectionProps) {
  const t = useTranslations('knowledge')

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`
  }

  return (
    <Card className="shadow-xl bg-white/90 dark:bg-slate-900/90 rounded-2xl overflow-hidden border-slate-200/60 dark:border-slate-700/60">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-b border-slate-200/60 dark:border-slate-700/60">
        <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800 dark:text-slate-200">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
            <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          {t('analyticsOverview', { fallback: 'Analytics Overview' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3"></div>
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                ))}
              </div>
            </div>
          </div>
        ) : !analytics ? (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {t('noAnalytics', { fallback: 'No analytics data available' })}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/60 dark:border-blue-800/60"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                    {t('totalViews', { fallback: 'Total Views' })}
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatNumber(analytics.totals?.totalViews ?? 0)}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200/60 dark:border-green-800/60"
              >
                <div className="flex items-center gap-3 mb-2">
                  <ThumbsUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
                    {t('helpfulRate', { fallback: 'Helpful Rate' })}
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {formatPercentage(analytics.helpfulRate ?? 0)}
                </div>
              </motion.div>
            </div>

            {/* Trending Articles */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {t('trending', { fallback: 'Trending Articles' })}
                </h3>
              </div>
              
              {analytics.trending && analytics.trending.length > 0 ? (
                <div className="space-y-3">
                  {analytics.trending.slice(0, 5).map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                            {index + 1}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
                          {item.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                          {formatNumber(item.views)} views
                        </Badge>
                        <Star className="h-3 w-3 text-yellow-500" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <TrendingUp className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('noTrending', { fallback: 'No trending articles yet' })}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
