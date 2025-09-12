'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Award, 
  Star, 
  Users,
  Trophy,
  Medal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentStore } from '@/lib/store/agent-store';
import { useTranslations } from 'next-intl';

interface Agent {
  id: string;
  name: string;
  avatar?: string;
  tickets: number;
  satisfaction: number;
  responseTime: string;
  resolutionRate: number;
  rank?: number;
}

interface PerformanceOverviewProps {
  agents?: Agent[];
  loading?: boolean;
  showRankings?: boolean;
}

const mockAgents: Agent[] = [
  { 
    id: '1', 
    name: 'Alice Wilson', 
    tickets: 47, 
    satisfaction: 4.9, 
    responseTime: '2.3h', 
    resolutionRate: 94,
    rank: 1
  },
  { 
    id: '2', 
    name: 'Bob Brown', 
    tickets: 42, 
    satisfaction: 4.8, 
    responseTime: '2.7h', 
    resolutionRate: 91,
    rank: 2
  },
  { 
    id: '3', 
    name: 'Carol Davis', 
    tickets: 38, 
    satisfaction: 4.7, 
    responseTime: '3.1h', 
    resolutionRate: 89,
    rank: 3
  },
  { 
    id: '4', 
    name: 'David Miller', 
    tickets: 35, 
    satisfaction: 4.6, 
    responseTime: '3.4h', 
    resolutionRate: 87
  },
  { 
    id: '5', 
    name: 'Eva Garcia', 
    tickets: 33, 
    satisfaction: 4.5, 
    responseTime: '3.8h', 
    resolutionRate: 85
  }
];

export function PerformanceOverview({ 
  agents = mockAgents, 
  loading = false,
  showRankings = true 
}: PerformanceOverviewProps) {
  const t = useTranslations('dashboard.performanceOverview');
  const { topAgents, isLoading, fetchTopAgents } = useAgentStore();

  React.useEffect(() => {
    // Load top performers for last ~30 days (default)
    fetchTopAgents({ limit: 5 }).catch(() => void 0);
  }, [fetchTopAgents]);

  const mappedFromStore: Agent[] = (topAgents || []).map((a, index) => ({
    id: a.userId,
    name: a.name,
    avatar: a.avatar,
    tickets: a.ticketsResolved,
    satisfaction: Math.max(3.5, Math.min(5, Math.round(((a.resolutionRate / 25) + 3.5) * 10) / 10)),
    responseTime: `${Math.max(1, Math.round((a.averageFirstResponseMinutes / 60) * 10) / 10)}h`,
    resolutionRate: a.resolutionRate,
    rank: index + 1,
  }));

  const displayAgents: Agent[] = agents && agents.length > 0
    ? agents
    : (mappedFromStore.length > 0 ? mappedFromStore : mockAgents);
  const getRankIcon = (rank?: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 2: return <Medal className="h-4 w-4 text-gray-400" />;
      case 3: return <Award className="h-4 w-4 text-orange-500" />;
      default: return null;
    }
  };

  const getRankBadge = (rank?: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2: return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
      case 3: return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  if (loading || isLoading) {
    return (
      <Card className="border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-xl border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
        <CardHeader className="pb-6">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
            <div className="space-y-3">
              <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
              <div className="h-5 w-56 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-600/40">
                <div className="h-14 w-14 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
                  <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                </div>
                <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
      <CardHeader className="pb-6">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">{t('title')}</CardTitle>
            <CardDescription className="text-base text-slate-600 dark:text-slate-400">{t('description')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayAgents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className={cn(
                'flex items-center space-x-4 p-5 rounded-2xl transition-all duration-300 hover:shadow-xl border',
                agent.rank && agent.rank <= 3 
                  ? 'bg-gradient-to-r from-amber-50/80 to-yellow-50/80 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200/60 dark:border-amber-800/40 shadow-amber-100/50 dark:shadow-amber-900/20'
                  : 'bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100/70 dark:hover:bg-slate-700/50 border-slate-200/60 dark:border-slate-600/40'
              )}
            >
              <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-white/60 dark:ring-slate-700/60 shadow-lg">
                  <AvatarImage src={agent.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-base">
                    {agent.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                {showRankings && agent.rank && agent.rank <= 3 && (
                  <div className={cn(
                    'absolute -top-1 -right-1 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800',
                    getRankBadge(agent.rank)
                  )}>
                    {getRankIcon(agent.rank) || `#${agent.rank}`}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-3">
                  <p className="font-semibold text-slate-900 dark:text-white">{agent.name}</p>
                  {agent.rank === 1 && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs px-2 py-1 shadow-sm">
                      <Trophy className="h-3 w-3 mr-1" />
                      {t('badges.topAgent')}
                    </Badge>
                  )}
                  {agent.rank === 2 && (
                    <Badge className="bg-gradient-to-r from-slate-400 to-slate-500 text-white text-xs px-2 py-1 shadow-sm">
                      <Medal className="h-3 w-3 mr-1" />
                      {t('badges.secondPlace')}
                    </Badge>
                  )}
                  {agent.rank === 3 && (
                    <Badge className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs px-2 py-1 shadow-sm">
                      <Award className="h-3 w-3 mr-1" />
                      {t('badges.thirdPlace')}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl shadow-sm">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">{t('metrics.tickets')}</p>
                    <p className="font-bold text-slate-900 dark:text-white text-lg">{agent.tickets}</p>
                  </div>
                  <div className="text-center p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl shadow-sm">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">{t('metrics.rating')}</p>
                    <div className="flex items-center justify-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-bold text-slate-900 dark:text-white text-lg">{agent.satisfaction}</span>
                    </div>
                  </div>
                  <div className="text-center p-3 bg-white/60 dark:bg-slate-800/60 rounded-xl shadow-sm">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">{t('metrics.response')}</p>
                    <p className="font-bold text-slate-900 dark:text-white text-lg">{agent.responseTime}</p>
                  </div>
                </div>
                
                {/* Resolution Rate Progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t('metrics.resolutionRate')}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{agent.resolutionRate}%</span>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={agent.resolutionRate} 
                      className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full"
                    />
                    <div 
                      className="absolute top-0 left-0 h-3 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${agent.resolutionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {displayAgents.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Users className="h-12 w-12 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-semibold text-lg">{t('emptyState.title')}</p>
            <p className="text-slate-400 dark:text-slate-500 text-base mt-2">{t('emptyState.description')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}