'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams, usePathname } from 'next/navigation'
import { useRouter } from '@/i18n.config'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAnalyticsStore, type AnalyticsType } from '@/lib/store/analytics-store'

const analyticsTypes: { value: AnalyticsType; labelKey: string }[] = [
  { value: 'overview', labelKey: 'overview' },
  { value: 'conversations', labelKey: 'conversations' },
  { value: 'sales', labelKey: 'sales' },
  { value: 'conversion', labelKey: 'conversion' },
  { value: 'campaign', labelKey: 'campaign' },
  { value: 'performance', labelKey: 'performance' },
  { value: 'calls', labelKey: 'calls' },
  { value: 'financial', labelKey: 'financial' },
  { value: 'predictive', labelKey: 'predictive' },
  { value: 'satisfaction', labelKey: 'satisfaction' },
  { value: 'reports', labelKey: 'reports' },
  { value: 'dashboards', labelKey: 'dashboards' },
]

interface AnalyticsTypeSelectorProps {
  className?: string
}

export function AnalyticsTypeSelector({ className }: AnalyticsTypeSelectorProps) {
  const t = useTranslations('analytics.types')
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { analyticsType, setAnalyticsType } = useAnalyticsStore()

  // Get type from URL query param or use store default
  const currentType = (searchParams.get('type') as AnalyticsType) || analyticsType || 'overview'

  const handleTypeChange = (newType: AnalyticsType) => {
    setAnalyticsType(newType)
    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString())
    params.set('type', newType)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className={`flex items-center gap-3 ${className || ''}`}>
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800/50 shadow-sm">
        <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 uppercase tracking-wider">
          Analytics
        </span>
      </div>
      <Select value={currentType} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[240px] h-11 rounded-xl border-2 border-border/50 hover:border-primary/50 transition-colors bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl shadow-sm hover:shadow-md">
          <SelectValue>
            {t(currentType, { fallback: analyticsTypes.find(t => t.value === currentType)?.labelKey || currentType })}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl">
          {analyticsTypes.map((type) => (
            <SelectItem 
              key={type.value} 
              value={type.value}
              className="rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer transition-colors"
            >
              {t(type.labelKey, { fallback: type.labelKey })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

