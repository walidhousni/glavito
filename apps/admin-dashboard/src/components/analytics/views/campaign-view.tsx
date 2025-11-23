'use client'

import React from 'react'
import { ChartCard } from '@/components/analytics/core'
import { EmptyState } from '@/components/analytics/core'
import { Target } from 'lucide-react'

export function CampaignView() {
  return (
    <div className="space-y-6">
      <ChartCard
        title="Campaign Analytics"
        description="Track marketing campaign performance and engagement"
        loading={false}
      >
        <EmptyState
          icon={Target}
          title="No campaign data"
          description="Campaign analytics will be available soon"
        />
      </ChartCard>
    </div>
  )
}

