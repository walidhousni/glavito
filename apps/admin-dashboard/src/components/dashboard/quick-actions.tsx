'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Users, 
  MessageSquare, 
  Settings, 
  FileText, 
  BarChart3,
  Zap,
  Mail
} from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const getQuickActions = (t: any) => [
  {
    title: t('actions.newTicket.title'),
    description: t('actions.newTicket.description'),
    icon: <Plus className="h-6 w-6" />,
    href: '/dashboard/tickets?action=create',
    color: 'from-blue-500 to-blue-600',
  },
  {
    title: t('actions.addAgent.title'),
    description: t('actions.addAgent.description'),
    icon: <Users className="h-6 w-6" />,
    href: '/dashboard/agents?action=invite',
    color: 'from-green-500 to-green-600',
  },
  {
    title: t('actions.liveChat.title'),
    description: t('actions.liveChat.description'),
    icon: <MessageSquare className="h-6 w-6" />,
    href: '/dashboard/conversations',
    color: 'from-purple-500 to-purple-600',
  },
  {
    title: t('actions.analytics.title'),
    description: t('actions.analytics.description'),
    icon: <BarChart3 className="h-6 w-6" />,
    href: '/dashboard/analytics',
    color: 'from-orange-500 to-orange-600',
  },
  {
    title: t('actions.workflows.title'),
    description: t('actions.workflows.description'),
    icon: <Zap className="h-6 w-6" />,
    href: '/dashboard/workflows',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    title: t('actions.reports.title'),
    description: t('actions.reports.description'),
    icon: <FileText className="h-6 w-6" />,
    href: '/dashboard/reports',
    color: 'from-pink-500 to-pink-600',
  },
  {
    title: t('actions.emailSetup.title'),
    description: t('actions.emailSetup.description'),
    icon: <Mail className="h-6 w-6" />,
    href: '/dashboard/settings/channels',
    color: 'from-teal-500 to-teal-600',
  },
  {
    title: t('actions.settings.title'),
    description: t('actions.settings.description'),
    icon: <Settings className="h-6 w-6" />,
    href: '/dashboard/settings',
    color: 'from-gray-500 to-gray-600',
  },
];

export function QuickActions() {
  const t = useTranslations('quickActions');
  const quickActions = getQuickActions(t);

  return (
    <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl font-bold flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            {t('title')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href={action.href}>
                <Button
                  variant="ghost"
                  className="w-full h-auto p-5 flex flex-col items-start space-y-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300/60 dark:hover:border-slate-600/60 rounded-2xl transition-all duration-300 group hover:shadow-lg"
                >
                  <div className={`p-3 rounded-2xl bg-gradient-to-r ${action.color} group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                    <div className="text-white h-6 w-6">
                      {action.icon}
                    </div>
                  </div>
                  <div className="text-left space-y-2">
                    <p className="font-semibold text-slate-900 dark:text-white text-base group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                      {action.title}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                      {action.description}
                    </p>
                  </div>
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}