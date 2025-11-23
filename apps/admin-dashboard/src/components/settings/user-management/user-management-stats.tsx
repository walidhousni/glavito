'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Users, CheckCircle, Clock, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UserManagementStatsProps {
  stats: {
    total: number;
    available: number;
    avgResponseTime: number;
    avgSatisfaction: string;
  };
}

export function UserManagementStats({ stats }: UserManagementStatsProps) {
  const t = useTranslations('settings.userManagement');

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('stats.total', { fallback: 'Total Users' })}</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">{t('stats.totalDesc', { fallback: 'Active team members' })}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('stats.available', { fallback: 'Available' })}</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.available}</div>
          <p className="text-xs text-muted-foreground mt-1">{t('stats.availableDesc', { fallback: 'Currently available' })}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('stats.avgResponse', { fallback: 'Avg Response' })}</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgResponseTime}m</div>
          <p className="text-xs text-muted-foreground mt-1">{t('stats.avgResponseDesc', { fallback: 'Average response time' })}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('stats.satisfaction', { fallback: 'Satisfaction' })}</CardTitle>
          <Star className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgSatisfaction}</div>
          <p className="text-xs text-muted-foreground mt-1">{t('stats.satisfactionDesc', { fallback: 'Average rating' })}</p>
        </CardContent>
      </Card>
    </div>
  );
}
