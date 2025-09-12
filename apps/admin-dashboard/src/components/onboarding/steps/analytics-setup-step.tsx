'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Settings,
  Mail,
  CheckCircle
} from 'lucide-react';

interface AnalyticsSetupStepProps {
  data: any;
  onComplete: (data: any) => Promise<void>;
  isLoading: boolean;
}

export function AnalyticsSetupStep({ data, onComplete, isLoading }: AnalyticsSetupStepProps) {
  const t = useTranslations('onboarding.steps.analytics');
  const tn = useTranslations('onboarding');
  const tr = (key: string, fallback: string) => {
    try {
      const value = t(key as any);
      return value === key ? fallback : value;
    } catch {
      return fallback;
    }
  };
  
  const [analyticsConfig, setAnalyticsConfig] = useState({
    enableDashboard: data.enableDashboard ?? true,
    enableReporting: data.enableReporting ?? true,
    enableSurveys: data.enableSurveys ?? false,
    googleAnalyticsId: data.googleAnalyticsId || '',
    reportingEmail: data.reportingEmail || '',
    reportFrequency: data.reportFrequency || 'weekly',
  });

  const dashboardWidgets = [
    {
      id: 'ticket-overview',
      name: tr('widgets.ticketOverview.name', 'Ticket Overview'),
      description: tr('widgets.ticketOverview.description', 'Summary of ticket status and volume'),
      icon: BarChart3,
      enabled: true,
    },
    {
      id: 'response-times',
      name: tr('widgets.responseTimes.name', 'Response Times'),
      description: tr('widgets.responseTimes.description', 'Average response and resolution times'),
      icon: Clock,
      enabled: true,
    },
    {
      id: 'customer-satisfaction',
      name: tr('widgets.customerSatisfaction.name', 'Customer Satisfaction'),
      description: tr('widgets.customerSatisfaction.description', 'CSAT scores and feedback trends'),
      icon: TrendingUp,
      enabled: analyticsConfig.enableSurveys,
    },
    {
      id: 'agent-performance',
      name: tr('widgets.agentPerformance.name', 'Agent Performance'),
      description: tr('widgets.agentPerformance.description', 'Individual agent metrics and rankings'),
      icon: Users,
      enabled: true,
    },
  ];

  const handleSubmit = async () => {
    const analyticsData = {
      ...analyticsConfig,
      dashboards: [
        {
          name: tr('defaults.dashboardName', 'Main Dashboard'),
          widgets: dashboardWidgets.filter(w => w.enabled).map(w => ({
            type: w.id,
            title: w.name,
            position: { x: 0, y: 0, width: 6, height: 4 },
          })),
        },
      ],
      kpis: [
        {
          name: tr('defaults.kpiNames.averageResponseTime', 'Average Response Time'),
          category: 'performance',
          target: 4, // hours
          unit: 'hours',
        },
        {
          name: tr('defaults.kpiNames.customerSatisfaction', 'Customer Satisfaction'),
          category: 'satisfaction',
          target: 4.5,
          unit: 'rating',
        },
        {
          name: tr('defaults.kpiNames.firstContactResolution', 'First Contact Resolution'),
          category: 'efficiency',
          target: 80,
          unit: 'percentage',
        },
      ],
      integrations: analyticsConfig.googleAnalyticsId ? [
        {
          type: 'google_analytics',
          config: { trackingId: analyticsConfig.googleAnalyticsId },
        },
      ] : [],
    };

    await onComplete(analyticsData);
  };

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            <CardTitle>{tr('overview.title', 'Analytics Overview')}</CardTitle>
          </div>
          <CardDescription>
            {tr('overview.description', 'Set up dashboards, reports, and key performance indicators')}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Analytics Features */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${
            analyticsConfig.enableDashboard ? 'border-primary bg-primary/5' : 'border-gray-200'
          }`}
          onClick={() => setAnalyticsConfig({ ...analyticsConfig, enableDashboard: !analyticsConfig.enableDashboard })}
        >
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">{tr('features.dashboard.title', 'Dashboard')}</CardTitle>
            <CardDescription>{tr('features.dashboard.description', 'Real-time metrics and insights')}</CardDescription>
            {analyticsConfig.enableDashboard && <CheckCircle className="w-5 h-5 text-green-500 mx-auto mt-2" />}
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            analyticsConfig.enableReporting ? 'border-primary bg-primary/5' : 'border-gray-200'
          }`}
          onClick={() => setAnalyticsConfig({ ...analyticsConfig, enableReporting: !analyticsConfig.enableReporting })}
        >
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">{tr('features.reporting.title', 'Automated Reports')}</CardTitle>
            <CardDescription>{tr('features.reporting.description', 'Scheduled email reports')}</CardDescription>
            {analyticsConfig.enableReporting && <CheckCircle className="w-5 h-5 text-green-500 mx-auto mt-2" />}
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            analyticsConfig.enableSurveys ? 'border-primary bg-primary/5' : 'border-gray-200'
          }`}
          onClick={() => setAnalyticsConfig({ ...analyticsConfig, enableSurveys: !analyticsConfig.enableSurveys })}
        >
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-lg">{tr('features.surveys.title', 'Customer Surveys')}</CardTitle>
            <CardDescription>{tr('features.surveys.description', 'Collect customer feedback')}</CardDescription>
            <Badge className="mt-2 bg-yellow-100 text-yellow-800">{tr('features.premium', 'Premium')}</Badge>
            {analyticsConfig.enableSurveys && <CheckCircle className="w-5 h-5 text-green-500 mx-auto mt-2" />}
          </CardHeader>
        </Card>
      </div>

      {/* Dashboard Configuration */}
      {analyticsConfig.enableDashboard && (
        <Card>
          <CardHeader>
            <CardTitle>{tr('dashboard.title', 'Dashboard Configuration')}</CardTitle>
            <CardDescription>{tr('dashboard.description', 'Choose which widgets to display on your dashboard')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {dashboardWidgets.map((widget) => (
                <div
                  key={widget.id}
                  className={`p-4 border rounded-lg ${
                    widget.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      widget.enabled ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <widget.icon className={`w-5 h-5 ${
                        widget.enabled ? 'text-green-600' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{widget.name}</h3>
                      <p className="text-sm text-gray-600">{widget.description}</p>
                      {widget.enabled && (
                        <Badge variant="default" className="mt-2 bg-green-100 text-green-800">
                          {tr('dashboard.enabled', 'Enabled')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reporting Configuration */}
      {analyticsConfig.enableReporting && (
        <Card>
          <CardHeader>
            <CardTitle>{tr('reporting.title', 'Automated Reporting')}</CardTitle>
            <CardDescription>{tr('reporting.description', 'Set up scheduled reports to be sent via email')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reporting-email">{tr('reporting.fields.email', 'Report Email')}</Label>
                <Input
                  id="reporting-email"
                  type="email"
                  value={analyticsConfig.reportingEmail}
                  onChange={(e) => setAnalyticsConfig({ ...analyticsConfig, reportingEmail: e.target.value })}
                  placeholder={tr('reporting.placeholders.email', 'manager@company.com')}
                />
              </div>
              <div>
                <Label htmlFor="report-frequency">{tr('reporting.fields.frequency', 'Report Frequency')}</Label>
                <select
                  id="report-frequency"
                  value={analyticsConfig.reportFrequency}
                  onChange={(e) => setAnalyticsConfig({ ...analyticsConfig, reportFrequency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="daily">{tr('reporting.frequencies.daily', 'Daily')}</option>
                  <option value="weekly">{tr('reporting.frequencies.weekly', 'Weekly')}</option>
                  <option value="monthly">{tr('reporting.frequencies.monthly', 'Monthly')}</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* External Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <CardTitle>{tr('integrations.title', 'External Integrations')}</CardTitle>
          </div>
          <CardDescription>{tr('integrations.description', 'Connect with external analytics platforms')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="google-analytics">{tr('integrations.fields.googleAnalytics', 'Google Analytics ID')}</Label>
            <Input
              id="google-analytics"
              value={analyticsConfig.googleAnalyticsId}
              onChange={(e) => setAnalyticsConfig({ ...analyticsConfig, googleAnalyticsId: e.target.value })}
              placeholder={tr('placeholders.googleAnalyticsId', 'GA-XXXXXXXXX-X')}
            />
            <p className="text-sm text-gray-500 mt-1">{tr('integrations.help.googleAnalytics', 'Optional: Track portal usage in Google Analytics')}</p>
          </div>
        </CardContent>
      </Card>

      {/* KPI Preview */}
      <Card>
        <CardHeader>
          <CardTitle>{tr('kpis.title', 'Key Performance Indicators')}</CardTitle>
          <CardDescription>{tr('kpis.description', 'Track these important metrics')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-medium">{tr('kpis.responseTime.name', 'Avg Response Time')}</h3>
              <p className="text-2xl font-bold text-blue-600">4h</p>
              <p className="text-sm text-gray-500">{tr('kpis.responseTime.target', 'Target: 4 hours')}</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-medium">{tr('kpis.satisfaction.name', 'Customer Satisfaction')}</h3>
              <p className="text-2xl font-bold text-green-600">4.5</p>
              <p className="text-sm text-gray-500">{tr('kpis.satisfaction.target', 'Target: 4.5/5')}</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <CheckCircle className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-medium">{tr('kpis.resolution.name', 'First Contact Resolution')}</h3>
              <p className="text-2xl font-bold text-purple-600">80%</p>
              <p className="text-sm text-gray-500">{tr('kpis.resolution.target', 'Target: 80%')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? tn('loading.saving') : tn('navigation.next')}
        </Button>
      </div>
    </div>
  );
}