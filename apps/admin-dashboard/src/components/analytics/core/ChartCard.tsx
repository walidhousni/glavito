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
      <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-border/50 shadow-lg">
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
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <Card className="group bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-border/50 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all duration-300">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <motion.div
                  className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 shadow-lg shadow-blue-500/30"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {icon}
                </motion.div>
              )}
              <div>
                <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {title}
                </CardTitle>
                {description && (
                  <CardDescription className="text-sm text-muted-foreground mt-1">
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
          <div className="rounded-xl bg-gradient-to-br from-slate-50/50 to-slate-100/50 dark:from-slate-800/30 dark:to-slate-900/30 p-4">
            {children}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

