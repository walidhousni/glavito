'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FaWrench, 
  FaClock, 
  FaExclamationTriangle, 
  FaCheckCircle 
} from 'react-icons/fa'

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
    if (!helpfulRate || !views) return FaClock
    
    if (helpfulRate < 0.1 && views > 20) return FaExclamationTriangle
    if (helpfulRate < 0.2 && views > 10) return FaClock
    return FaCheckCircle
  }

  const getPriorityBadge = (helpfulRate?: number, views?: number) => {
    if (!helpfulRate || !views) return { variant: 'secondary' as const, text: 'Unknown' }
    
    if (helpfulRate < 0.1 && views > 20) return { variant: 'destructive' as const, text: 'Critical' }
    if (helpfulRate < 0.2 && views > 10) return { variant: 'secondary' as const, text: 'Review' }
    return { variant: 'default' as const, text: 'Good' }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/50">
            <FaWrench className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
          </div>
          {t('maintenance', { fallback: 'Maintenance' })}
          {loading && (
            <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 border-0 shadow-sm">
              {t('loading', { fallback: 'Loading...' })}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-2.5 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-muted rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/50 w-fit mx-auto mb-3">
              <FaCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('noMaintenance', { fallback: 'No maintenance needed' })}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {t('allArticlesUpToDate', { fallback: 'All articles are up to date' })}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const PriorityIcon = getPriorityIcon(item.helpfulRate, item.views)
              const priority = getPriorityBadge(item.helpfulRate, item.views)
              
              return (
                <div
                  key={item.id}
                  className="group p-3 rounded-lg border-0 shadow-sm bg-muted/30 hover:bg-muted/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-xs font-semibold text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors mb-1">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <FaClock className="h-2.5 w-2.5" />
                          {formatDate(item.updatedAt)}
                        </div>
                        {item.helpfulRate && (
                          <span className={getPriorityColor(item.helpfulRate, item.views)}>
                            {Math.round(item.helpfulRate * 100)}% helpful
                          </span>
                        )}
                        {item.views && (
                          <span className="text-muted-foreground">
                            {item.views} views
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-2">
                      <Badge
                        variant={priority.variant}
                        className={`text-[10px] h-4 px-1.5 border-0 shadow-sm ${
                          priority.variant === 'destructive'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            : priority.variant === 'secondary'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        }`}
                      >
                        <PriorityIcon className="h-2.5 w-2.5 mr-1" />
                        {priority.text}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="text-[10px] text-muted-foreground">
                      {t('lastUpdated', { fallback: 'Last updated' })}: {formatDate(item.updatedAt)}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMarkReviewed(item.id)}
                      className="h-7 text-[10px] border-0 shadow-sm"
                    >
                      <FaCheckCircle className="h-2.5 w-2.5 mr-1" />
                      {t('markReviewed', { fallback: 'Mark Reviewed' })}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
