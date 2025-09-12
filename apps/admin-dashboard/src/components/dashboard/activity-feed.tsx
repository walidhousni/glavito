'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Ticket, 
  UserCheck, 
  Star, 
  AlertTriangle, 
  MessageSquare, 
  Eye,
  Clock,
  CheckCircle,
  Users,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  type: 'ticket' | 'agent' | 'customer' | 'system' | 'message' | 'sla';
  title: string;
  description?: string;
  user: string;
  time: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  activities?: ActivityItem[];
  loading?: boolean;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

const defaultActivities: ActivityItem[] = [
  {
    id: '1',
    type: 'ticket',
    title: 'New high-priority ticket created',
    description: 'Payment processing issue reported by enterprise customer',
    user: 'Sarah Chen',
    time: '2 min ago',
    priority: 'high',
    metadata: { ticketId: '#T-1234', customer: 'Acme Corp' }
  },
  {
    id: '2',
    type: 'agent',
    title: 'Agent joined Technical Support team',
    description: 'New team member with 5+ years experience',
    user: 'Mike Johnson',
    time: '15 min ago',
    priority: 'medium'
  },
  {
    id: '3',
    type: 'customer',
    title: 'Customer satisfaction rating received',
    description: '5-star rating with positive feedback',
    user: 'Acme Corp',
    time: '1 hour ago',
    priority: 'low',
    metadata: { rating: 5, ticketId: '#T-1230' }
  },
  {
    id: '4',
    type: 'sla',
    title: 'SLA breach warning',
    description: 'Ticket approaching response time limit',
    user: 'System',
    time: '2 hours ago',
    priority: 'urgent',
    metadata: { ticketId: '#T-1228', timeRemaining: '30 minutes' }
  },
  {
    id: '5',
    type: 'message',
    title: 'Customer replied to ticket',
    description: 'Additional information provided for troubleshooting',
    user: 'TechStart Inc',
    time: '3 hours ago',
    priority: 'medium',
    metadata: { ticketId: '#T-1225' }
  }
];

export function ActivityFeed({ 
  activities = defaultActivities, 
  loading = false, 
  showViewAll = true,
  onViewAll 
}: ActivityFeedProps) {
  const t = useTranslations('activityFeed');
  
  const getActivityIcon = (type: ActivityItem['type']) => {
    const iconMap = {
      ticket: Ticket,
      agent: UserCheck,
      customer: Star,
      system: AlertTriangle,
      message: MessageSquare,
      sla: Clock
    };
    return iconMap[type] || AlertTriangle;
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    const colorMap = {
      ticket: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600',
      agent: 'bg-green-100 dark:bg-green-900/20 text-green-600',
      customer: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600',
      system: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600',
      message: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600',
      sla: 'bg-red-100 dark:bg-red-900/20 text-red-600'
    };
    return colorMap[type] || 'bg-gray-100 dark:bg-gray-900/20 text-gray-600';
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl">
        <CardHeader className="pb-6">
          <div className="h-7 w-40 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          <div className="h-5 w-56 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-700/40 border border-slate-200/60 dark:border-slate-600/40">
                <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-4/5 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                  <div className="h-4 w-3/5 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                </div>
                <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent">
              {t('title')}
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 text-base">
              {t('description')}
            </CardDescription>
          </div>
          {showViewAll && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onViewAll} 
              className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('viewAll')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = getActivityIcon(activity.type);
            
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="flex items-start space-x-4 p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-700/40 border border-slate-200/60 dark:border-slate-600/40 hover:bg-slate-100/80 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-500 hover:shadow-lg transition-all duration-300 cursor-pointer group"
              >
                <div className={cn('p-3 rounded-2xl flex-shrink-0 shadow-sm group-hover:shadow-md transition-all duration-300', getActivityColor(activity.type))}>
                  <Icon className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-base">
                        {activity.title}
                      </p>
                      {activity.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                          {activity.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-3 mt-3">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {activity.user}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{activity.time}</span>
                        {activity.metadata?.ticketId && (
                          <>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-sm text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">
                              {activity.metadata.ticketId}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {activity.priority && (
                      <Badge className={cn('ml-4 flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold', getPriorityColor(activity.priority))}>
                        {t(`priority.${activity.priority}`)}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Additional metadata */}
                  {activity.metadata && (
                    <div className="mt-4 flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                      {activity.metadata.rating && (
                        <div className="flex items-center space-x-2 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-full">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span className="font-medium">{activity.metadata.rating}/5</span>
                        </div>
                      )}
                      {activity.metadata.timeRemaining && (
                        <div className="flex items-center space-x-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full">
                          <Clock className="h-3 w-3 text-orange-500" />
                          <span className="font-medium">{activity.metadata.timeRemaining} {t('remaining')}</span>
                        </div>
                      )}
                      {activity.metadata.customer && (
                        <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full">
                          <Users className="h-3 w-3 text-blue-500" />
                          <span className="font-medium">{activity.metadata.customer}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        
        {activities.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <TrendingUp className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t('noActivity.title')}</h3>
            <p className="text-slate-500 dark:text-slate-400">{t('noActivity.description')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}