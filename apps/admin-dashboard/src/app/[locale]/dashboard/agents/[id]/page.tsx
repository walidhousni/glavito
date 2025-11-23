'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  User,
  Activity,
  Trophy,
  Calendar,
  MessageSquare,
  MoreHorizontal,
  Edit,
  Mail,
  Phone,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAgent } from '@/lib/hooks/use-agent';
import { AgentProfileTab } from '@/components/agents/agent-profile-tab';
import { AgentPerformanceTab } from '@/components/agents/agent-performance-tab';
import { AgentActivityTab } from '@/components/agents/agent-activity-tab';
import { AgentGoalsTab } from '@/components/agents/agent-goals-tab';

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('agents');
  const locale = params?.locale as string || 'en';
  const userId = params?.id as string;

  const [activeTab, setActiveTab] = useState('profile');
  const { agent, isLoading } = useAgent(userId);

  const handleBack = () => {
    router.push(`/${locale}/dashboard/admin-settings?tab=userManagement`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg-primary p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="agent-skeleton h-12 w-64 rounded-lg" />
          <div className="agent-skeleton h-32 w-full rounded-xl" />
          <div className="agent-skeleton h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen gradient-bg-primary p-6 flex items-center justify-center">
        <Card className="p-8 text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">{t('agentNotFound', { fallback: 'Agent Not Found' })}</h2>
          <p className="text-muted-foreground mb-4">
            {t('agentNotFoundDesc', { fallback: 'The agent you are looking for does not exist.' })}
          </p>
          <Button onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToAgents', { fallback: 'Back to Agents' })}
          </Button>
        </Card>
      </div>
    );
  }

  const agentName = agent.displayName || `${agent.user?.firstName ?? 'Agent'} ${agent.user?.lastName ?? ''}`;

  return (
    <div className="min-h-screen gradient-bg-primary p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToAgents', { fallback: 'Back to Agents' })}
          </Button>
        </motion.div>

        {/* Agent Header Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="agent-detail-card">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Avatar and Basic Info */}
                <div className="flex items-center gap-4 flex-1">
                  <Avatar className="h-20 w-20 ring-4 ring-background shadow-xl">
                    <AvatarImage src={agent.user?.avatar ?? ''} />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-purple-500/20">
                      {(agent.user?.firstName?.[0] ?? 'A').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold gradient-text">{agentName}</h1>
                    <p className="text-muted-foreground mt-1">{agent.user?.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={agent.availability === 'available' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {t(agent.availability)}
                      </Badge>
                      {agent.autoAssign && (
                        <Badge variant="outline">{t('autoAssign')}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    {t('sendEmail', { fallback: 'Email' })}
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {t('message', { fallback: 'Message' })}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('editProfile')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Phone className="h-4 w-4 mr-2" />
                        {t('call', { fallback: 'Call' })}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold animate-count-up">
                    {agent.performanceMetrics?.ticketsCompleted ?? 0}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('resolved')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold animate-count-up">
                    {agent.performanceMetrics?.responseTime ?? 0}m
                  </div>
                  <div className="text-sm text-muted-foreground">{t('avgResponse', { fallback: 'Avg Response' })}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold animate-count-up">
                    {(agent.performanceMetrics?.customerSatisfaction ?? 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('satisfaction')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold animate-count-up">
                    {agent.performanceMetrics?.activeTickets ?? 0}/{agent.maxConcurrentTickets}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('workload', { fallback: 'Workload' })}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{t('profile', { fallback: 'Profile' })}</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">{t('performance', { fallback: 'Performance' })}</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">{t('activity', { fallback: 'Activity' })}</span>
              </TabsTrigger>
              <TabsTrigger value="goals" className="gap-2">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">{t('goals', { fallback: 'Goals' })}</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">{t('schedule', { fallback: 'Schedule' })}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <AgentProfileTab agent={agent} />
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <AgentPerformanceTab agent={agent} />
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <AgentActivityTab agent={agent} />
            </TabsContent>

            <TabsContent value="goals" className="space-y-6">
              <AgentGoalsTab agent={agent} />
            </TabsContent>

            <TabsContent value="schedule" className="space-y-6">
              <Card className="agent-detail-card p-8">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('scheduleComingSoon', { fallback: 'Schedule Coming Soon' })}</h3>
                  <p className="text-muted-foreground">
                    {t('scheduleComingSoonDesc', { fallback: 'Schedule management features are being developed.' })}
                  </p>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

