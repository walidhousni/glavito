'use client';

import React from 'react'
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Star, Clock, ArrowRight, Trophy, Medal, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n.config';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { agentApi } from '@/lib/api/team'



const staggerChildren = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15
    }
  }
};

interface AgentPerfItem {
  id: string | number;
  name: string;
  avatar?: string;
  initials?: string;
  tickets: number;
  rating: number; // 0..5
  responseTime: string; // minutes text
  resolutionRate: number; // 0..100
  badge: 'top' | 'second' | 'third' | string;
}

export function PerformanceOverview() {
  const t = useTranslations('dashboard.performance');
  const [agents, setAgents] = React.useState<AgentPerfItem[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const list = await agentApi.getTopAgents({ limit: 3 }).catch(() => [])
        if (cancelled) return

        if (!Array.isArray(list) || list.length === 0) {
          setAgents([])
          return
        }

        type TopAgent = { userId: string | number; name?: string; displayName?: string; firstName?: string; lastName?: string; avatar?: string; avatarUrl?: string; ticketsResolved?: number; ticketsAssigned?: number; customerSatisfaction?: number; averageFirstResponseMinutes?: number; responseTime?: number; resolutionRate?: number };
        const mapped: AgentPerfItem[] = (list as TopAgent[]).map((a: TopAgent, idx: number) => {
          const fullName = String(a.name || a.displayName || `${a.firstName || ''} ${a.lastName || ''}` || 'Agent').trim()
          const initials = (fullName || 'AG').split(' ').map((p: string) => p[0]).join('').slice(0,2).toUpperCase()
          const tickets = Number(a.ticketsResolved ?? a.ticketsAssigned ?? 0)
          const rating = Number(a.customerSatisfaction ?? 0)
          const respMin = Number(a.averageFirstResponseMinutes ?? a.responseTime ?? 0)
          const resolutionRate = Number(a.resolutionRate ?? 0)
          const badge: AgentPerfItem['badge'] = idx === 0 ? 'top' : idx === 1 ? 'second' : idx === 2 ? 'third' : 'other'
          return {
            id: (a as { userId?: string | number; id?: string | number }).userId || (a as { id?: string | number }).id || idx,
            name: fullName,
            avatar: a.avatarUrl || a.avatar,
            initials,
            tickets,
            rating: isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0,
            responseTime: isFinite(respMin) ? `${respMin.toFixed(respMin >= 1 ? 0 : 1)}m` : '—',
            resolutionRate: isFinite(resolutionRate) ? Math.max(0, Math.min(100, resolutionRate)) : 0,
            badge,
          }
        }).slice(0, 3)
        setAgents(mapped)
      } catch {
        setAgents([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'top':
        return <Crown className="h-3 w-3" />;
      case 'second':
        return <Medal className="h-3 w-3" />;
      case 'third':
        return <Trophy className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getBadgeVariant = (badge: string) => {
    switch (badge) {
      case 'top':
        return 'default';
      case 'second':
        return 'secondary';
      case 'third':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRankColors = (badge: string) => {
    switch (badge) {
      case 'top':
        return {
          bg: 'from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20',
          border: 'border-amber-200/50 dark:border-amber-800/50',
          accent: 'text-amber-600 dark:text-amber-400'
        };
      case 'second':
        return {
          bg: 'from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20',
          border: 'border-slate-200/50 dark:border-slate-800/50',
          accent: 'text-slate-600 dark:text-slate-400'
        };
      case 'third':
        return {
          bg: 'from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20',
          border: 'border-orange-200/50 dark:border-orange-800/50',
          accent: 'text-orange-600 dark:text-orange-400'
        };
      default:
        return {
          bg: 'from-muted/50 to-muted/30',
          border: 'border-border/50',
          accent: 'text-muted-foreground'
        };
    }
  };

  return (
    <Card className="dashboard-card-elevated h-full">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">
              {t('topPerformers')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('leadingAgentsThisMonth')}
            </p>
          </div>
          <Link href="/dashboard/admin-settings?tab=team">
            <Button variant="ghost" size="sm" className="gap-2">
              {t('viewAll')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Users className="h-8 w-8 mb-2 opacity-50" />
            <p>{t('noData', { fallback: 'No performance data available' })}</p>
          </div>
        ) : (
          <motion.div
            className="space-y-3"
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
          >
            {agents.map((agent, index) => {
              const colors = getRankColors(agent.badge);
              
              return (
                <motion.div
                  key={agent.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.01 }}
                  className="group cursor-pointer"
                >
                  <Card className={cn(
                    "performance-card border transition-all duration-300 hover:shadow-md",
                    colors.border
                  )}>
                    {/* Background Gradient */}
                    <div className={cn(
                      "performance-card-gradient bg-gradient-to-br",
                      colors.bg
                    )} />

                    <CardContent className="relative p-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar with Rank Badge */}
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                            <AvatarImage src={agent.avatar} alt={agent.name} />
                            <AvatarFallback className={cn(
                              "font-semibold text-white bg-gradient-to-br",
                              index === 0 ? 'from-yellow-400 to-orange-500' : index === 1 ? 'from-slate-400 to-slate-600' : 'from-amber-600 to-orange-700'
                            )}>
                              {agent.initials || (agent.name || 'AG').split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* Rank Badge */}
                          <Badge 
                            variant={getBadgeVariant(agent.badge)}
                            className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center"
                          >
                            {getBadgeIcon(agent.badge)}
                          </Badge>
                        </div>

                        {/* Agent Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-foreground truncate">
                                {agent.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {t('rank')} #{index + 1}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {agent.resolutionRate}% {t('success')}
                            </Badge>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4 text-blue-500" />
                              <span className="text-muted-foreground">
                                {agent.tickets}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <Star className="h-4 w-4 text-amber-500" />
                              <span className="text-muted-foreground">
                                {agent.rating}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-purple-500" />
                              <span className="text-muted-foreground">
                                {agent.responseTime}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className="h-4 w-4 text-emerald-500" />
                              <span className="text-muted-foreground">
                                {agent.resolutionRate}%
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{t('performance')}</span>
                              <span className="font-medium">{agent.resolutionRate}%</span>
                            </div>
                            <Progress 
                              value={agent.resolutionRate} 
                              className="h-2"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}