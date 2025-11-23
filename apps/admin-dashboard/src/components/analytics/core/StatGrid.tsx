'use client'

import React from 'react'
import { MetricCard } from './MetricCard'
import { LucideIcon } from 'lucide-react'

export interface StatGridMetric {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'stable'
  icon: LucideIcon
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink'
  loading?: boolean
  sparklineData?: number[]
  subtitle?: string
  prefix?: string
  suffix?: string
}

interface StatGridProps {
  metrics: StatGridMetric[]
  columns?: 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
}

const gapClasses = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6'
}

const columnClasses = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
}

export function StatGrid({ 
  metrics, 
  columns = 4, 
  gap = 'md' 
}: StatGridProps) {
  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]}`}>
      {metrics.map((metric, index) => (
        <MetricCard key={`${metric.title}-${index}`} {...metric} />
      ))}
    </div>
  )
}

