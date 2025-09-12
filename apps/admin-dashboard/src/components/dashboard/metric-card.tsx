'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple';
  loading?: boolean;
  delay?: number;
}

const colorVariants = {
  blue: {
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-600 dark:text-green-400',
  },
  orange: {
    gradient: 'from-orange-500 to-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-600 dark:text-orange-400',
  },
  purple: {
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-600 dark:text-purple-400',
  },
};

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  color,
  loading = false,
  delay = 0,
}: MetricCardProps) {
  const t = useTranslations('metricCard');
  const variant = colorVariants[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ 
        y: -6, 
        scale: 1.02,
        transition: { duration: 0.2 } 
      }}
    >
      <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 group rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wide">
                {title}
              </p>
              {loading ? (
                <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse mb-4" />
              ) : (
                <p className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-4">
                  {value}
                </p>
              )}
              {change !== undefined && changeLabel && (
                <div className="flex items-center space-x-2">
                  {change > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                  <span className={cn(
                    'text-sm font-semibold',
                    change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {change > 0 ? '+' : ''}{change}%
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                    {changeLabel || t('vsLastMonth')}
                  </span>
                </div>
              )}
            </div>
            <div className={cn(
              'p-4 rounded-2xl bg-gradient-to-r group-hover:shadow-xl group-hover:scale-110 transition-all duration-300',
              variant.gradient
            )}>
              <div className="text-white h-6 w-6">
                {icon}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}