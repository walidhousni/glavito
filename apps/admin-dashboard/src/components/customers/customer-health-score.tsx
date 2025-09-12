'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Activity,
  MessageSquare,
  Clock,
  Star,
  Zap,
  RefreshCw,
  Shield,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerHealthScoreProps {
  customerId: string;
  healthScore: {
    score: number;
    factors: {
      ticketVolume: number;
      responseTime: number;
      satisfaction: number;
      engagement: number;
      churnRisk: number;
    };
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  };
  onRefresh?: () => void;
  loading?: boolean;
}

export function CustomerHealthScore({ 
  customerId, 
  healthScore, 
  onRefresh, 
  loading = false 
}: CustomerHealthScoreProps) {
  const t = useTranslations('customers');

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'health-excellent';
    if (score >= 60) return 'health-good';
    if (score >= 40) return 'health-fair';
    return 'health-poor';
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'badge-success';
      case 'medium': return 'badge-warning';
      case 'high': return 'badge-danger';
      case 'critical': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return CheckCircle;
      case 'medium': return Activity;
      case 'high': return AlertTriangle;
      case 'critical': return Shield;
      default: return Activity;
    }
  };

  const getFactorIcon = (factor: string) => {
    switch (factor) {
      case 'ticketVolume': return MessageSquare;
      case 'responseTime': return Clock;
      case 'satisfaction': return Star;
      case 'engagement': return Activity;
      case 'churnRisk': return TrendingDown;
      default: return Target;
    }
  };

  const getFactorLabel = (factor: string) => {
    switch (factor) {
      case 'ticketVolume': return t('healthScore.ticketVolume');
      case 'responseTime': return t('healthScore.responseTime');
      case 'satisfaction': return t('healthScore.satisfaction');
      case 'engagement': return t('healthScore.engagement');
      case 'churnRisk': return t('healthScore.churnRisk');
      default: return factor;
    }
  };

  const RiskIcon = getRiskIcon(healthScore.riskLevel);

  return (
    <div className="space-y-6">
      {/* Main Health Score Card */}
      <div className="customer-card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900/30">
                <Heart className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-title">{t('healthScore.title')}</div>
                <div className="text-caption">Real-time customer health monitoring</div>
              </div>
            </CardTitle>
            <div className="flex items-center gap-3">
              <Badge className={getRiskLevelColor(healthScore.riskLevel)}>
                <RiskIcon className="h-3 w-3 mr-1" />
                {t(`riskLevel.${healthScore.riskLevel}`)}
              </Badge>
              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Score Display */}
          <div className="flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <div className={cn("text-5xl font-bold", getScoreColor(healthScore.score))}>
                  {healthScore.score}
                </div>
                <div className="text-2xl text-muted-foreground">/100</div>
              </div>
              <Progress value={healthScore.score} className="w-40 h-2 mx-auto" />
            </div>
          </div>

          {/* Health Factors */}
          <div className="space-y-4">
            <div className="section-header">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h4 className="section-title">{t('healthScore.factors')}</h4>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(healthScore.factors).map(([factor, value]) => {
                const Icon = getFactorIcon(factor);
                const label = getFactorLabel(factor);
                const displayValue = factor === 'churnRisk' ? 100 - value : value;
                
                return (
                  <div key={factor} className="metric-card">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="font-medium text-sm text-foreground">{label}</div>
                      </div>
                      <div className={cn("text-lg font-bold", getScoreColor(displayValue))}>
                        {Math.round(value)}%
                      </div>
                    </div>
                    <Progress value={displayValue} className="h-2" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            <div className="section-header">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h4 className="section-title">{t('healthScore.recommendations')}</h4>
              </div>
            </div>
            {healthScore.recommendations && healthScore.recommendations.length > 0 ? (
              <div className="space-y-3">
                {healthScore.recommendations.map((recommendation, index) => (
                  <div key={index} className="customer-card p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 mt-1">
                        <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-sm text-foreground leading-relaxed">{recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-3 mx-auto">
                  <Star className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">No Recommendations Available</h3>
                <p className="text-xs text-muted-foreground mb-2">AI-powered recommendations will appear here based on customer behavior.</p>
                <p className="text-xs text-muted-foreground">Check back as more interaction data becomes available.</p>
              </div>
            )}
          </div>

          {/* Recent Trend */}
          <div className="space-y-4">
            <div className="section-header">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                <h4 className="section-title">Recent Trend</h4>
              </div>
            </div>
            
            <div className="metric-card-success">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/30">
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Last 30 Days</div>
                    <div className="text-caption">Health score improvement</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">+5.2</div>
                  <div className="text-caption">points</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3 pt-6 border-t">
            <Button size="lg" variant="outline" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Customer
            </Button>
            <Button size="lg" variant="outline" className="flex-1">
              <Activity className="h-4 w-4 mr-2" />
              View History
            </Button>
          </div>
        </CardContent>
      </div>
    </div>
  );
}