'use client';

import React, { useEffect, useState } from 'react';
import { Heart, Star, TrendingUp, MessageSquare, Mail, Smartphone, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { satisfactionApi } from '@/lib/api/satisfaction-client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function SatisfactionOverviewWidget() {
  const [analytics, setAnalytics] = useState<{
    totalSurveys?: number;
    totalSent?: number;
    totalResponded?: number;
    averageRating?: number;
    responseRate?: number;
    satisfactionBreakdown?: {
      totalResponses: number;
      positivePct: number;
      neutralPct: number;
      negativePct: number;
    };
    ratingDistribution?: Record<number, number>;
    channelBreakdown?: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        // Get last 30 days analytics
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        const data = await satisfactionApi.getSurveyAnalytics({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }).catch(() => null);
        
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to load satisfaction analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= Math.round(rating);
          return (
            <Star
              key={star}
              className={cn(
                'h-4 w-4 transition-all duration-300',
                isFilled
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-muted-foreground/20'
              )}
            />
          );
        })}
      </div>
    );
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
    if (rating >= 4) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    if (rating >= 3) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
  };

  const getResponseRateColor = (rate: number) => {
    if (rate >= 50) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
    if (rate >= 30) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
  };

  if (loading) {
    return (
      <Card className="dashboard-card-elevated h-full border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/20">
              <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
            </div>
            Customer Satisfaction
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!analytics || (analytics.totalSurveys === 0 && analytics.totalSent === 0)) {
    return (
      <Card className="dashboard-card-elevated h-full border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/20">
                <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              Customer Satisfaction
            </CardTitle>
            <CardDescription>Survey responses and CSAT metrics</CardDescription>
          </div>
          <Link href="/dashboard/surveys/analytics">
            <Button variant="ghost" size="sm" className="hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-600 dark:hover:text-pink-400 transition-colors">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-50 dark:bg-pink-900/10 rounded-full mb-4 animate-pulse">
              <Heart className="h-8 w-8 text-pink-300 dark:text-pink-700" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">No surveys sent yet</p>
            <Link href="/dashboard/surveys">
              <Button variant="outline" size="sm" className="border-pink-200 hover:bg-pink-50 hover:text-pink-600 dark:border-pink-800 dark:hover:bg-pink-900/20">
                Create Survey
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle both API response formats
  const totalSurveys = analytics.totalSurveys || analytics.totalSent || 0;
  const totalResponded = analytics.satisfactionBreakdown?.totalResponses || analytics.totalResponded || 0;
  const avgRating = analytics.averageRating || 0;
  const responseRate = analytics.responseRate || 0;
  
  // Calculate satisfaction breakdown from ratingDistribution if needed
  let ratingDist = analytics.satisfactionBreakdown;
  if (!ratingDist && analytics.ratingDistribution) {
    const dist = analytics.ratingDistribution;
    const total = (dist[1] || 0) + (dist[2] || 0) + (dist[3] || 0) + (dist[4] || 0) + (dist[5] || 0);
    if (total > 0) {
      ratingDist = {
        totalResponses: total,
        positivePct: (((dist[4] || 0) + (dist[5] || 0)) / total) * 100,
        neutralPct: ((dist[3] || 0) / total) * 100,
        negativePct: (((dist[1] || 0) + (dist[2] || 0)) / total) * 100,
      };
    }
  }
  
  if (!ratingDist) {
    ratingDist = {
      totalResponses: 0,
      positivePct: 0,
      neutralPct: 0,
      negativePct: 0,
    };
  }

  return (
    <Card className="dashboard-card-elevated h-full border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
      
      <CardHeader className="flex flex-row items-center justify-between pb-4 relative">
        <div>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 shadow-sm">
              <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
              Customer Satisfaction
            </span>
          </CardTitle>
          <CardDescription className="mt-1 ml-1">Last 30 days performance</CardDescription>
        </div>
        <Link href="/dashboard/surveys/analytics">
          <Button variant="ghost" size="sm" className="gap-1 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-600 dark:hover:text-pink-400 transition-all duration-300">
            View All
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="space-y-6 relative">
        {/* Main Metrics */}
        <div className="grid grid-cols-2 gap-4">
          {/* Average Rating */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-sm backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Average CSAT</span>
              <Badge variant="outline" className={cn('text-xs font-semibold border', getRatingColor(avgRating))}>
                {avgRating.toFixed(1)}/5
              </Badge>
            </div>
            <div className="space-y-2">
              {renderStars(avgRating)}
              <p className={cn('text-3xl font-bold tracking-tight', getRatingColor(avgRating).split(' ')[0])}>
                {avgRating.toFixed(1)}
              </p>
            </div>
          </motion.div>

          {/* Response Rate */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-sm backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Response Rate</span>
              <Badge variant="outline" className={cn('text-xs font-semibold border', getResponseRateColor(responseRate))}>
                {responseRate.toFixed(1)}%
              </Badge>
            </div>
            <div className="space-y-2">
              <Progress value={responseRate} className="h-2 bg-slate-100 dark:bg-slate-800" indicatorClassName={cn(getResponseRateColor(responseRate).split(' ')[0].replace('text-', 'bg-'))} />
              <p className={cn('text-3xl font-bold tracking-tight', getResponseRateColor(responseRate).split(' ')[0])}>
                {responseRate.toFixed(1)}%
              </p>
            </div>
          </motion.div>
        </div>

        {/* Survey Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span>Surveys Sent</span>
            </div>
            <p className="text-xl font-semibold pl-6">{totalSurveys.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span>Responses</span>
            </div>
            <p className="text-xl font-semibold pl-6">{totalResponded.toLocaleString()}</p>
          </div>
        </div>

        {/* Rating Distribution */}
        {ratingDist.totalResponses > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Satisfaction Breakdown</span>
            </div>
            <div className="space-y-3">
              {/* Positive (4-5 stars) */}
              <div className="flex items-center gap-3 group">
                <div className="flex items-center gap-2 w-20">
                  <div className="p-1 rounded bg-emerald-100 dark:bg-emerald-900/30">
                    <Star className="h-3 w-3 text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Positive</span>
                </div>
                <Progress value={ratingDist.positivePct} className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-emerald-500" />
                <span className="text-xs font-bold w-12 text-right text-emerald-600 dark:text-emerald-400">
                  {ratingDist.positivePct.toFixed(0)}%
                </span>
              </div>
              
              {/* Neutral (3 stars) */}
              <div className="flex items-center gap-3 group">
                <div className="flex items-center gap-2 w-20">
                  <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/30">
                    <Star className="h-3 w-3 text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Neutral</span>
                </div>
                <Progress value={ratingDist.neutralPct} className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-amber-500" />
                <span className="text-xs font-bold w-12 text-right text-amber-600 dark:text-amber-400">
                  {ratingDist.neutralPct.toFixed(0)}%
                </span>
              </div>
              
              {/* Negative (1-2 stars) */}
              <div className="flex items-center gap-3 group">
                <div className="flex items-center gap-2 w-20">
                  <div className="p-1 rounded bg-red-100 dark:bg-red-900/30">
                    <Star className="h-3 w-3 text-red-600 dark:text-red-400 fill-red-600 dark:fill-red-400" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Negative</span>
                </div>
                <Progress value={ratingDist.negativePct} className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-red-500" />
                <span className="text-xs font-bold w-12 text-right text-red-600 dark:text-red-400">
                  {ratingDist.negativePct.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Channel Breakdown */}
        {analytics.channelBreakdown && Object.keys(analytics.channelBreakdown).length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
            <span className="text-sm font-medium text-muted-foreground">By Channel</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analytics.channelBreakdown).map(([channel, count]) => (
                <Badge 
                  key={channel} 
                  variant="secondary" 
                  className="gap-1.5 py-1 pl-1.5 pr-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {channel === 'whatsapp' ? (
                    <div className="p-1 rounded-full bg-green-100 dark:bg-green-900/30">
                      <Smartphone className="h-3 w-3 text-green-600 dark:text-green-400" />
                    </div>
                  ) : channel === 'email' ? (
                    <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <Mail className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                  ) : (
                    <div className="p-1 rounded-full bg-slate-200 dark:bg-slate-700">
                      <MessageSquare className="h-3 w-3 text-slate-600 dark:text-slate-400" />
                    </div>
                  )}
                  <span className="capitalize font-medium">{channel}</span>
                  <span className="text-xs opacity-70 border-l border-slate-300 dark:border-slate-600 pl-1.5 ml-0.5">
                    {String(count)}
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

