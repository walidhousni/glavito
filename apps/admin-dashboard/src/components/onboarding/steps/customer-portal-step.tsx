'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, 
  Palette, 
  Eye, 
  Settings,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface CustomerPortalStepProps {
  data: any;
  onComplete: (data: any) => Promise<void>;
  isLoading: boolean;
}

export function CustomerPortalStep({ data, onComplete, isLoading }: CustomerPortalStepProps) {
  const t = useTranslations('onboarding.steps.portal');
  const tn = useTranslations('onboarding');
  const tr = (key: string, fallback: string) => {
    try {
      const value = t(key as any);
      return value === key ? fallback : value;
    } catch {
      return fallback;
    }
  };
  
  const [portalConfig, setPortalConfig] = useState({
    name: data.name || tr('defaults.portalName', 'Customer Portal'),
    subdomain: data.subdomain || tr('defaults.subdomain', 'support'),
    primaryColor: data.primaryColor || tr('defaults.primaryColor', '#3B82F6'),
    secondaryColor: data.secondaryColor || tr('defaults.secondaryColor', '#1F2937'),
    enableTicketSubmission: data.enableTicketSubmission ?? true,
    enableKnowledgeBase: data.enableKnowledgeBase ?? true,
    enableLiveChat: data.enableLiveChat ?? false,
    enableUserAccounts: data.enableUserAccounts ?? true,
  });

  const handleSubmit = async () => {
    const portalData = {
      ...portalConfig,
      branding: {
        colors: {
          primary: portalConfig.primaryColor,
          secondary: portalConfig.secondaryColor,
        },
      },
      features: {
        ticketSubmission: { enabled: portalConfig.enableTicketSubmission },
        knowledgeBase: { enabled: portalConfig.enableKnowledgeBase },
        liveChat: { enabled: portalConfig.enableLiveChat },
        userAccount: { enabled: portalConfig.enableUserAccounts },
      },
    };

    await onComplete(portalData);
  };

  return (
    <div className="space-y-6">
      {/* Portal Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Globe className="w-6 h-6 text-primary" />
            <CardTitle>{tr('overview.title', 'Customer Portal Overview')}</CardTitle>
          </div>
          <CardDescription>
            {tr('overview.description', 'Create a self-service portal for your customers')}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Basic Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>{tr('basic.title', 'Basic Configuration')}</CardTitle>
          <CardDescription>{tr('basic.description', 'Set up the basic details of your portal')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="portal-name">{tr('basic.fields.name', 'Portal Name')}</Label>
              <Input
                id="portal-name"
                value={portalConfig.name}
                onChange={(e) => setPortalConfig({ ...portalConfig, name: e.target.value })}
                placeholder={tr('basic.placeholders.name', 'Customer Support Portal')}
              />
            </div>
            <div>
              <Label htmlFor="portal-subdomain">{tr('basic.fields.subdomain', 'Subdomain')}</Label>
              <div className="flex">
                <Input
                  id="portal-subdomain"
                  value={portalConfig.subdomain}
                  onChange={(e) => setPortalConfig({ ...portalConfig, subdomain: e.target.value })}
                  placeholder={tr('placeholders.subdomain', 'mycompany')}
                />
                <span className="flex items-center px-3 text-sm text-gray-500 bg-gray-100 border border-l-0 rounded-r-md">
                  {tr('defaults.domainSuffix', '.support.com')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Palette className="w-5 h-5 text-primary" />
            <CardTitle>{tr('branding.title', 'Branding')}</CardTitle>
          </div>
          <CardDescription>{tr('branding.description', 'Customize the look and feel of your portal')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary-color">{tr('branding.fields.primaryColor', 'Primary Color')}</Label>
              <div className="flex space-x-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={portalConfig.primaryColor}
                  onChange={(e) => setPortalConfig({ ...portalConfig, primaryColor: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  value={portalConfig.primaryColor}
                  onChange={(e) => setPortalConfig({ ...portalConfig, primaryColor: e.target.value })}
                  placeholder={tr('placeholders.primaryColor', '#3B82F6')}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondary-color">{tr('branding.fields.secondaryColor', 'Secondary Color')}</Label>
              <div className="flex space-x-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={portalConfig.secondaryColor}
                  onChange={(e) => setPortalConfig({ ...portalConfig, secondaryColor: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  value={portalConfig.secondaryColor}
                  onChange={(e) => setPortalConfig({ ...portalConfig, secondaryColor: e.target.value })}
                  placeholder={tr('placeholders.secondaryColor', '#1F2937')}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-primary" />
            <CardTitle>{tr('features.title', 'Features')}</CardTitle>
          </div>
          <CardDescription>{tr('features.description', 'Choose which features to enable')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                portalConfig.enableTicketSubmission ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setPortalConfig({ ...portalConfig, enableTicketSubmission: !portalConfig.enableTicketSubmission })}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{tr('features.ticketSubmission.title', 'Ticket Submission')}</h3>
                  <p className="text-sm text-gray-600">{tr('features.ticketSubmission.description', 'Allow customers to submit support tickets')}</p>
                </div>
                {portalConfig.enableTicketSubmission && <CheckCircle className="w-5 h-5 text-green-500" />}
              </div>
            </div>

            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                portalConfig.enableKnowledgeBase ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setPortalConfig({ ...portalConfig, enableKnowledgeBase: !portalConfig.enableKnowledgeBase })}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{tr('features.knowledgeBase.title', 'Knowledge Base')}</h3>
                  <p className="text-sm text-gray-600">{tr('features.knowledgeBase.description', 'Display your knowledge base articles')}</p>
                </div>
                {portalConfig.enableKnowledgeBase && <CheckCircle className="w-5 h-5 text-green-500" />}
              </div>
            </div>

            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                portalConfig.enableLiveChat ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setPortalConfig({ ...portalConfig, enableLiveChat: !portalConfig.enableLiveChat })}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{tr('features.liveChat.title', 'Live Chat')}</h3>
                  <p className="text-sm text-gray-600">{tr('features.liveChat.description', 'Enable real-time chat support')}</p>
                  <Badge className="mt-1 bg-yellow-100 text-yellow-800">{tr('features.premium', 'Premium')}</Badge>
                </div>
                {portalConfig.enableLiveChat && <CheckCircle className="w-5 h-5 text-green-500" />}
              </div>
            </div>

            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                portalConfig.enableUserAccounts ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => setPortalConfig({ ...portalConfig, enableUserAccounts: !portalConfig.enableUserAccounts })}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{tr('features.userAccounts.title', 'User Accounts')}</h3>
                  <p className="text-sm text-gray-600">{tr('features.userAccounts.description', 'Let customers create accounts to track tickets')}</p>
                </div>
                {portalConfig.enableUserAccounts && <CheckCircle className="w-5 h-5 text-green-500" />}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-gray-600" />
              <CardTitle>{tr('preview.title', 'Preview')}</CardTitle>
            </div>
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              {tr('preview.open', 'Open Preview')}
            </Button>
          </div>
          <CardDescription>{tr('preview.description', 'See how your portal will look')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="h-12 flex items-center px-4"
              style={{ backgroundColor: portalConfig.primaryColor }}
            >
              <h3 className="text-white font-medium">{portalConfig.name}</h3>
            </div>
            <div className="p-6 bg-white">
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">{tr('preview.welcome', 'Welcome to our Support Center')}</h2>
                  <p className="text-gray-600">{tr('preview.subtitle', 'How can we help you today?')}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {portalConfig.enableTicketSubmission && (
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium">{tr('features.ticketSubmission.title', 'Ticket Submission')}</h3>
                    </div>
                  )}
                  {portalConfig.enableKnowledgeBase && (
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-medium">{tr('features.knowledgeBase.title', 'Knowledge Base')}</h3>
                    </div>
                  )}
                </div>
              </div>
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