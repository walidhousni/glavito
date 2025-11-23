'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface ChartCardProps {
  title: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
  loading?: boolean
  icon?: React.ReactNode
}

export function ChartCard({
  title,
  description,
  children,
  actions,
  loading = false,
  icon
}: ChartCardProps) {
  if (loading) {
    return (
      <Card className="analytics-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              {description && <Skeleton className="h-4 w-64" />}
            </div>
            {actions && <Skeleton className="h-9 w-24" />}
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="analytics-card group">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {icon}
                </motion.div>
              )}
              <div>
                <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                {description && (
                  <CardDescription className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {description}
                  </CardDescription>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  )
}

