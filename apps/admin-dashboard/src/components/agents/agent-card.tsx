'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  MoreHorizontal,
  Edit,
  Activity,
  Settings,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AgentProfile } from '@/lib/api/team';

interface AgentCardProps {
  agent: AgentProfile;
  index?: number;
  onEdit?: (agent: AgentProfile) => void;
  onViewPerformance?: (agent: AgentProfile) => void;
  locale: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'available':
      return 'bg-green-500';
    case 'busy':
      return 'bg-yellow-500';
    case 'away':
      return 'bg-orange-500';
    case 'offline':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'available':
      return <CheckCircle className="h-4 w-4" />;
    case 'busy':
      return <Clock className="h-4 w-4" />;
    case 'away':
      return <AlertCircle className="h-4 w-4" />;
    case 'offline':
      return <User className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
};

const getTrendIcon = (current: number, previous: number) => {
  if (current > previous) return <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />;
  if (current < previous) return <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />;
  return <Minus className="h-3 w-3 text-gray-600 dark:text-gray-400" />;
};

export function AgentCard({ agent, index = 0, onEdit, onViewPerformance, locale }: AgentCardProps) {
  const t = useTranslations('agents');
  const router = useRouter();

  const handleViewProfile = () => {
    // Navigate to agent detail page - keeping this route for detailed views
    router.push(`/${locale}/dashboard/agents/${agent.userId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className="agent-card-enhanced">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
                  <AvatarImage src={agent.user?.avatar ?? ''} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-purple-500/20">
                    {(agent.user?.firstName?.[0] ?? 'A').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-black ${getStatusColor(
                    agent.availability
                  )}`}
                >
                  {agent.availability === 'available' && (
                    <span className="absolute inset-0 rounded-full bg-green-400 animate-ping" />
                  )}
                </div>
              </div>
              <div>
                <CardTitle className="text-lg hover:text-primary transition-colors cursor-pointer" onClick={handleViewProfile}>
                  {agent.displayName || `${agent.user?.firstName ?? 'Agent'} ${agent.user?.lastName ?? ''}`}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {agent.languages.join(', ') || 'No languages specified'}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleViewProfile}>
                  <User className="h-4 w-4 mr-2" />
                  {t('viewProfile', { fallback: 'View Profile' })}
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(agent)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t('editProfile')}
                  </DropdownMenuItem>
                )}
                {onViewPerformance && (
                  <DropdownMenuItem onClick={() => onViewPerformance(agent)}>
                    <Activity className="h-4 w-4 mr-2" />
                    {t('viewPerformance')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  {t('settings')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(agent.availability)}
                <span className="text-sm font-medium capitalize">{t(agent.availability)}</span>
              </div>
              <Badge variant={agent.autoAssign ? 'default' : 'secondary'} className="rounded-md">
                {agent.autoAssign ? t('autoAssign') : t('manual')}
              </Badge>
            </div>

            {/* Workload */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">{t('currentWorkload')}</span>
                <span className="font-medium">
                  {agent.performanceMetrics?.activeTickets ?? 0}/{agent.maxConcurrentTickets}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 animate-progress-fill"
                  style={{
                    width: `${Math.min(
                      ((agent.performanceMetrics?.activeTickets ?? 0) / Math.max(agent.maxConcurrentTickets, 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="agent-metric-card p-3">
                <div className="text-xs text-muted-foreground mb-1">{t('responseTime')}</div>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold animate-count-up">
                    {agent.performanceMetrics?.responseTime ?? 0}m
                  </div>
                  {getTrendIcon(agent.performanceMetrics?.responseTime ?? 0, 30)}
                </div>
              </div>
              <div className="agent-metric-card p-3">
                <div className="text-xs text-muted-foreground mb-1">{t('resolutionRate')}</div>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold animate-count-up">
                    {(() => {
                      const assigned = agent.performanceMetrics?.ticketsAssigned ?? 0;
                      const completed = agent.performanceMetrics?.ticketsCompleted ?? 0;
                      return assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
                    })()}
                    %
                  </div>
                  {getTrendIcon(agent.performanceMetrics?.ticketsCompleted ?? 0, 10)}
                </div>
              </div>
              <div className="agent-metric-card p-3">
                <div className="text-xs text-muted-foreground mb-1">{t('satisfaction')}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-lg font-bold animate-count-up">
                    <Star className="h-4 w-4 text-yellow-500 mr-1 fill-yellow-500" />
                    {(agent.performanceMetrics?.customerSatisfaction ?? 0).toFixed(1)}
                  </div>
                </div>
              </div>
              <div className="agent-metric-card p-3">
                <div className="text-xs text-muted-foreground mb-1">{t('resolved')}</div>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold animate-count-up">
                    {agent.performanceMetrics?.ticketsCompleted ?? 0}
                  </div>
                  {getTrendIcon(agent.performanceMetrics?.ticketsCompleted ?? 0, 15)}
                </div>
              </div>
            </div>

            {/* Skills */}
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">{t('skills')}</div>
              <div className="flex flex-wrap gap-1.5">
                {agent.skills.slice(0, 3).map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="text-xs rounded-md bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800"
                  >
                    {skill.replace('_', ' ')}
                  </Badge>
                ))}
                {agent.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs rounded-md">
                    +{agent.skills.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

