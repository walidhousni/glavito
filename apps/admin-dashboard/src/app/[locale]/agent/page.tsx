'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Activity,
  Clock,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Zap,
  Users,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/lib/store/auth-store';
import { dashboardApi, type AgentMetrics, type AgentGoal, type AgentAchievement } from '@/lib/api/dashboard-client';
import { ticketsApi } from '@/lib/api/tickets-client';
import { useDashboardWebSocket } from '@/lib/hooks/use-dashboard-websocket';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function AgentHomePage() {
  const t = useTranslations('agent');
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [goals, setGoals] = useState<AgentGoal[]>([]);
  const [achievements, setAchievements] = useState<AgentAchievement[]>([]);
  const [myQueue, setMyQueue] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const { isConnected } = useDashboardWebSocket({ autoConnect: true });

  // Load agent data
  useEffect(() => {
    if (!user?.id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [agentMetrics, agentGoals, agentAchievements, tickets] = await Promise.all([
          dashboardApi.getAgentMetrics(user.id),
          dashboardApi.getAgentGoals(user.id),
          dashboardApi.getAgentAchievements(user.id),
          ticketsApi.list({ assignedAgentId: user.id, status: ['open', 'in_progress'], limit: 5 }).catch(() => ({ data: [] })),
        ]);

        setMetrics(agentMetrics);
        // Normalize goals and achievements to arrays in case API returns { data: [...] }
        const goalsData = Array.isArray(agentGoals) ? agentGoals : (agentGoals as any)?.data;
        const achievementsData = Array.isArray(agentAchievements) ? agentAchievements : (agentAchievements as any)?.data;
        setGoals(Array.isArray(goalsData) ? goalsData : []);
        setAchievements(Array.isArray(achievementsData) ? achievementsData : []);
        const ticketData = (tickets as { data?: Record<string, unknown>[] })?.data;
        setMyQueue(Array.isArray(ticketData) ? ticketData : []);
      } catch (error) {
        console.error('Failed to load agent data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  // Navigate to tickets workspace
  const goToWorkspace = () => {
    router.push('/agent/workspace');
  };

  // Get badge info
  const getBadgeInfo = (badgeType: string) => {
    const badges: Record<string, { name: string; color: string; icon: string }> = {
      speed_demon: { name: 'Speed Demon', color: 'bg-red-500', icon: 'kgBinlccP31k' },
      customer_champion: { name: 'Customer Champion', color: 'bg-blue-500', icon: '2073' },
      productivity_champion: { name: 'Productivity Champion', color: 'bg-purple-500', icon: '2073' },
      perfect_week: { name: 'Perfect Week', color: 'bg-green-500', icon: '2073' },
      efficient_solver: { name: 'Efficient Solver', color: 'bg-amber-500', icon: '2073' },
      quick_responder: { name: 'Quick Responder', color: 'bg-indigo-500', icon: '2073' },
      satisfaction_star: { name: 'Satisfaction Star', color: 'bg-pink-500', icon: '2073' },
      goal_achiever: { name: 'Goal Achiever', color: 'bg-emerald-500', icon: '2073' },
    };

    return badges[badgeType] || { name: badgeType, color: 'bg-gray-500', icon: '2073' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6 pt-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('welcome', { fallback: 'Welcome back' })}, {user?.firstName}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('subtitle', { fallback: "Here's what's happening with your work today" })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={isConnected ? 'default' : 'secondary'} className="h-6">
            <div className={cn(
              'h-2 w-2 rounded-full mr-1.5',
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400',
            )} />
            {isConnected ? t('online', { fallback: 'Online' }) : t('offline', { fallback: 'Offline' })}
          </Badge>

          <Button onClick={goToWorkspace}>
            {t('goToWorkspace', { fallback: 'Go to Workspace' })}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Personal Metrics */}
      <motion.div 
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('assigned', { fallback: 'Assigned Tickets' })}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.assignedTickets || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('inQueue', { fallback: 'In your queue' })}
            </p>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('resolvedToday', { fallback: 'Resolved Today' })}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.resolvedToday || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('thisWeek', { fallback: `${metrics?.resolvedThisWeek || 0} this week` })}
            </p>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('avgResponseTime', { fallback: 'Avg Response' })}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.avgResponseTime || 0}m</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('minutes', { fallback: 'minutes' })}
            </p>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('csatScore', { fallback: 'CSAT Score' })}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(metrics?.csatScore || 0).toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('outOfFive', { fallback: 'out of 5.0' })}
            </p>
          </CardContent>
        </Card>
        </motion.div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Queue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Image
                    src="https://img.icons8.com/ios/50/appointment-reminders.png"
                    alt="Queue"
                    width={20}
                    height={20}
                    className="opacity-70"
                  />
                  {t('myQueue', { fallback: 'My Queue' })}
                </CardTitle>
                <CardDescription>
                  {t('nextTickets', { fallback: 'Next tickets to work on' })}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={goToWorkspace}>
                {t('viewAll', { fallback: 'View All' })}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {myQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t('queueEmpty', { fallback: 'Your queue is empty. Great job!' })}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myQueue.map((ticket) => {
                  const ticketTyped = ticket as Record<string, unknown> & { 
                    id: string; 
                    subject: string; 
                    priority: string; 
                    customer?: { firstName?: string; lastName?: string }
                  };
                  return (
                  <div
                    key={ticketTyped.id}
                    onClick={() => router.push(`/dashboard/tickets?ticket=${ticketTyped.id}`)}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors group"
                  >
                    <div className={cn(
                      'h-2 w-2 rounded-full mt-2 flex-shrink-0',
                      ticketTyped.priority === 'urgent' ? 'bg-red-500' :
                      ticketTyped.priority === 'high' ? 'bg-orange-500' :
                      ticketTyped.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500',
                    )} />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-1">
                        {ticketTyped.subject}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] h-5">
                          #{ticketTyped.id.slice(0, 8)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {ticketTyped.customer?.firstName} {ticketTyped.customer?.lastName}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals & Achievements */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image
                src="https://img.icons8.com/ios/50/2073.png"
                alt="Goals"
                width={20}
                height={20}
                className="opacity-70"
              />
              {t('goalsAchievements', { fallback: 'Goals & Achievements' })}
            </CardTitle>
            <CardDescription>
              {t('trackProgress', { fallback: 'Track your progress and unlock badges' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="goals" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="goals">{t('goals', { fallback: 'Goals' })}</TabsTrigger>
                <TabsTrigger value="achievements">{t('achievements', { fallback: 'Achievements' })}</TabsTrigger>
              </TabsList>

              <TabsContent value="goals" className="space-y-3">
                {goals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Target className="h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      {t('noGoals', { fallback: 'No active goals yet' })}
                    </p>
                    <Button size="sm" variant="outline">
                      {t('createGoal', { fallback: 'Create Goal' })}
                    </Button>
                  </div>
                ) : (
                  goals.map((goal) => (
                    <div key={goal.id} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {goal.metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <Badge variant={goal.achieved ? 'default' : 'secondary'} className="text-xs">
                          {goal.type}
                        </Badge>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{goal.current} / {goal.target}</span>
                        <span>{goal.progress}%</span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="achievements" className="space-y-3">
                {achievements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Zap className="h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {t('noAchievements', { fallback: 'No achievements yet. Keep going!' })}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {achievements.map((achievement) => {
                      const badge = getBadgeInfo(achievement.badgeType);
                      return (
                        <div
                          key={achievement.id}
                          className="flex flex-col items-center p-3 rounded-lg border hover:border-primary transition-colors cursor-pointer group"
                        >
                          <Image
                            src={`https://img.icons8.com/ios/50/${badge.icon}.png`}
                            alt={badge.name}
                            width={32}
                            height={32}
                            className="mb-2 opacity-80 group-hover:opacity-100 transition-opacity"
                          />
                          <span className="text-[10px] text-center font-medium leading-tight">
                            {badge.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('quickActions', { fallback: 'Quick Actions' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => router.push('/dashboard/tickets?action=create')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                  <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">
                    {t('createTicket', { fallback: 'Create Ticket' })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('newSupport', { fallback: 'New support request' })}
                  </div>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => router.push('/dashboard/knowledge')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
                  <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">
                    {t('searchKB', { fallback: 'Search KB' })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('findArticles', { fallback: 'Find help articles' })}
                  </div>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => router.push('/dashboard/customers')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                  <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">
                    {t('viewCustomers', { fallback: 'View Customers' })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('customerProfiles', { fallback: 'Customer profiles' })}
                  </div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}