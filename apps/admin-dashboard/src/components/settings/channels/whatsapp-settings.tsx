'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface WhatsAppTemplate {
  id: string;
  name: string;
  status: 'approved' | 'pending' | 'rejected';
  category: 'marketing' | 'utility' | 'authentication';
  language: string;
  lastSynced: Date;
}

interface ChannelAnalytics {
  deliveryRate: number;
  readRate: number;
  responseTime: number; // in minutes
  messageCount: number;
}

export function WhatsAppSettings() {
  const t = useTranslations('settings.channels.whatsapp');
  const [isSyncing, setIsSyncing] = useState(false);

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([
    {
      id: '1',
      name: 'order_confirmation',
      status: 'approved',
      category: 'utility',
      language: 'en',
      lastSynced: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: '2',
      name: 'shipping_update',
      status: 'approved',
      category: 'utility',
      language: 'en',
      lastSynced: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: '3',
      name: 'promotional_offer',
      status: 'pending',
      category: 'marketing',
      language: 'en',
      lastSynced: new Date(Date.now() - 30 * 60 * 1000),
    },
  ]);

  const analytics: ChannelAnalytics = {
    deliveryRate: 98.5,
    readRate: 87.2,
    responseTime: 12,
    messageCount: 2453,
  };

  const [profile, setProfile] = useState({
    businessName: 'Acme Corporation',
    businessDescription: 'Leading provider of innovative solutions',
    logoUrl: '',
    website: 'https://acme.com',
    email: 'support@acme.com',
    address: '123 Business St, City, Country',
  });

  const handleSyncTemplates = async () => {
    setIsSyncing(true);
    toast({
      title: 'Syncing templates',
      description: 'Fetching templates from WhatsApp Business API...',
    });

    // Simulate API call
    setTimeout(() => {
      setIsSyncing(false);
      toast({
        title: 'Templates synced',
        description: `${templates.length} templates synchronized successfully.`,
      });
    }, 2000);
  };

  const getStatusBadge = (status: string) => {
    const config = {
      approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
    };

    const statusConfig = config[status as keyof typeof config] || config.pending;

    return (
      <Badge className={cn('text-xs', statusConfig.color)}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const config = {
      marketing: { label: 'Marketing', color: 'bg-purple-100 text-purple-800' },
      utility: { label: 'Utility', color: 'bg-blue-100 text-blue-800' },
      authentication: { label: 'Auth', color: 'bg-indigo-100 text-indigo-800' },
    };

    const categoryConfig = config[category as keyof typeof config] || config.utility;

    return (
      <Badge variant="outline" className={cn('text-xs', categoryConfig.color)}>
        {categoryConfig.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('deliveryRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics.deliveryRate}%
            </div>
            <Progress value={analytics.deliveryRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('readRate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {analytics.readRate}%
            </div>
            <Progress value={analytics.readRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('responseTime')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.responseTime}m
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.messageCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="building" className="w-5 h-5" />
            {t('profileSettings')}
          </CardTitle>
          <CardDescription>
            Configure your WhatsApp Business profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={profile.businessName}
                onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessDescription">{t('businessDescription')}</Label>
            <Textarea
              id="businessDescription"
              rows={3}
              value={profile.businessDescription}
              onChange={(e) => setProfile({ ...profile, businessDescription: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Business Address</Label>
              <Input
                id="address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              />
            </div>
          </div>

          <Button>
            <Icon name="save" className="w-4 h-4 mr-2" />
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Message Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Icon name="messageSquare" className="w-5 h-5" />
                {t('templates')}
              </CardTitle>
              <CardDescription>
                Manage WhatsApp message templates
              </CardDescription>
            </div>
            <Button onClick={handleSyncTemplates} disabled={isSyncing}>
              {isSyncing ? (
                <>
                  <Icon name="settings" className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Icon name="download" className="w-4 h-4 mr-2" />
                  {t('syncTemplates')}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Icon name="fileText" className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{template.name}</p>
                      {getStatusBadge(template.status)}
                      {getCategoryBadge(template.category)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Language: {template.language.toUpperCase()} • Last synced:{' '}
                      {template.lastSynced.toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Icon name="eye" className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Icon name="edit" className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Product Catalog */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="package" className="w-5 h-5" />
            {t('productCatalog')}
          </CardTitle>
          <CardDescription>
            Manage products visible in WhatsApp catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Icon name="package" className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No products in catalog yet
            </p>
            <Button variant="outline">
              <Icon name="plus" className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

