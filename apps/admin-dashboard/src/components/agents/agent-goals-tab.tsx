'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Trophy,
  Target,
  Star,
  Award,
  TrendingUp,
  Plus,
  Calendar,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { AgentProfile } from '@/lib/api/team';
import { useAgentGoals } from '@/lib/hooks/use-agent-goals';

interface AgentGoalsTabProps {
  agent: AgentProfile;
}

export function AgentGoalsTab({ agent }: AgentGoalsTabProps) {
  const t = useTranslations('agents');
  const { goals, achievements, isLoading } = useAgentGoals(agent.userId);
  const [showCreateGoal, setShowCreateGoal] = useState(false);

  // Mock data for demonstration - will be replaced by real data from useAgentGoals
  const mockGoals = [
    {
      id: '1',
      type: 'daily',
      metric: 'tickets_resolved',
      target: 10,
      current: 7,
      progress: 70,
      startDate: new Date(),
      endDate: new Date(),
      achieved: false,
    },
    {
      id: '2',
      type: 'weekly',
      metric: 'csat_score',
      target: 4.5,
      current: 4.7,
      progress: 100,
      startDate: new Date(),
      endDate: new Date(),
      achieved: true,
    },
    {
      id: '3',
      type: 'monthly',
      metric: 'response_time',
      target: 15,
      current: 12,
      progress: 100,
      startDate: new Date(),
      endDate: new Date(),
      achieved: true,
    },
  ];

  const mockAchievements = [
    { id: '1', badgeType: 'first_ticket', earnedAt: new Date(), name: 'First Ticket', description: 'Resolved your first ticket' },
    { id: '2', badgeType: 'speed_demon', earnedAt: new Date(), name: 'Speed Demon', description: 'Response time under 5 minutes' },
    { id: '3', badgeType: 'customer_favorite', earnedAt: new Date(), name: 'Customer Favorite', description: '5.0 satisfaction rating' },
    { id: '4', badgeType: 'problem_solver', earnedAt: new Date(), name: 'Problem Solver', description: 'Resolved 100 tickets' },
  ];

  const displayGoals = goals.length > 0 ? goals : mockGoals;
  const displayAchievements = achievements.length > 0 ? achievements : mockAchievements;

  const getGoalMetricLabel = (metric: string) => {
    switch (metric) {
      case 'tickets_resolved':
        return t('ticketsResolved', { fallback: 'Tickets Resolved' });
      case 'response_time':
        return t('responseTime', { fallback: 'Response Time' });
      case 'csat_score':
        return t('csatScore', { fallback: 'CSAT Score' });
      default:
        return metric;
    }
  };

  const getGoalTypeColor = (type: string) => {
    switch (type) {
      case 'daily':
        return 'bg-blue-500';
      case 'weekly':
        return 'bg-purple-500';
      case 'monthly':
        return 'bg-pink-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getBadgeColor = (badgeType: string) => {
    const colors = [
      'from-yellow-400 via-orange-500 to-red-500',
      'from-blue-400 via-purple-500 to-pink-500',
      'from-green-400 via-teal-500 to-blue-500',
      'from-purple-400 via-pink-500 to-red-500',
    ];
    return colors[parseInt(badgeType.length.toString()) % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Goals Section */}
      <Card className="agent-detail-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('goals', { fallback: 'Goals' })}
          </CardTitle>
          <Button size="sm" onClick={() => setShowCreateGoal(!showCreateGoal)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('createGoal', { fallback: 'Create Goal' })}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {displayGoals.length === 0 && !isLoading ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('noGoals', { fallback: 'No goals set yet' })}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayGoals.map((goal, index) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded-md text-xs font-medium text-white ${getGoalTypeColor(goal.type)}`}>
                        {goal.type.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">{getGoalMetricLabel(goal.metric)}</div>
                        <div className="text-sm text-muted-foreground">
                          {goal.current} / {goal.target}
                        </div>
                      </div>
                    </div>
                    {goal.achieved && (
                      <Badge variant="default" className="bg-green-500">
                        <Trophy className="h-3 w-3 mr-1" />
                        {t('achieved', { fallback: 'Achieved' })}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Progress value={goal.progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{goal.progress}% {t('complete', { fallback: 'complete' })}</span>
                      {goal.achieved ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-3 w-3" />
                          {t('goalAchieved', { fallback: 'Goal achieved!' })}
                        </span>
                      ) : (
                        <span>{t('inProgress', { fallback: 'In progress' })}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements Section */}
      <Card className="agent-detail-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {t('achievements', { fallback: 'Achievements' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {displayAchievements.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('noAchievements', { fallback: 'No achievements yet' })}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {displayAchievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative"
                >
                  <div className="aspect-square rounded-2xl bg-gradient-to-br p-1 shadow-lg hover:shadow-xl transition-all cursor-pointer group-hover:scale-105"
                  >
                    <div className="h-full w-full rounded-xl bg-card/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                      <Trophy className="h-8 w-8 text-yellow-500 mb-2 animate-achievement-unlock" />
                      <div className="text-xs font-medium text-center">{(achievement as any).name ?? achievement.badgeType}</div>
                    </div>
                  </div>
                  <div className="absolute inset-x-0 -bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-popover border border-border rounded-lg p-2 text-xs text-center shadow-xl">
                      {(achievement as any).description ?? t('achievementEarned', { fallback: 'Achievement earned!' })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="agent-metric-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold animate-count-up">{displayGoals.length}</div>
                <div className="text-sm text-muted-foreground">{t('activeGoals', { fallback: 'Active Goals' })}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="agent-metric-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold animate-count-up">
                  {displayGoals.filter(g => g.achieved).length}
                </div>
                <div className="text-sm text-muted-foreground">{t('goalsAchieved', { fallback: 'Goals Achieved' })}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="agent-metric-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold animate-count-up">{displayAchievements.length}</div>
                <div className="text-sm text-muted-foreground">{t('totalAchievements', { fallback: 'Achievements' })}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

