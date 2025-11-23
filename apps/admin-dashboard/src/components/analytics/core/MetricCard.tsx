'use client'

import React from 'react'
import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface MetricCardProps {
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

const colorClasses = {
  blue: {
    gradient: 'from-blue-500 to-blue-600',
    bg: 'from-blue-500/10 via-blue-500/5 to-transparent',
    text: 'text-blue-600 dark:text-blue-400',
    glow: 'shadow-blue-500/20'
  },
  green: {
    gradient: 'from-green-500 to-green-600',
    bg: 'from-green-500/10 via-green-500/5 to-transparent',
    text: 'text-green-600 dark:text-green-400',
    glow: 'shadow-green-500/20'
  },
  purple: {
    gradient: 'from-purple-500 to-purple-600',
    bg: 'from-purple-500/10 via-purple-500/5 to-transparent',
    text: 'text-purple-600 dark:text-purple-400',
    glow: 'shadow-purple-500/20'
  },
  orange: {
    gradient: 'from-orange-500 to-orange-600',
    bg: 'from-orange-500/10 via-orange-500/5 to-transparent',
    text: 'text-orange-600 dark:text-orange-400',
    glow: 'shadow-orange-500/20'
  },
  red: {
    gradient: 'from-red-500 to-red-600',
    bg: 'from-red-500/10 via-red-500/5 to-transparent',
    text: 'text-red-600 dark:text-red-400',
    glow: 'shadow-red-500/20'
  },
  pink: {
    gradient: 'from-pink-500 to-pink-600',
    bg: 'from-pink-500/10 via-pink-500/5 to-transparent',
    text: 'text-pink-600 dark:text-pink-400',
    glow: 'shadow-pink-500/20'
  }
}

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus
}

const trendColors = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  stable: 'text-slate-600 dark:text-slate-400'
}

export function MetricCard({
  title,
  value,
  change,
  trend = 'stable',
  icon: Icon,
  color = 'blue',
  loading = false,
  sparklineData,
  subtitle,
  prefix = '',
  suffix = ''
}: MetricCardProps) {
  const colors = colorClasses[color]
  const TrendIcon = trendIcons[trend]
  const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0

  if (loading) {
    return (
      <Card className="agent-metric-card overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="text-right space-y-2">
              <Skeleton className="h-8 w-24 ml-auto" />
              <Skeleton className="h-4 w-32 ml-auto" />
            </div>
          </div>
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02, translateY: -2 }}
    >
      <Card className={`agent-metric-card overflow-hidden border-0 shadow-lg hover:shadow-xl ${colors.glow} transition-all duration-300`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-50`} />
        <CardContent className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            {/* Icon */}
            <motion.div
              className={`p-3 rounded-xl bg-gradient-to-br ${colors.gradient} shadow-lg`}
              whileHover={{ rotate: 5, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Icon className="h-6 w-6 text-white" />
            </motion.div>

            {/* Value */}
            <div className="text-right">
              <motion.div 
                className="text-3xl font-bold text-slate-900 dark:text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {prefix}
                {typeof value === 'number' && !isNaN(numValue) ? (
                  <CountUp 
                    end={numValue} 
                    duration={1}
                    separator=","
                    decimals={value % 1 !== 0 ? 1 : 0}
                  />
                ) : (
                  value
                )}
                {suffix}
              </motion.div>
              {subtitle && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {title}
            </div>
          </div>

          {/* Trend Indicator */}
          {change && (
            <motion.div 
              className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <TrendIcon className={`h-4 w-4 ${trendColors[trend]}`} />
              <span className={`text-sm font-medium ${trendColors[trend]}`}>
                {change}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                vs last period
              </span>
            </motion.div>
          )}

          {/* Sparkline (Simple visualization) */}
          {sparklineData && sparklineData.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-end gap-1 h-8">
                {sparklineData.map((val, idx) => {
                  const max = Math.max(...sparklineData)
                  const height = max > 0 ? (val / max) * 100 : 0
                  return (
                    <motion.div
                      key={idx}
                      className={`flex-1 bg-gradient-to-t ${colors.gradient} rounded-t opacity-70`}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

