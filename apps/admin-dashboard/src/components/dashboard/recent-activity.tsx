'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Ticket, User, Clock } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const activities = [
  {
    id: 1,
    type: 'ticket',
    titleKey: 'dashboard.activity.newTicketCreated',
    descriptionKey: 'dashboard.activity.billingInquiry',
    timeKey: 'dashboard.activity.twoMinutesAgo',
    icon: Ticket,
    color: 'text-blue-600',
  },
  {
    id: 2,
    type: 'user',
    titleKey: 'dashboard.activity.newCustomerRegistered',
    descriptionKey: 'dashboard.activity.johnDoeJoined',
    timeKey: 'dashboard.activity.fifteenMinutesAgo',
    icon: User,
    color: 'text-green-600',
  },
  {
    id: 3,
    type: 'ticket',
    titleKey: 'dashboard.activity.ticketResolved',
    descriptionKey: 'dashboard.activity.technicalIssueFixed',
    timeKey: 'dashboard.activity.oneHourAgo',
    icon: Ticket,
    color: 'text-purple-600',
  },
  {
    id: 4,
    type: 'user',
    titleKey: 'dashboard.activity.profileUpdated',
    descriptionKey: 'dashboard.activity.sarahUpdatedContact',
    timeKey: 'dashboard.activity.twoHoursAgo',
    icon: User,
    color: 'text-orange-600',
  },
];

export function RecentActivity() {
  const t = useTranslations();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-2xl">
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl font-bold flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              {t('recentActivity')}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="flex items-start space-x-4 p-5 rounded-2xl hover:bg-slate-50/70 dark:hover:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 hover:border-slate-300/60 dark:hover:border-slate-600/60 transition-all duration-300 group hover:shadow-lg"
              >
                <div className={`p-3 rounded-2xl ${activity.color.replace('text-', 'bg-')}/10 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                   <activity.icon className={`h-5 w-5 ${activity.color}`} />
                 </div>
                 <div className="flex-1 min-w-0 space-y-2">
                   <p className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                     {t(activity.titleKey)}
                   </p>
                   <p className="text-sm text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                     {t(activity.descriptionKey)}
                   </p>
                   <p className="text-xs text-slate-400 dark:text-slate-500 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors font-medium">
                     {t(activity.timeKey)}
                   </p>
                 </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}