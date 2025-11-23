'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { useWhiteLabel } from '@/lib/hooks/use-white-label';

interface WhiteLabelStats {
  assetsCount: number;
  domainsCount: number;
  deliverabilityScore: number;
}

interface RecentChange {
  id: string;
  action: string;
  timestamp: Date;
  user: string;
}

export function WhiteLabelDashboard() {
  const t = useTranslations('settings.whiteLabel.dashboard');
  const { settings } = useWhiteLabel();

  // Mock stats - replace with actual API calls
  const stats: WhiteLabelStats = {
    assetsCount: 12,
    domainsCount: 2,
    deliverabilityScore: 87,
  };

  const recentChanges: RecentChange[] = [
    {
      id: '1',
      action: 'Updated primary logo',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      user: 'John Doe',
    },
    {
      id: '2',
      action: 'Added custom domain',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      user: 'Jane Smith',
    },
    {
      id: '3',
      action: 'Modified color scheme',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      user: 'John Doe',
    },
  ];

  const tier = settings?.whiteLabelTier || 'basic';

  const getTierBadge = () => {
    const tierConfig = {
      basic: { label: 'Basic', color: 'bg-gray-100 text-gray-800' },
      advanced: { label: 'Advanced', color: 'bg-blue-100 text-blue-800' },
      enterprise: { label: 'Enterprise', color: 'bg-purple-100 text-purple-800' },
    };

    const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.basic;

    return (
      <Badge className={cn('text-xs font-medium', config.color)}>
        {config.label}
      </Badge>
    );
  };

  const getDeliverabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{t('title')}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{t('currentTier')}:</span>
          {getTierBadge()}
          <Button variant="default" size="sm">
            <Icon name="trendingUp" className="w-4 h-4 mr-2" />
            {t('upgrade')}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.assets')}</CardTitle>
            <Icon name="package" className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assetsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Brand assets uploaded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.domains')}</CardTitle>
            <Icon name="globe" className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.domainsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Custom domains active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.deliverability')}
            </CardTitle>
            <Icon name="barChart" className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={cn('text-2xl font-bold', getDeliverabilityColor(stats.deliverabilityScore))}>
                {stats.deliverabilityScore}%
              </div>
              <Progress value={stats.deliverabilityScore} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brand Preview */}
      <Card>
        <CardHeader>
          <CardTitle>{t('preview')}</CardTitle>
          <CardDescription>
            Live preview of your brand identity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 p-6 bg-gradient-to-br from-muted/50 to-muted rounded-lg border">
            {/* Logo */}
            <div className="flex-shrink-0">
              {settings?.branding?.logoUrl ? (
                <img
                  src={settings.branding.logoUrl}
                  alt="Logo"
                  className="h-16 w-auto object-contain"
                />
              ) : (
                <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon name="building" className="w-8 h-8 text-primary" />
                </div>
              )}
            </div>

            {/* Colors */}
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Brand Colors</p>
                <div className="flex gap-2">
                  {[
                    settings?.branding?.primaryColor || '#3B82F6',
                    settings?.branding?.secondaryColor || '#0EA5E9',
                    settings?.branding?.accentColor || '#8B5CF6',
                  ].map((color, index) => (
                    <div
                      key={index}
                      className="w-12 h-12 rounded-lg border shadow-sm"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Font */}
              <div>
                <p className="text-sm font-medium mb-1">Typography</p>
                <p
                  className="text-lg"
                  style={{
                    fontFamily: settings?.branding?.fontFamily || 'Inter, sans-serif',
                  }}
                >
                  {settings?.company?.name || 'Your Company Name'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm">
                <Icon name="edit" className="w-4 h-4 mr-2" />
                Edit Branding
              </Button>
              <Button variant="outline" size="sm">
                <Icon name="eye" className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Changes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recentChanges')}</CardTitle>
          <CardDescription>
            Recent modifications to your white label settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentChanges.map((change) => (
              <div
                key={change.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                  <div>
                    <p className="text-sm font-medium">{change.action}</p>
                    <p className="text-xs text-muted-foreground">
                      by {change.user}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(change.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

