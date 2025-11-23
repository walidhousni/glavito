'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNotificationStore, type NotificationPreferences as Prefs } from '@/lib/store/notification-store';
import { Bell, Mail, Smartphone, MessageSquare, AlertTriangle, Users, Settings as SettingsIcon, Save, RotateCcw, CheckCircle2, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface NotificationCategory {
  id: keyof Prefs['email'];
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconUrl?: string;
  isPremium?: boolean;
  color: string;
}

const notificationCategories: NotificationCategory[] = [
  {
    id: 'newTickets',
    title: 'New Tickets',
    description: 'Get notified when new tickets are created',
    icon: AlertTriangle,
    iconUrl: 'https://img.icons8.com/ios/48/3665/ticket.png',
    color: 'blue',
  },
  {
    id: 'customerReplies',
    title: 'Customer Replies',
    description: 'Get notified when customers reply to tickets',
    icon: MessageSquare,
    iconUrl: 'https://img.icons8.com/ios/48/904/response.png',
    color: 'purple',
  },
  {
    id: 'slaBreaches',
    title: 'SLA Breaches',
    description: 'Get notified when SLA deadlines are approaching or breached',
    icon: AlertTriangle,
    iconUrl: 'https://img.icons8.com/ios/48/9/alarm-clock.png',
    isPremium: true,
    color: 'red',
  },
  {
    id: 'teamMentions',
    title: 'Team Mentions',
    description: 'Get notified when you are mentioned by team members',
    icon: Users,
    iconUrl: 'https://img.icons8.com/ios/48/LyzX5M0HLig9/mention.png',
    color: 'green',
  },
  {
    id: 'systemUpdates',
    title: 'System Updates',
    description: 'Get notified about system maintenance and updates',
    icon: SettingsIcon,
    iconUrl: 'https://img.icons8.com/ios/48/6i0wNATb63Qv/settings.png',
    color: 'gray',
  },
];

interface NotificationChannel {
  id: keyof Prefs;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconUrl?: string;
  isPremium?: boolean;
  gradient: string;
}

const notificationChannels: NotificationChannel[] = [
  {
    id: 'email',
    title: 'Email Notifications',
    description: 'Receive notifications via email',
    icon: Mail,
    iconUrl: 'https://img.icons8.com/ios/48/124383/email-open.png',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'inApp',
    title: 'In-App Notifications',
    description: 'Receive notifications within the application',
    icon: Bell,
    iconUrl: 'https://img.icons8.com/ios/48/59747/notification.png',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    id: 'push',
    title: 'Push Notifications',
    description: 'Receive browser push notifications',
    icon: Smartphone,
    iconUrl: 'https://img.icons8.com/ios/48/11409/smartphone.png',
    isPremium: true,
    gradient: 'from-green-500 to-emerald-500',
  },
];

export function NotificationPreferences() {
  const { toast } = useToast();
  const { preferences, updatePreferences, isLoading, error, fetchPreferences } = useNotificationStore();
  const [localPreferences, setLocalPreferences] = useState<Prefs>(preferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalPreferences(preferences);
    setHasChanges(false);
  }, [preferences]);

  useEffect(() => {
    fetchPreferences().catch((e) => console.debug('fetchPreferences failed', e));
  }, [fetchPreferences]);

  const handlePreferenceChange = (
    channel: keyof Prefs,
    category: keyof Prefs['email'],
    value: boolean
  ) => {
    setLocalPreferences(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [category]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences(localPreferences);
      setHasChanges(false);
      toast({
        title: 'Preferences Updated',
        description: 'Your notification preferences have been saved successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update notification preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalPreferences(preferences);
    setHasChanges(false);
  };

  const isChannelEnabled = (channel: keyof Prefs) => {
    return Object.values(localPreferences[channel]).some(value => value);
  };

  const getCategoryCount = (channel: keyof Prefs) => {
    return Object.values(localPreferences[channel]).filter(value => value).length;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            Notification Preferences
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Customize how and when you receive notifications across all channels
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} disabled={isSaving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Notification Channels */}
      <div className="grid gap-6">
        {notificationChannels.map((channel, index) => {
          const Icon = channel.icon;
          const channelEnabled = isChannelEnabled(channel.id);
          const categoryCount = getCategoryCount(channel.id);

          return (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`border-2 transition-all ${channelEnabled ? 'border-primary/50 shadow-lg' : 'border-gray-200 dark:border-gray-800'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${channel.gradient} shadow-lg`}>
                        {channel.iconUrl ? (
                          <Image
                            src={channel.iconUrl}
                            alt={channel.title}
                            width={24}
                            height={24}
                            className="brightness-0 invert"
                          />
                        ) : (
                          <Icon className="h-6 w-6 text-white" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {channel.title}
                          {channel.isPremium && (
                            <Badge variant="secondary" className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                              Premium
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{channel.description}</CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {categoryCount}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        of {notificationCategories.length} enabled
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notificationCategories.map((category, categoryIndex) => {
                      const CategoryIcon = category.icon;
                      const isEnabled = localPreferences[channel.id][category.id];
                      const colorClasses = {
                        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
                        red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                        green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
                        gray: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
                      };

                      return (
                        <div key={category.id}>
                          {categoryIndex > 0 && <Separator className="my-4" />}
                          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                            <div className="flex items-center space-x-4 flex-1">
                              <div className={`p-2 rounded-lg ${colorClasses[category.color as keyof typeof colorClasses]}`}>
                                {category.iconUrl ? (
                                  <Image
                                    src={category.iconUrl}
                                    alt={category.title}
                                    width={20}
                                    height={20}
                                  />
                                ) : (
                                  <CategoryIcon className="h-5 w-5" />
                                )}
                              </div>
                              <div className="flex-1">
                                <Label 
                                  htmlFor={`${channel.id}-${category.id}`}
                                  className="font-medium cursor-pointer flex items-center gap-2"
                                >
                                  {category.title}
                                  {category.isPremium && (
                                    <Badge variant="outline" className="text-xs">
                                      Premium
                                    </Badge>
                                  )}
                                </Label>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                  {category.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {isEnabled && (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              )}
                              <Switch
                                id={`${channel.id}-${category.id}`}
                                checked={isEnabled}
                                onCheckedChange={(checked) => 
                                  handlePreferenceChange(channel.id, category.id, checked)
                                }
                                disabled={channel.isPremium || category.isPremium}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Quickly enable or disable all notifications with preset configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-green-200 hover:bg-green-50 dark:hover:bg-green-950/20"
              onClick={() => {
                const allEnabled = {
                  email: Object.fromEntries(
                    notificationCategories.map(cat => [cat.id, true])
                  ) as Prefs['email'],
                  inApp: Object.fromEntries(
                    notificationCategories.map(cat => [cat.id, true])
                  ) as Prefs['inApp'],
                  push: Object.fromEntries(
                    notificationCategories.map(cat => [cat.id, true])
                  ) as Prefs['push'],
                } as Prefs;
                setLocalPreferences(allEnabled);
                setHasChanges(true);
              }}
            >
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
              Enable All
            </Button>
            <Button
              variant="outline"
              className="border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"
              onClick={() => {
                const allDisabled = {
                  email: Object.fromEntries(
                    notificationCategories.map(cat => [cat.id, false])
                  ) as Prefs['email'],
                  inApp: Object.fromEntries(
                    notificationCategories.map(cat => [cat.id, false])
                  ) as Prefs['inApp'],
                  push: Object.fromEntries(
                    notificationCategories.map(cat => [cat.id, false])
                  ) as Prefs['push'],
                } as Prefs;
                setLocalPreferences(allDisabled);
                setHasChanges(true);
              }}
            >
              <X className="h-4 w-4 mr-2 text-red-600" />
              Disable All
            </Button>
            <Button
              variant="outline"
              className="border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/20"
              onClick={() => {
                const essentialOnly = {
                  email: {
                    newTickets: true,
                    customerReplies: true,
                    slaBreaches: true,
                    teamMentions: false,
                    systemUpdates: false,
                  },
                  inApp: {
                    newTickets: true,
                    customerReplies: true,
                    slaBreaches: true,
                    teamMentions: true,
                    systemUpdates: true,
                  },
                  push: {
                    newTickets: false,
                    customerReplies: true,
                    slaBreaches: true,
                    teamMentions: false,
                    systemUpdates: false,
                  },
                };
                setLocalPreferences(essentialOnly);
                setHasChanges(true);
              }}
            >
              <Bell className="h-4 w-4 mr-2 text-blue-600" />
              Essential Only
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default NotificationPreferences;
