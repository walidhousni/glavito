'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { glavaiClient, type WidgetData } from '@/lib/api/glavai-client';
import { Brain, TrendingUp, AlertTriangle, Smile, Meh, Frown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GlavaiInsightsWidget() {
  const t = useTranslations('glavaiInsights.widget');
  const [data, setData] = useState<WidgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const widgetData = await glavaiClient.getInsightsWidget();
        setData(widgetData);
      } catch (error) {
        console.error('Failed to fetch GLAVAI insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50/30 to-white dark:from-purple-950/20 dark:to-slate-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 animate-pulse">
              <Brain className="h-4 w-4 text-white" />
            </div>
            {t('title')}
          </CardTitle>
          <CardDescription className="text-xs">{t('loading')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data) return null;

  // Safely handle potentially undefined sentimentSnapshot
  const sentimentSnapshot = data.sentimentSnapshot || { positive: 0, negative: 0, neutral: 0 };
  const totalSentiment = sentimentSnapshot.positive + sentimentSnapshot.negative + sentimentSnapshot.neutral;
  const positivePercent = totalSentiment > 0 ? Math.round((sentimentSnapshot.positive / totalSentiment) * 100) : 0;
  const negativePercent = totalSentiment > 0 ? Math.round((sentimentSnapshot.negative / totalSentiment) * 100) : 0;
  const neutralPercent = totalSentiment > 0 ? Math.round((sentimentSnapshot.neutral / totalSentiment) * 100) : 0;

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50/30 to-white dark:from-purple-950/20 dark:to-slate-900 hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Brain className="h-4 w-4 text-white" />
          </div>
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Auto-Resolves */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200/50 dark:border-green-800/50">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">{t('autoResolves')}</p>
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
                <TrendingUp className="h-3 w-3 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {data.autoResolvesToday}
            </p>
          </div>

          {/* Escalation Alerts */}
          <div className="p-3 rounded-lg bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200/50 dark:border-orange-800/50">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">{t('escalationAlerts')}</p>
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-sm">
                <AlertTriangle className="h-3 w-3 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {data.escalationAlerts}
            </p>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200/50 dark:border-blue-800/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">{t('avgConfidence')}</p>
            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              {Math.round(data.avgConfidence * 100)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${(data.avgConfidence * 100).toFixed(0)}%` }}
            />
          </div>
        </div>

        {/* Sentiment Snapshot */}
        <div className="p-3 rounded-lg bg-gradient-to-br from-slate-50/50 to-gray-50/50 dark:from-slate-900/30 dark:to-gray-900/30 border border-slate-200/50 dark:border-slate-700/50">
          <p className="text-xs font-medium text-muted-foreground mb-3">{t('sentiment')}</p>
          <div className="space-y-2">
            {/* Positive */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Smile className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span className="text-muted-foreground">{t('positive')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                    style={{ width: `${positivePercent}%` }}
                  />
                </div>
                <span className="font-semibold text-foreground w-8 text-right">{positivePercent}%</span>
              </div>
            </div>

            {/* Neutral */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Meh className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                <span className="text-muted-foreground">{t('neutral')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gray-500 to-slate-500"
                    style={{ width: `${neutralPercent}%` }}
                  />
                </div>
                <span className="font-semibold text-foreground w-8 text-right">{neutralPercent}%</span>
              </div>
            </div>

            {/* Negative */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Frown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                <span className="text-muted-foreground">{t('negative')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-rose-500"
                    style={{ width: `${negativePercent}%` }}
                  />
                </div>
                <span className="font-semibold text-foreground w-8 text-right">{negativePercent}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Full Button */}
        <Link href="/dashboard/glavai-insights">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-center h-9 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 dark:hover:from-purple-950/50 dark:hover:to-blue-950/50 transition-all duration-200 group"
          >
            {t('viewFull')}
            <ArrowRight className="h-3.5 w-3.5 ml-1 transform group-hover:translate-x-1 transition-transform duration-200" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
