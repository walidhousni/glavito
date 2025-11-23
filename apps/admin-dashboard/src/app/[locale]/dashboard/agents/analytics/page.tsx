'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import {
  Users,
  TrendingUp,
  Star,
  Clock,
  Target,
  Award,
  BarChart3,
  ArrowLeft,
  Download,
  Crown,
  Medal,
  Trophy,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgents } from '@/lib/hooks/use-agent';

export default function AgentAnalyticsPage() {
  const t = useTranslations('agents');
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale as string || 'en';
  
  const { agents, isLoading } = useAgents();
  const safeAgents = Array.isArray(agents) ? agents : [];

  // Calculate team analytics
  const analytics = useMemo(() => {
    const total = safeAgents.length;
    const available = safeAgents.filter(a => a.availability === 'available').length;
    const busy = safeAgents.filter(a => a.availability === 'busy').length;
    const away = safeAgents.filter(a => a.availability === 'away').length;
    const offline = safeAgents.filter(a => a.availability === 'offline').length;

    const totalTicketsResolved = safeAgents.reduce((sum, a) => sum + (a.performanceMetrics?.ticketsCompleted ?? 0), 0);
    const totalTicketsAssigned = safeAgents.reduce((sum, a) => sum + (a.performanceMetrics?.ticketsAssigned ?? 0), 0);
    const avgResponseTime = total > 0
      ? Math.round(safeAgents.reduce((sum, a) => sum + (a.performanceMetrics?.responseTime ?? 0), 0) / total)
      : 0;
    const avgSatisfaction = total > 0
      ? (safeAgents.reduce((sum, a) => sum + (a.performanceMetrics?.customerSatisfaction ?? 0), 0) / total).toFixed(1)
      : '0.0';
    const avgResolutionRate = totalTicketsAssigned > 0
      ? Math.round((totalTicketsResolved / totalTicketsAssigned) * 100)
      : 0;

    return {
      total,
      available,
      busy,
      away,
      offline,
      totalTicketsResolved,
      totalTicketsAssigned,
      avgResponseTime,
      avgSatisfaction,
      avgResolutionRate,
    };
  }, [safeAgents]);

  // Top performers
  const topPerformers = useMemo(() => {
    return [...safeAgents]
      .sort((a, b) => (b.performanceMetrics?.ticketsCompleted ?? 0) - (a.performanceMetrics?.ticketsCompleted ?? 0))
      .slice(0, 5);
  }, [safeAgents]);

  // Top by satisfaction
  const topBySatisfaction = useMemo(() => {
    return [...safeAgents]
      .sort((a, b) => (b.performanceMetrics?.customerSatisfaction ?? 0) - (a.performanceMetrics?.customerSatisfaction ?? 0))
      .slice(0, 5);
  }, [safeAgents]);

  // Top by response time (fastest)
  const topByResponseTime = useMemo(() => {
    return [...safeAgents]
      .filter(a => (a.performanceMetrics?.responseTime ?? 0) > 0)
      .sort((a, b) => (a.performanceMetrics?.responseTime ?? 0) - (b.performanceMetrics?.responseTime ?? 0))
      .slice(0, 5);
  }, [safeAgents]);

  // Skills coverage
  const skillsCoverage = useMemo(() => {
    const skillMap = new Map<string, number>();
    safeAgents.forEach(agent => {
      agent.skills.forEach(skill => {
        skillMap.set(skill, (skillMap.get(skill) ?? 0) + 1);
      });
    });
    return Array.from(skillMap.entries())
      .map(([skill, count]) => ({ skill, count, percentage: (count / safeAgents.length) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [safeAgents]);

  // Language coverage
  const languageCoverage = useMemo(() => {
    const langMap = new Map<string, number>();
    safeAgents.forEach(agent => {
      agent.languages.forEach(lang => {
        langMap.set(lang, (langMap.get(lang) ?? 0) + 1);
      });
    });
    return Array.from(langMap.entries())
      .map(([language, count]) => ({ language, count, percentage: (count / safeAgents.length) * 100 }))
      .sort((a, b) => b.count - a.count);
  }, [safeAgents]);

  const handleBack = () => {
    router.push(`/${locale}/dashboard/admin-settings?tab=userManagement`);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-orange-500" />;
    return <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg-primary p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="agent-skeleton h-12 w-64 rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="agent-skeleton h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg-primary p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToAgents', { fallback: 'Back to Agents' })}
            </Button>
            <div>
              <h1 className="text-3xl font-bold gradient-text">{t('teamAnalytics', { fallback: 'Team Analytics' })}</h1>
              <p className="text-muted-foreground mt-1">
                {t('teamAnalyticsDesc', { fallback: 'Performance insights and team statistics' })}
              </p>
            </div>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t('exportReport', { fallback: 'Export Report' })}
          </Button>
        </motion.div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="agent-metric-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">{t('totalAgents', { fallback: 'Total Agents' })}</div>
                    <div className="text-3xl font-bold animate-count-up">{analytics.total}</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {analytics.available} {t('available', { fallback: 'available' })}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="agent-metric-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">{t('avgResponseTime', { fallback: 'Avg Response' })}</div>
                    <div className="text-3xl font-bold animate-count-up">{analytics.avgResponseTime}m</div>
                    <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
                      <TrendingUp className="h-3 w-3" />
                      {t('improving', { fallback: 'Improving' })}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="agent-metric-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">{t('satisfaction', { fallback: 'Satisfaction' })}</div>
                    <div className="text-3xl font-bold animate-count-up">{analytics.avgSatisfaction}</div>
                    <div className="text-xs text-muted-foreground mt-2">{t('outOf5', { fallback: 'out of 5.0' })}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/30">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="agent-metric-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">{t('resolutionRate', { fallback: 'Resolution Rate' })}</div>
                    <div className="text-3xl font-bold animate-count-up">{analytics.avgResolutionRate}%</div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {analytics.totalTicketsResolved}/{analytics.totalTicketsAssigned} {t('tickets', { fallback: 'tickets' })}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Team Availability */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="agent-detail-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('teamAvailability', { fallback: 'Team Availability' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 animate-count-up">{analytics.available}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t('available', { fallback: 'Available' })}</div>
                  <Progress value={(analytics.available / analytics.total) * 100} className="mt-2 h-2" />
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 animate-count-up">{analytics.busy}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t('busy', { fallback: 'Busy' })}</div>
                  <Progress value={(analytics.busy / analytics.total) * 100} className="mt-2 h-2" />
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 animate-count-up">{analytics.away}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t('away', { fallback: 'Away' })}</div>
                  <Progress value={(analytics.away / analytics.total) * 100} className="mt-2 h-2" />
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-600 animate-count-up">{analytics.offline}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t('offline', { fallback: 'Offline' })}</div>
                  <Progress value={(analytics.offline / analytics.total) * 100} className="mt-2 h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Leaderboards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Tabs defaultValue="tickets" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tickets">{t('topPerformers', { fallback: 'Top Performers' })}</TabsTrigger>
              <TabsTrigger value="satisfaction">{t('bestRated', { fallback: 'Best Rated' })}</TabsTrigger>
              <TabsTrigger value="speed">{t('fastestResponse', { fallback: 'Fastest Response' })}</TabsTrigger>
            </TabsList>

            <TabsContent value="tickets">
              <Card className="agent-leaderboard-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    {t('topByTickets', { fallback: 'Top Agents by Tickets Resolved' })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topPerformers.map((agent, index) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-card border border-border hover:border-primary/50 transition-colors"
                      >
                        <div className="flex-shrink-0">{getRankIcon(index)}</div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={agent.user?.avatar ?? ''} />
                          <AvatarFallback>
                            {(agent.user?.firstName?.[0] ?? 'A').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            {agent.displayName || `${agent.user?.firstName ?? ''} ${agent.user?.lastName ?? ''}`}
                          </div>
                          <div className="text-sm text-muted-foreground">{agent.user?.email}</div>
                        </div>
                        <Badge variant="secondary" className="text-lg px-4 py-1">
                          {agent.performanceMetrics?.ticketsCompleted ?? 0}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="satisfaction">
              <Card className="agent-leaderboard-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    {t('topBySatisfaction', { fallback: 'Top Agents by Customer Satisfaction' })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topBySatisfaction.map((agent, index) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-card border border-border hover:border-primary/50 transition-colors"
                      >
                        <div className="flex-shrink-0">{getRankIcon(index)}</div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={agent.user?.avatar ?? ''} />
                          <AvatarFallback>
                            {(agent.user?.firstName?.[0] ?? 'A').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            {agent.displayName || `${agent.user?.firstName ?? ''} ${agent.user?.lastName ?? ''}`}
                          </div>
                          <div className="text-sm text-muted-foreground">{agent.user?.email}</div>
                        </div>
                        <Badge variant="secondary" className="text-lg px-4 py-1">
                          <Star className="h-4 w-4 mr-1 fill-yellow-500 text-yellow-500" />
                          {(agent.performanceMetrics?.customerSatisfaction ?? 0).toFixed(1)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="speed">
              <Card className="agent-leaderboard-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {t('topBySpeed', { fallback: 'Fastest Response Times' })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topByResponseTime.map((agent, index) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-card border border-border hover:border-primary/50 transition-colors"
                      >
                        <div className="flex-shrink-0">{getRankIcon(index)}</div>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={agent.user?.avatar ?? ''} />
                          <AvatarFallback>
                            {(agent.user?.firstName?.[0] ?? 'A').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            {agent.displayName || `${agent.user?.firstName ?? ''} ${agent.user?.lastName ?? ''}`}
                          </div>
                          <div className="text-sm text-muted-foreground">{agent.user?.email}</div>
                        </div>
                        <Badge variant="secondary" className="text-lg px-4 py-1">
                          {agent.performanceMetrics?.responseTime ?? 0}m
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Skills & Language Coverage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card className="agent-detail-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  {t('skillsCoverage', { fallback: 'Skills Coverage' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {skillsCoverage.map((skill, index) => (
                  <div key={skill.skill} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{skill.skill.replace('_', ' ')}</span>
                      <Badge variant="secondary">{skill.count} {t('agents', { fallback: 'agents' })}</Badge>
                    </div>
                    <Progress value={skill.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Card className="agent-detail-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t('languageCoverage', { fallback: 'Language Coverage' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {languageCoverage.map((lang) => (
                  <div key={lang.language} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{lang.language.toUpperCase()}</span>
                      <Badge variant="secondary">{lang.count} {t('agents', { fallback: 'agents' })}</Badge>
                    </div>
                    <Progress value={lang.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

