'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Users, Ticket, DollarSign, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const stats = [
  {
    title: 'totalCustomers',
    value: '2,543',
    change: '+12%',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
  },
  {
    title: 'totalTickets',
    value: '1,234',
    change: '+8%',
    icon: Ticket,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
  },
  {
    title: 'revenue',
    value: '$45,678',
    change: '+23%',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
  },
  {
    title: 'growth',
    value: '18.2%',
    change: '+5%',
    icon: TrendingUp,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
  },
];

export function StatsCards() {
  const t = useTranslations();

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ y: -6, scale: 1.02 }}
          className="group"
        >
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl group-hover:scale-[1.02] rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
              <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                {t(`dashboard.${stat.title}`)}
              </CardTitle>
              <motion.div 
                className={`p-3 rounded-2xl ${stat.bgColor} group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}
                whileHover={{ scale: 1.15 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </motion.div>
            </CardHeader>
            <CardContent className="pt-0">
              <motion.div 
                className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent mb-4"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.2, type: "spring", stiffness: 200 }}
              >
                {stat.value}
              </motion.div>
              <div className="flex items-center space-x-2">
                <motion.div
                  className="text-sm font-semibold"
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                >
                  <span className={cn(
                    stat.change.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {stat.change}
                  </span>
                </motion.div>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {t('dashboard.fromLastMonth')}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}