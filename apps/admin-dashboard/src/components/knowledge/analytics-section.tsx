'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FaChartBar, 
  FaChartLine, 
  FaEye, 
  FaThumbsUp, 
  FaStar 
} from 'react-icons/fa'

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
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50">
            <FaChartBar className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          {t('analyticsOverview', { fallback: 'Analytics Overview' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-2.5 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </div>
              ))}
            </div>
            <div className="animate-pulse">
              <div className="h-2.5 bg-muted rounded w-1/3 mb-2"></div>
              <div className="space-y-1.5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-2.5 bg-muted rounded w-full"></div>
                ))}
              </div>
            </div>
          </div>
        ) : !analytics ? (
          <div className="text-center py-8">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 w-fit mx-auto mb-3">
              <FaChartBar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('noAnalytics', { fallback: 'No analytics data available' })}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border-0 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <FaEye className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                    {t('totalViews', { fallback: 'Total Views' })}
                  </span>
                </div>
                <div className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  {formatNumber(analytics.totals?.totalViews ?? 0)}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border-0 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <FaThumbsUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-[10px] font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
                    {t('helpfulRate', { fallback: 'Helpful Rate' })}
                  </span>
                </div>
                <div className="text-lg font-semibold text-green-900 dark:text-green-100">
                  {formatPercentage(analytics.helpfulRate ?? 0)}
                </div>
              </div>
            </div>

            {/* Trending Articles */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FaChartLine className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-xs font-semibold text-foreground">
                  {t('trending', { fallback: 'Trending Articles' })}
                </h3>
              </div>
              
              {analytics.trending && analytics.trending.length > 0 ? (
                <div className="space-y-2">
                  {analytics.trending.slice(0, 5).map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border-0 shadow-sm hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-5 h-5 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                            {index + 1}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-foreground line-clamp-1">
                          {item.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-0 shadow-sm">
                          {formatNumber(item.views)} views
                        </Badge>
                        <FaStar className="h-2.5 w-2.5 text-yellow-500" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FaChartLine className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {t('noTrending', { fallback: 'No trending articles yet' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
