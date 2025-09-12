'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Instagram, 
  Mail, 
  Phone, 
  Facebook,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Settings
} from 'lucide-react';

interface ChannelConfigurationStepProps {
  data: any;
  onComplete: (data: any) => Promise<void>;
  isLoading: boolean;
}

interface ChannelConfig {
  id: string;
  name: string;
  type: 'whatsapp' | 'instagram' | 'email' | 'facebook' | 'phone' | 'chat';
  icon: React.ComponentType<any>;
  description: string;
  isEnabled: boolean;
  isConfigured: boolean;
  config: Record<string, any>;
  priority: number;
}

export function ChannelConfigurationStep({ data, onComplete, isLoading }: ChannelConfigurationStepProps) {
  const t = useTranslations('onboarding.steps.channels');
  const tn = useTranslations('onboarding');
  const tr = (key: string, fallback: string) => {
    try {
      const value = t(key as any);
      return value === key ? fallback : value;
    } catch {
      return fallback;
    }
  };
  
  const [channels, setChannels] = useState<ChannelConfig[]>([
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      type: 'whatsapp',
      icon: MessageSquare,
      description: tr('channels.whatsapp.description', 'Connect WhatsApp Business API for messaging'),
      isEnabled: data.channels?.whatsapp?.enabled || false,
      isConfigured: data.channels?.whatsapp?.configured || false,
      config: data.channels?.whatsapp?.config || {},
      priority: 1,
    },
    {
      id: 'instagram',
      name: 'Instagram',
      type: 'instagram',
      icon: Instagram,
      description: tr('channels.instagram.description', 'Manage Instagram direct messages and comments'),
      isEnabled: data.channels?.instagram?.enabled || false,
      isConfigured: data.channels?.instagram?.configured || false,
      config: data.channels?.instagram?.config || {},
      priority: 2,
    },
    {
      id: 'email',
      name: 'Email',
      type: 'email',
      icon: Mail,
      description: tr('channels.email.description', 'Handle email support tickets'),
      isEnabled: data.channels?.email?.enabled || false,
      isConfigured: data.channels?.email?.configured || false,
      config: data.channels?.email?.config || {},
      priority: 3,
    },
    {
      id: 'facebook',
      name: 'Facebook Messenger',
      type: 'facebook',
      icon: Facebook,
      description: tr('channels.facebook.description', 'Respond to Facebook Messenger conversations'),
      isEnabled: data.channels?.facebook?.enabled || false,
      isConfigured: data.channels?.facebook?.configured || false,
      config: data.channels?.facebook?.config || {},
      priority: 4,
    },
    {
      id: 'phone',
      name: 'Phone',
      type: 'phone',
      icon: Phone,
      description: tr('channels.phone.description', 'Track and manage phone support calls'),
      isEnabled: data.channels?.phone?.enabled || false,
      isConfigured: data.channels?.phone?.configured || false,
      config: data.channels?.phone?.config || {},
      priority: 5,
    },
  ]);

  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const toggleChannel = (channelId: string) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId 
        ? { ...channel, isEnabled: !channel.isEnabled }
        : channel
    ));
  };

  const updateChannelConfig = (channelId: string, config: Record<string, any>) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId 
        ? { ...channel, config, isConfigured: true }
        : channel
    ));
  };

  const handleSubmit = async () => {
    const channelData = channels.reduce((acc, channel) => {
      acc[channel.type] = {
        enabled: channel.isEnabled,
        configured: channel.isConfigured,
        config: channel.config,
        priority: channel.priority,
      };
      return acc;
    }, {} as Record<string, any>);

    await onComplete({ channels: channelData });
  };

  const renderChannelConfig = (channel: ChannelConfig) => {
    if (!channel.isEnabled) return null;

    switch (channel.type) {
      case 'whatsapp':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="whatsapp-phone">{tr('config.whatsapp.phoneNumber', 'Phone Number')}</Label>
              <Input
                id="whatsapp-phone"
                value={channel.config.phoneNumber || ''}
                onChange={(e) => updateChannelConfig(channel.id, { ...channel.config, phoneNumber: e.target.value })}
                placeholder={tr('config.placeholders.whatsappPhone', '+1234567890')}
              />
            </div>
            <div>
              <Label htmlFor="whatsapp-token">{tr('config.whatsapp.accessToken', 'Access Token')}</Label>
              <Input
                id="whatsapp-token"
                type="password"
                value={channel.config.accessToken || ''}
                onChange={(e) => updateChannelConfig(channel.id, { ...channel.config, accessToken: e.target.value })}
                placeholder={tr('config.whatsapp.tokenPlaceholder', 'Enter your WhatsApp Business API token')}
              />
            </div>
            <div>
              <Label htmlFor="whatsapp-webhook">{tr('config.whatsapp.webhookUrl', 'Webhook URL')}</Label>
              <Input
                id="whatsapp-webhook"
                value={channel.config.webhookUrl || ''}
                onChange={(e) => updateChannelConfig(channel.id, { ...channel.config, webhookUrl: e.target.value })}
                placeholder={tr('config.placeholders.whatsappWebhook', 'https://your-domain.com/webhook/whatsapp')}
              />
            </div>
          </div>
        );

      case 'instagram':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="instagram-page-id">{tr('config.instagram.pageId', 'Page ID')}</Label>
              <Input
                id="instagram-page-id"
                value={channel.config.pageId || ''}
                onChange={(e) => updateChannelConfig(channel.id, { ...channel.config, pageId: e.target.value })}
                placeholder={tr('config.instagram.pageIdPlaceholder', 'Enter your Instagram Business page ID')}
              />
            </div>
            <div>
              <Label htmlFor="instagram-token">{tr('config.instagram.accessToken', 'Access Token')}</Label>
              <Input
                id="instagram-token"
                type="password"
                value={channel.config.accessToken || ''}
                onChange={(e) => updateChannelConfig(channel.id, { ...channel.config, accessToken: e.target.value })}
                placeholder={tr('config.instagram.tokenPlaceholder', 'Enter your Instagram Graph API token')}
              />
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email-host">{tr('config.email.smtpHost', 'SMTP Host')}</Label>
                <Input
                  id="email-host"
                  value={channel.config.smtpHost || ''}
                  onChange={(e) => updateChannelConfig(channel.id, { ...channel.config, smtpHost: e.target.value })}
                  placeholder={tr('config.placeholders.emailHost', 'smtp.gmail.com')}
                />
              </div>
              <div>
                <Label htmlFor="email-port">{tr('config.email.smtpPort', 'SMTP Port')}</Label>
                <Input
                  id="email-port"
                  type="number"
                  value={channel.config.smtpPort || ''}
                  onChange={(e) => updateChannelConfig(channel.id, { ...channel.config, smtpPort: e.target.value })}
                  placeholder={tr('config.placeholders.emailPort', '587')}
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email-username">{tr('config.email.username', 'Username')}</Label>
                <Input
                  id="email-username"
                  value={channel.config.username || ''}
                  onChange={(e) => updateChannelConfig(channel.id, { ...channel.config, username: e.target.value })}
                  placeholder={tr('config.placeholders.emailUsername', 'your-email@domain.com')}
                />
              </div>
              <div>
                <Label htmlFor="email-password">{tr('config.email.password', 'Password')}</Label>
                <Input
                  id="email-password"
                  type="password"
                  value={channel.config.password || ''}
                  onChange={(e) => updateChannelConfig(channel.id, { ...channel.config, password: e.target.value })}
                  placeholder={tr('config.email.passwordPlaceholder', 'Enter your email password')}
                />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-4">
            <p className="text-gray-500">{tr('config.comingSoon', 'Configuration coming soon')}</p>
          </div>
        );
    }
  };

  const enabledChannels = channels.filter(c => c.isEnabled);
  const configuredChannels = channels.filter(c => c.isEnabled && c.isConfigured);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle>{tr('overview.title', 'Channel Overview')}</CardTitle>
          <CardDescription>
            {tr('overview.description', 'Connect multiple channels to centralize all customer communications')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">{enabledChannels.length}</span> {tr('overview.enabled', 'enabled')} • 
              <span className="font-semibold ml-1">{configuredChannels.length}</span> {tr('overview.configured', 'configured')}
            </div>
            <Badge variant="secondary">
              {Math.round((configuredChannels.length / Math.max(enabledChannels.length, 1)) * 100)}% {tr('overview.complete', 'complete')}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Channel Selection */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((channel) => (
          <Card 
            key={channel.id}
            className={`cursor-pointer transition-all ${channel.isEnabled ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
            onClick={() => toggleChannel(channel.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${channel.isEnabled ? 'bg-primary/10' : 'bg-gray-100'}`}>
                    <channel.icon className={`w-5 h-5 ${channel.isEnabled ? 'text-primary' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{channel.name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      {channel.isEnabled && channel.isConfigured && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      {channel.isEnabled && !channel.isConfigured && (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      )}
                      <Badge 
                        variant={channel.isEnabled ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {channel.isEnabled ? tr('status.enabled', 'Enabled') : tr('status.disabled', 'Disabled')}
                      </Badge>
                    </div>
                  </div>
                </div>
                {channel.isEnabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedChannel(selectedChannel === channel.id ? null : channel.id);
                    }}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                {channel.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channel Configuration */}
      {selectedChannel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>{tr('config.title', 'Configuration')} - {channels.find(c => c.id === selectedChannel)?.name}</span>
                </CardTitle>
                <CardDescription>{tr('config.description', 'Configure your selected channel')}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChannel(null)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderChannelConfig(channels.find(c => c.id === selectedChannel)!)}
            
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">{tr('config.help.title', 'Need Help?')}</h4>
                  <p className="text-sm text-yellow-700 mt-1">{tr('config.help.description', 'Check our documentation for detailed setup instructions')}</p>
                  <Button variant="link" size="sm" className="text-yellow-700 p-0 h-auto mt-2">
                    {tr('config.help.documentation', 'View Documentation')} <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle>{tr('quickSetup.title', 'Quick Setup Guide')}</CardTitle>
          <CardDescription>{tr('quickSetup.description', 'Follow these steps to get started')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                enabledChannels.length > 0 ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {enabledChannels.length > 0 ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <span className="text-xs text-gray-500">1</span>
                )}
              </div>
              <span className={enabledChannels.length > 0 ? 'text-green-800' : 'text-gray-600'}>
                {tr('quickSetup.step1', 'Select the channels you want to use')}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                configuredChannels.length > 0 ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {configuredChannels.length > 0 ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <span className="text-xs text-gray-500">2</span>
                )}
              </div>
              <span className={configuredChannels.length > 0 ? 'text-green-800' : 'text-gray-600'}>
                {tr('quickSetup.step2', 'Configure each selected channel')}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-100">
                <span className="text-xs text-gray-500">3</span>
              </div>
              <span className="text-gray-600">{tr('quickSetup.step3', 'Test your connections')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || enabledChannels.length === 0}
          size="lg"
        >
          {isLoading ? tn('loading.saving') : tn('navigation.next')}
        </Button>
      </div>
    </div>
  );
}