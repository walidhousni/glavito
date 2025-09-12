'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Workflow,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  Zap
} from 'lucide-react';

interface WorkflowConfigurationStepProps {
  data: any;
  onComplete: (data: any) => Promise<void>;
  isLoading: boolean;
}

export function WorkflowConfigurationStep({ data, onComplete, isLoading }: WorkflowConfigurationStepProps) {
  const t = useTranslations('onboarding.steps.workflows');

  const [workflowSettings, setWorkflowSettings] = useState({
    autoAssignment: data.autoAssignment ?? true,
    escalationEnabled: data.escalationEnabled ?? true,
    slaEnabled: data.slaEnabled ?? true,
    businessHoursOnly: data.businessHoursOnly ?? false,
  });

  const handleSubmit = async () => {
    const workflowData = {
      ...workflowSettings,
      rules: [
        {
          name: 'Auto Assignment',
          type: 'routing',
          conditions: { status: 'new' },
          actions: { assignTo: 'available_agent' },
          isActive: workflowSettings.autoAssignment,
        },
        {
          name: 'SLA Monitoring',
          type: 'sla',
          conditions: { priority: ['high', 'urgent'] },
          actions: { escalate: true },
          isActive: workflowSettings.slaEnabled,
        },
      ],
      slaRules: [
        {
          name: 'Standard Response',
          priority: 'medium',
          responseTime: 4, // hours
          resolutionTime: 24, // hours
        },
        {
          name: 'Priority Response',
          priority: 'high',
          responseTime: 1, // hours
          resolutionTime: 8, // hours
        },
      ],
    };

    await onComplete(workflowData);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Workflow className="w-6 h-6 text-primary" />
            <CardTitle>{t('overview.title')}</CardTitle>
          </div>
          <CardDescription>
            {t('overview.description')}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Workflow Features */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card
          className={`cursor-pointer transition-all ${workflowSettings.autoAssignment ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => setWorkflowSettings({ ...workflowSettings, autoAssignment: !workflowSettings.autoAssignment })}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">{t('features.autoAssignment.title')}</CardTitle>
              </div>
              {workflowSettings.autoAssignment && <CheckCircle className="w-5 h-5 text-green-500" />}
            </div>
            <CardDescription>{t('features.autoAssignment.description')}</CardDescription>
          </CardHeader>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${workflowSettings.escalationEnabled ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => setWorkflowSettings({ ...workflowSettings, escalationEnabled: !workflowSettings.escalationEnabled })}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-lg">{t('features.escalation.title')}</CardTitle>
              </div>
              {workflowSettings.escalationEnabled && <CheckCircle className="w-5 h-5 text-green-500" />}
            </div>
            <CardDescription>{t('features.escalation.description')}</CardDescription>
          </CardHeader>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${workflowSettings.slaEnabled ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => setWorkflowSettings({ ...workflowSettings, slaEnabled: !workflowSettings.slaEnabled })}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <CardTitle className="text-lg">{t('features.sla.title')}</CardTitle>
              </div>
              {workflowSettings.slaEnabled && <CheckCircle className="w-5 h-5 text-green-500" />}
            </div>
            <CardDescription>{t('features.sla.description')}</CardDescription>
          </CardHeader>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${workflowSettings.businessHoursOnly ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => setWorkflowSettings({ ...workflowSettings, businessHoursOnly: !workflowSettings.businessHoursOnly })}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-gray-600" />
                <CardTitle className="text-lg">{t('features.businessHours.title')}</CardTitle>
              </div>
              {workflowSettings.businessHoursOnly && <CheckCircle className="w-5 h-5 text-green-500" />}
            </div>
            <CardDescription>{t('features.businessHours.description')}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* SLA Configuration */}
      {workflowSettings.slaEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>{t('sla.title')}</CardTitle>
            <CardDescription>{t('sla.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{t('sla.standard.title')}</h3>
                    <Badge variant="secondary">{t('sla.standard.priority')}</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>{t('sla.responseTime')}:</span>
                      <span>4 {t('sla.hours')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('sla.resolutionTime')}:</span>
                      <span>24 {t('sla.hours')}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{t('sla.priority.title')}</h3>
                    <Badge className="bg-red-100 text-red-800">{t('sla.priority.priority')}</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>{t('sla.responseTime')}:</span>
                      <span>1 {t('sla.hour')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('sla.resolutionTime')}:</span>
                      <span>8 {t('sla.hours')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? t('saving') : t('continue')}
        </Button>
      </div>
    </div>
  );
}