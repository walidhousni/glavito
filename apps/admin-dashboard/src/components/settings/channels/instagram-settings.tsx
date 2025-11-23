'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export function InstagramSettings() {
  const t = useTranslations('settings.channels.instagram');

  const [isConnected, setIsConnected] = useState(true);
  const [settings, setSettings] = useState({
    autoReplyEnabled: true,
    storyReplyEnabled: true,
    autoReplyMessage: "Thanks for your message! We'll get back to you soon.",
    businessHoursOnly: false,
    welcomeMessage: 'Hi! How can we help you today?',
  });

  const [analytics, setAnalytics] = useState({
    totalMessages: 1250,
    messagesSent: 820,
    messagesReceived: 430,
    avgResponseTime: 12, // minutes
    storyReplies: 185,
    activeWithin24h: 94, // percentage
  });

  const handleConnect = () => {
    toast({
      title: 'Connecting to Instagram',
      description: 'Opening Instagram Business login...',
    });
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    toast({
      title: 'Instagram disconnected',
      description: 'Your Instagram account has been disconnected.',
      variant: 'destructive',
    });
  };

  const handleSaveSettings = () => {
    toast({
      title: 'Settings saved',
      description: 'Your Instagram settings have been updated.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                <Icon name="instagram" className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Instagram Business Account</CardTitle>
                <CardDescription>
                  {isConnected ? 'Connected' : 'Not connected'}
                </CardDescription>
              </div>
            </div>
            {isConnected ? (
              <Button variant="outline" onClick={handleDisconnect}>
                <Icon name="unlink" className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            ) : (
              <Button onClick={handleConnect}>
                <Icon name="instagram" className="w-4 h-4 mr-2" />
                Connect Instagram
              </Button>
            )}
          </div>
        </CardHeader>

        {isConnected && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Icon name="checkCircle" className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium">Status</div>
                  <div className="text-xs text-muted-foreground">Active</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Icon name="clock" className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium">24-Hour Window</div>
                  <div className="text-xs text-muted-foreground">{analytics.activeWithin24h}% active</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Icon name="zap" className="w-5 h-5 text-yellow-600" />
                <div>
                  <div className="text-sm font-medium">Avg Response</div>
                  <div className="text-xs text-muted-foreground">{analytics.avgResponseTime} min</div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {isConnected && (
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Automation Settings</CardTitle>
                <CardDescription>Configure automated responses and behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-reply">Auto-Reply to DMs</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically respond to new direct messages
                    </p>
                  </div>
                  <Switch
                    id="auto-reply"
                    checked={settings.autoReplyEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, autoReplyEnabled: checked })
                    }
                  />
                </div>

                {settings.autoReplyEnabled && (
                  <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                    <Label htmlFor="auto-reply-message">Auto-Reply Message</Label>
                    <Textarea
                      id="auto-reply-message"
                      value={settings.autoReplyMessage}
                      onChange={(e) =>
                        setSettings({ ...settings, autoReplyMessage: e.target.value })
                      }
                      rows={3}
                      placeholder="Enter your auto-reply message..."
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="story-reply">Story Reply Automation</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically respond to story replies
                    </p>
                  </div>
                  <Switch
                    id="story-reply"
                    checked={settings.storyReplyEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, storyReplyEnabled: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="business-hours">Business Hours Only</Label>
                    <p className="text-sm text-muted-foreground">
                      Only send automated replies during business hours
                    </p>
                  </div>
                  <Switch
                    id="business-hours"
                    checked={settings.businessHoursOnly}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, businessHoursOnly: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome-message">Welcome Message</Label>
                  <Textarea
                    id="welcome-message"
                    value={settings.welcomeMessage}
                    onChange={(e) =>
                      setSettings({ ...settings, welcomeMessage: e.target.value })
                    }
                    rows={2}
                    placeholder="Enter your welcome message..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Sent to users when they first message your account
                  </p>
                </div>

                <div className="pt-4 border-t flex justify-end gap-2">
                  <Button variant="outline">Reset</Button>
                  <Button onClick={handleSaveSettings}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>

            {/* 24-Hour Window Info */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="flex items-start gap-3 pt-6">
                <Icon name="info" className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900">Instagram 24-Hour Window</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    You can send messages to customers within 24 hours of their last message. After that, you can only respond using approved message templates.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Messages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics.totalMessages.toLocaleString()}</div>
                  <div className="flex items-center gap-1 text-sm text-green-600 mt-2">
                    <Icon name="trendingUp" className="w-4 h-4" />
                    <span>+12% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Story Replies</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics.storyReplies}</div>
                  <div className="flex items-center gap-1 text-sm text-green-600 mt-2">
                    <Icon name="trendingUp" className="w-4 h-4" />
                    <span>+8% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Avg Response Time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics.avgResponseTime} min</div>
                  <div className="flex items-center gap-1 text-sm text-green-600 mt-2">
                    <Icon name="trendingDown" className="w-4 h-4" />
                    <span>-15% faster</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Message Activity</CardTitle>
                <CardDescription>Sent vs Received messages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Messages Sent</span>
                      <span className="text-sm text-muted-foreground">{analytics.messagesSent}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(analytics.messagesSent / analytics.totalMessages) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Messages Received</span>
                      <span className="text-sm text-muted-foreground">{analytics.messagesReceived}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(analytics.messagesReceived / analytics.totalMessages) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Instagram Channel Branding</CardTitle>
                <CardDescription>Customize how your brand appears on Instagram</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Business Name</Label>
                  <Input id="profile-name" placeholder="Your Business Name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Instagram Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Describe your business..."
                    rows={3}
                    maxLength={150}
                  />
                  <p className="text-xs text-muted-foreground">150 characters maximum</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-photo">Profile Photo</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                      <Icon name="instagram" className="w-8 h-8 text-white" />
                    </div>
                    <Button variant="outline">
                      <Icon name="upload" className="w-4 h-4 mr-2" />
                      Upload Photo
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <Button>Save Branding</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Message Templates</CardTitle>
                <CardDescription>Quick reply templates for common scenarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm">Welcome Message</div>
                        <div className="text-xs text-muted-foreground">Sent to new followers</div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Icon name="edit" className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Thanks for following! How can we help you today?
                    </p>
                  </div>

                  <div className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm">Away Message</div>
                        <div className="text-xs text-muted-foreground">Outside business hours</div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Icon name="edit" className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      We're currently away. We'll respond during business hours (9am-5pm EST).
                    </p>
                  </div>

                  <Button variant="outline" className="w-full">
                    <Icon name="plus" className="w-4 h-4 mr-2" />
                    Add New Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!isConnected && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center mb-4">
              <Icon name="instagram" className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-medium mb-2">Connect Your Instagram Account</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Connect your Instagram Business account to manage DMs, respond to stories, and engage with your audience.
            </p>
            <Button onClick={handleConnect}>
              <Icon name="instagram" className="w-4 h-4 mr-2" />
              Connect Instagram Business
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

