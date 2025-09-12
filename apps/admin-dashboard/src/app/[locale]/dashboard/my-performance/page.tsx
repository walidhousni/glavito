'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  TrendingUp, 
  Clock, 
  Star, 
  CheckCircle, 
  MessageSquare,
  Calendar,
  Target,
  Award,
  BarChart3,
  Activity
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// import { useAgentPerformance } from '@/lib/hooks/use-agent';
import { useAuthStore } from '@/lib/store/auth-store';

// Mock performance data for demonstration
const mockPerformanceData = {
  currentPeriod: {
    ticketsResolved: 45,
    ticketsAssigned: 53,
    averageResponseTime: 120, // seconds
    averageResolutionTime: 3600, // seconds
    customerSatisfaction: 4.2,
    resolutionRate: 0.85,
    firstContactResolution: 0.72,
    escalationRate: 0.15
  },
  previousPeriod: {
    ticketsResolved: 38,
    ticketsAssigned: 42,
    averageResponseTime: 150,
    averageResolutionTime: 4200,
    customerSatisfaction: 4.0,
    resolutionRate: 0.81,
    firstContactResolution: 0.68,
    escalationRate: 0.18
  },
  weeklyData: [
    { week: 'Week 1', resolved: 12, assigned: 15, satisfaction: 4.1 },
    { week: 'Week 2', resolved: 10, assigned: 12, satisfaction: 4.3 },
    { week: 'Week 3', resolved: 11, assigned: 13, satisfaction: 4.0 },
    { week: 'Week 4', resolved: 12, assigned: 13, satisfaction: 4.4 }
  ],
  goals: {
    monthlyResolution: { target: 50, current: 45 },
    responseTime: { target: 60, current: 120 }, // seconds
    satisfaction: { target: 4.5, current: 4.2 },
    resolutionRate: { target: 0.90, current: 0.85 }
  },
  achievements: [
    {
      id: '1',
      title: 'Quick Responder',
      description: 'Maintained average response time under 2 minutes',
      icon: '⚡',
      earnedAt: '2024-01-15T10:00:00Z',
      type: 'speed'
    },
    {
      id: '2',
      title: 'Customer Champion',
      description: 'Achieved 4+ star rating for 30 consecutive days',
      icon: '⭐',
      earnedAt: '2024-01-10T10:00:00Z',
      type: 'satisfaction'
    },
    {
      id: '3',
      title: 'Resolution Master',
      description: 'Resolved 90% of assigned tickets this month',
      icon: '🎯',
      earnedAt: '2024-01-05T10:00:00Z',
      type: 'resolution'
    }
  ]
};

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const getChangeIndicator = (current: number, previous: number, isPercentage = false) => {
  const change = ((current - previous) / previous) * 100;
  const isPositive = change > 0;
  const color = isPositive ? 'text-green-600' : 'text-red-600';
  const symbol = isPositive ? '+' : '';
  
  return (
    <span className={`text-sm ${color} font-medium`}>
      {symbol}{change.toFixed(1)}%
    </span>
  );
};

export default function MyPerformancePage() {
  const t = useTranslations();
  const { user } = useAuthStore();
  const [timePeriod, setTimePeriod] = useState('current_month');
  
  // Use mock data for now, replace with actual hook when API is ready
  // const { performance, isLoading, error } = useAgentPerformance(user?.id);
  const performance = mockPerformanceData;
  const isLoading = false;
  const error = null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { currentPeriod, previousPeriod, goals, achievements } = performance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Performance
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your support metrics and achievements
          </p>
        </div>
        <Select value={timePeriod} onValueChange={setTimePeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_month">Current Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            <SelectItem value="last_6_months">Last 6 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentPeriod.ticketsResolved}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {getChangeIndicator(currentPeriod.ticketsResolved, previousPeriod.ticketsResolved)}
                <span>from last period</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(currentPeriod.averageResponseTime)}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {getChangeIndicator(previousPeriod.averageResponseTime, currentPeriod.averageResponseTime)}
                <span>improvement</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentPeriod.customerSatisfaction.toFixed(1)}/5</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {getChangeIndicator(currentPeriod.customerSatisfaction, previousPeriod.customerSatisfaction)}
                <span>from last period</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(currentPeriod.resolutionRate * 100).toFixed(0)}%</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {getChangeIndicator(currentPeriod.resolutionRate, previousPeriod.resolutionRate)}
                <span>from last period</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Goals Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Monthly Goals</span>
            </CardTitle>
            <CardDescription>
              Track your progress towards monthly performance targets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tickets Resolved</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {goals.monthlyResolution.current}/{goals.monthlyResolution.target}
                  </span>
                </div>
                <Progress 
                  value={(goals.monthlyResolution.current / goals.monthlyResolution.target) * 100} 
                  className="h-2"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Response Time</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formatTime(goals.responseTime.current)} / {formatTime(goals.responseTime.target)}
                  </span>
                </div>
                <Progress 
                  value={Math.max(0, 100 - ((goals.responseTime.current - goals.responseTime.target) / goals.responseTime.target) * 100)} 
                  className="h-2"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Customer Satisfaction</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {goals.satisfaction.current.toFixed(1)}/{goals.satisfaction.target.toFixed(1)}
                  </span>
                </div>
                <Progress 
                  value={(goals.satisfaction.current / goals.satisfaction.target) * 100} 
                  className="h-2"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Resolution Rate</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {(goals.resolutionRate.current * 100).toFixed(0)}%/{(goals.resolutionRate.target * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress 
                  value={(goals.resolutionRate.current / goals.resolutionRate.target) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Additional Metrics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">First Contact Resolution</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold">{(currentPeriod.firstContactResolution * 100).toFixed(0)}%</span>
                    {getChangeIndicator(currentPeriod.firstContactResolution, previousPeriod.firstContactResolution)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Escalation Rate</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold">{(currentPeriod.escalationRate * 100).toFixed(0)}%</span>
                    {getChangeIndicator(previousPeriod.escalationRate, currentPeriod.escalationRate)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Avg Resolution Time</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold">{formatTime(currentPeriod.averageResolutionTime)}</span>
                    {getChangeIndicator(previousPeriod.averageResolutionTime, currentPeriod.averageResolutionTime)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tickets Assigned</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold">{currentPeriod.ticketsAssigned}</span>
                    {getChangeIndicator(currentPeriod.ticketsAssigned, previousPeriod.ticketsAssigned)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5" />
                <span>Recent Achievements</span>
              </CardTitle>
              <CardDescription>
                Your latest performance milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className="flex items-start space-x-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20"
                  >
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{achievement.title}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {achievement.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {achievement.type}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}