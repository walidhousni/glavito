'use client';

import Link from 'next/link';
import { Plus, Users, FileText, Settings, TrendingUp, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const quickActions = [
  {
    title: 'New Ticket',
    description: 'Create support ticket',
    icon: Plus,
    href: '/dashboard/tickets?create=true',
    gradient: 'from-blue-500 to-cyan-600',
    bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30',
    shadow: 'shadow-blue-500/20',
    hoverShadow: 'hover:shadow-blue-500/30',
  },
  {
    title: 'New Customer',
    description: 'Add customer profile',
    icon: Users,
    href: '/dashboard/customers?create=true',
    gradient: 'from-green-500 to-emerald-600',
    bgGradient: 'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30',
    shadow: 'shadow-green-500/20',
    hoverShadow: 'hover:shadow-green-500/30',
  },
  {
    title: 'View Reports',
    description: 'Analytics dashboard',
    icon: BarChart3,
    href: '/dashboard/analytics',
    gradient: 'from-purple-500 to-pink-600',
    bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30',
    shadow: 'shadow-purple-500/20',
    hoverShadow: 'hover:shadow-purple-500/30',
  },
  {
    title: 'Settings',
    description: 'Configure system',
    icon: Settings,
    href: '/dashboard/admin-settings',
    gradient: 'from-orange-500 to-amber-600',
    bgGradient: 'from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30',
    shadow: 'shadow-orange-500/20',
    hoverShadow: 'hover:shadow-orange-500/30',
  },
];

export function QuickActions() {
  return (
    <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl h-full">
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <Link href={action.href}>
                <div className={cn(
                  "group p-4 rounded-xl transition-all duration-300 cursor-pointer h-full",
                  "bg-gradient-to-br border-2 border-transparent",
                  "hover:scale-105 hover:border-white dark:hover:border-slate-800",
                  "shadow-lg hover:shadow-xl",
                  action.bgGradient,
                  action.shadow,
                  action.hoverShadow
                )}>
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className={cn(
                      "h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6",
                      action.gradient,
                      action.shadow
                    )}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {action.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}