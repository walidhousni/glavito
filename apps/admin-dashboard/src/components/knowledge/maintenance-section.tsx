'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wrench, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { motion } from 'framer-motion'

interface MaintenanceItem {
  id: string
  title: string
  updatedAt: string
  helpfulRate?: number
  views?: number
}

interface MaintenanceSectionProps {
  items: MaintenanceItem[]
  loading: boolean
  onMarkReviewed: (id: string) => Promise<void>
}

export function MaintenanceSection({ items, loading, onMarkReviewed }: MaintenanceSectionProps) {
  const t = useTranslations('knowledge')

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getPriorityColor = (helpfulRate?: number, views?: number) => {
    if (!helpfulRate || !views) return 'text-slate-500 dark:text-slate-400'
    
    if (helpfulRate < 0.1 && views > 20) return 'text-red-600 dark:text-red-400'
    if (helpfulRate < 0.2 && views > 10) return 'text-amber-600 dark:text-amber-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getPriorityIcon = (helpfulRate?: number, views?: number) => {
    if (!helpfulRate || !views) return Clock
    
    if (helpfulRate < 0.1 && views > 20) return AlertTriangle
    if (helpfulRate < 0.2 && views > 10) return Clock
    return CheckCircle
  }

  const getPriorityBadge = (helpfulRate?: number, views?: number) => {
    if (!helpfulRate || !views) return { variant: 'secondary' as const, text: 'Unknown' }
    
    if (helpfulRate < 0.1 && views > 20) return { variant: 'destructive' as const, text: 'Critical' }
    if (helpfulRate < 0.2 && views > 10) return { variant: 'secondary' as const, text: 'Review' }
    return { variant: 'default' as const, text: 'Good' }
  }

  return (
    <Card className="shadow-xl bg-white/90 dark:bg-slate-900/90 rounded-2xl overflow-hidden border-slate-200/60 dark:border-slate-700/60">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-b border-slate-200/60 dark:border-slate-700/60">
        <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800 dark:text-slate-200">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
            <Wrench className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          {t('maintenance', { fallback: 'Maintenance' })}
          {loading && (
            <Badge variant="secondary" className="ml-auto bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              {t('loading', { fallback: 'Loading...' })}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-3"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-400 dark:text-green-500 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {t('noMaintenance', { fallback: 'No maintenance needed' })}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {t('allArticlesUpToDate', { fallback: 'All articles are up to date' })}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => {
              const PriorityIcon = getPriorityIcon(item.helpfulRate, item.views)
              const priority = getPriorityBadge(item.helpfulRate, item.views)
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60 hover:border-amber-300/60 dark:hover:border-amber-600/60 hover:shadow-lg transition-all duration-300 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors mb-2">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.updatedAt)}
                        </div>
                        {item.helpfulRate && (
                          <span className={getPriorityColor(item.helpfulRate, item.views)}>
                            {Math.round(item.helpfulRate * 100)}% helpful
                          </span>
                        )}
                        {item.views && (
                          <span className="text-slate-500 dark:text-slate-400">
                            {item.views} views
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge
                        variant={priority.variant}
                        className={`${
                          priority.variant === 'destructive'
                            ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                            : priority.variant === 'secondary'
                            ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                            : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                        }`}
                      >
                        <PriorityIcon className="h-3 w-3 mr-1" />
                        {priority.text}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t('lastUpdated', { fallback: 'Last updated' })}: {formatDate(item.updatedAt)}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMarkReviewed(item.id)}
                      className="h-8 text-xs border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-300"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {t('markReviewed', { fallback: 'Mark Reviewed' })}
                    </Button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
