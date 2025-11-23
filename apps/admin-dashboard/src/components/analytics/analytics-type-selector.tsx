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
      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        ANALYTICS
      </span>
      <Select value={currentType} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue>
            {t(currentType, { fallback: analyticsTypes.find(t => t.value === currentType)?.labelKey || currentType })}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {analyticsTypes.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {t(type.labelKey, { fallback: type.labelKey })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

