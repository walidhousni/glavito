'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Users, Ticket, DollarSign, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type StatsCardsProps = {
  ticketsTotal?: number;
  customersTotal?: number;
  revenue?: string | number;
  growth?: string | number;
};

const baseStats = [
  {
    title: 'totalCustomers',
    value: '—',
    icon: Users,
    gradient: 'from-blue-500 via-blue-600 to-cyan-600',
    bgGradient: 'from-blue-50/80 to-cyan-50/80 dark:from-blue-950/40 dark:to-cyan-950/40',
    iconBg: 'from-blue-500 to-cyan-600',
    shadow: 'shadow-blue-500/20',
    hoverShadow: 'hover:shadow-blue-500/30',
  },
  {
    title: 'totalTickets',
    value: '—',
    icon: Ticket,
    gradient: 'from-purple-500 via-purple-600 to-pink-600',
    bgGradient: 'from-purple-50/80 to-pink-50/80 dark:from-purple-950/40 dark:to-pink-950/40',
    iconBg: 'from-purple-500 to-pink-600',
    shadow: 'shadow-purple-500/20',
    hoverShadow: 'hover:shadow-purple-500/30',
  },
  {
    title: 'revenue',
    value: '—',
    icon: DollarSign,
    gradient: 'from-green-500 via-emerald-600 to-teal-600',
    bgGradient: 'from-green-50/80 to-emerald-50/80 dark:from-green-950/40 dark:to-emerald-950/40',
    iconBg: 'from-green-500 to-emerald-600',
    shadow: 'shadow-green-500/20',
    hoverShadow: 'hover:shadow-green-500/30',
  },
  {
    title: 'growth',
    value: '—',
    icon: TrendingUp,
    gradient: 'from-orange-500 via-amber-600 to-yellow-600',
    bgGradient: 'from-orange-50/80 to-amber-50/80 dark:from-orange-950/40 dark:to-amber-950/40',
    iconBg: 'from-orange-500 to-amber-600',
    shadow: 'shadow-orange-500/20',
    hoverShadow: 'hover:shadow-orange-500/30',
  },
] as const;

export function StatsCards({ ticketsTotal, customersTotal, revenue, growth }: StatsCardsProps) {
  const t = useTranslations();

  const stats = baseStats.map((s) => {
    let value: string | number | undefined = undefined;
    if (s.title === 'totalTickets') value = ticketsTotal;
    if (s.title === 'totalCustomers') value = customersTotal;
    if (s.title === 'revenue') value = revenue;
    if (s.title === 'growth') value = growth;

    return { ...s, value };
  });

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.4 }}
        >
          <Card 
            className={cn(
              "group border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden relative",
              "bg-gradient-to-br",
              stat.bgGradient,
              stat.shadow,
              stat.hoverShadow
            )}
          >
            {/* Gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />
            
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t(`dashboard.${stat.title}`)}
              </CardTitle>
              <div className={cn(
                "h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                stat.iconBg,
                stat.shadow
              )}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            
            <CardContent className="relative z-10">
              {stat.value !== undefined ? (
                <div className="space-y-1">
                  <div className={cn(
                    "text-4xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                    stat.gradient
                  )}>
                    {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full bg-gradient-to-r",
                      stat.iconBg
                    )} />
                    <span>Live data</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-10 w-32 bg-slate-200/60 dark:bg-slate-700/60 rounded-lg animate-pulse" />
                  <div className="h-3 w-20 bg-slate-200/40 dark:bg-slate-700/40 rounded animate-pulse" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}