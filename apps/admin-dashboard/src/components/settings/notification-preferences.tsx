'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
// Fallback toast import for this app
import { useToast } from '@/components/ui/toast';
import { useNotificationStore, type NotificationPreferences as Prefs } from '@/lib/store/notification-store';
import { Bell, Mail, Smartphone, MessageSquare, AlertTriangle, Users, Settings as SettingsIcon, Save, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface NotificationCategory {
  id: keyof Prefs['email'];
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isPremium?: boolean;
}

const notificationCategories: NotificationCategory[] = [
  {
    id: 'newTickets',
    title: 'New Tickets',
    description: 'Get notified when new tickets are created',
    icon: AlertTriangle,
  },
  {
    id: 'customerReplies',
    title: 'Customer Replies',
    description: 'Get notified when customers reply to tickets',
    icon: MessageSquare,
  },
  {
    id: 'slaBreaches',
    title: 'SLA Breaches',
    description: 'Get notified when SLA deadlines are approaching or breached',
    icon: AlertTriangle,
    isPremium: true,
  },
  {
    id: 'teamMentions',
    title: 'Team Mentions',
    description: 'Get notified when you are mentioned by team members',
    icon: Users,
  },
  {
    id: 'systemUpdates',
    title: 'System Updates',
    description: 'Get notified about system maintenance and updates',
    icon: SettingsIcon,
  },
];

interface NotificationChannel {
  id: keyof Prefs;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isPremium?: boolean;
}

const notificationChannels: NotificationChannel[] = [
  {
    id: 'email',
    title: 'Email Notifications',
    description: 'Receive notifications via email',
    icon: Mail,
  },
  {
    id: 'inApp',
    title: 'In-App Notifications',
    description: 'Receive notifications within the application',
    icon: Bell,
  },
  {
    id: 'push',
    title: 'Push Notifications',
    description: 'Receive browser push notifications',
    icon: Smartphone,
    isPremium: true,
  },
];

export function NotificationPreferences() {
  const tctx = useToast() as unknown as { toast?: (opts: { title: string; description?: string; variant?: string }) => void };
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
      await updatePreferences(localPreferences as unknown as Partial<Prefs>);
      setHasChanges(false);
      tctx?.toast?.({
        title: 'Preferences Updated',
        description: 'Your notification preferences have been saved successfully.',
      });
    } catch (_error) {
      tctx?.toast?.({
        title: 'Error',
        description: 'Failed to update notification preferences. Please try again.',
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Notification Preferences
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Customize how and when you receive notifications
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
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
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        channelEnabled 
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {channel.title}
                          {channel.isPremium && (
                            <Badge variant="secondary" className="text-xs">
                              Premium
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{channel.description}</CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {categoryCount} of {notificationCategories.length}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        categories enabled
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {notificationCategories.map((category, categoryIndex) => {
                      const CategoryIcon = category.icon;
                      const isEnabled = localPreferences[channel.id][category.id];

                      return (
                        <div key={category.id}>
                          {categoryIndex > 0 && <Separator className="my-4" />}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`p-1.5 rounded ${
                                isEnabled
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                              }`}>
                                <CategoryIcon className="h-4 w-4" />
                              </div>
                              <div>
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
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {category.description}
                                </p>
                              </div>
                            </div>
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
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Quickly enable or disable all notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
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
              Enable All
            </Button>
            <Button
              variant="outline"
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
              Disable All
            </Button>
            <Button
              variant="outline"
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
              Essential Only
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default NotificationPreferences;