'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { ChartCard } from '@/components/analytics/core'
import { EmptyState } from '@/components/analytics/core'
import { TrendingUp } from 'lucide-react'

export function ConversionView() {
  const t = useTranslations('analytics')

  return (
    <div className="space-y-6">
      <ChartCard
        title="Conversion Rates"
        description="Track conversion rates across channels and funnels"
        loading={false}
      >
        <EmptyState
          icon={TrendingUp}
          title="No conversion data"
          description="Conversion analytics will be available soon"
        />
      </ChartCard>
    </div>
  )
}

