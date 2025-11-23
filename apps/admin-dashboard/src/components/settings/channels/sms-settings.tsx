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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface SenderID {
  id: string;
  phoneNumber: string;
  country: string;
  status: 'active' | 'pending' | 'suspended';
  isDefault: boolean;
}

interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  characterCount: number;
  segmentCount: number;
}

export function SMSSettings() {
  const t = useTranslations('settings.channels.sms');

  const [senderIDs, setSenderIDs] = useState<SenderID[]>([
    {
      id: 'sid_1',
      phoneNumber: '+1 (555) 123-4567',
      country: 'US',
      status: 'active',
      isDefault: true,
    },
    {
      id: 'sid_2',
      phoneNumber: '+44 7911 123456',
      country: 'GB',
      status: 'active',
      isDefault: false,
    },
  ]);

  const [templates, setTemplates] = useState<SMSTemplate[]>([
    {
      id: 'tpl_1',
      name: 'Order Confirmation',
      content: 'Your order #{{order_id}} has been confirmed! Track it here: {{tracking_url}}',
      characterCount: 75,
      segmentCount: 1,
    },
    {
      id: 'tpl_2',
      name: 'Appointment Reminder',
      content: 'Reminder: You have an appointment on {{date}} at {{time}}. Reply CONFIRM to confirm.',
      characterCount: 89,
      segmentCount: 1,
    },
  ]);

  const [showAddSenderDialog, setShowAddSenderDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null);
  const [templateContent, setTemplateContent] = useState('');

  const calculateSMSStats = (text: string) => {
    const charCount = text.length;
    const segmentCount = Math.ceil(charCount / 160);
    return { charCount, segmentCount };
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { label: 'Active', color: 'bg-green-100 text-green-800' },
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      suspended: { label: 'Suspended', color: 'bg-red-100 text-red-800' },
    };

    const statusConfig = config[status as keyof typeof config] || config.pending;

    return (
      <Badge className={cn('text-xs', statusConfig.color)}>
        {statusConfig.label}
      </Badge>
    );
  };

  const handleSetDefaultSender = (senderId: string) => {
    setSenderIDs((prev) =>
      prev.map((sid) => ({
        ...sid,
        isDefault: sid.id === senderId,
      }))
    );

    toast({
      title: 'Default sender updated',
      description: 'This number will be used for outgoing SMS.',
    });
  };

  const handleSaveTemplate = () => {
    const stats = calculateSMSStats(templateContent);

    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((tpl) =>
          tpl.id === editingTemplate.id
            ? {
                ...tpl,
                content: templateContent,
                characterCount: stats.charCount,
                segmentCount: stats.segmentCount,
              }
            : tpl
        )
      );
      toast({
        title: 'Template updated',
        description: 'Your SMS template has been saved.',
      });
    } else {
      const newTemplate: SMSTemplate = {
        id: `tpl_${Date.now()}`,
        name: 'New Template',
        content: templateContent,
        characterCount: stats.charCount,
        segmentCount: stats.segmentCount,
      };
      setTemplates((prev) => [...prev, newTemplate]);
      toast({
        title: 'Template created',
        description: 'Your new SMS template has been created.',
      });
    }

    setShowTemplateDialog(false);
    setEditingTemplate(null);
    setTemplateContent('');
  };

  const handleEditTemplate = (template: SMSTemplate) => {
    setEditingTemplate(template);
    setTemplateContent(template.content);
    setShowTemplateDialog(true);
  };

  const currentStats = calculateSMSStats(templateContent);

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Messages Sent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12,458</div>
            <div className="flex items-center gap-1 text-sm text-green-600 mt-2">
              <Icon name="trendingUp" className="w-4 h-4" />
              <span>+18% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Delivery Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">98.5%</div>
            <div className="flex items-center gap-1 text-sm text-green-600 mt-2">
              <Icon name="checkCircle" className="w-4 h-4" />
              <span>Excellent</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Reply Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">34%</div>
            <div className="flex items-center gap-1 text-sm text-blue-600 mt-2">
              <Icon name="messageSquare" className="w-4 h-4" />
              <span>4,236 replies</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg Cost</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$0.02</div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
              <Icon name="dollarSign" className="w-4 h-4" />
              <span>per message</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sender IDs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sender Phone Numbers</CardTitle>
              <CardDescription>Manage your SMS sender identities</CardDescription>
            </div>
            <Button onClick={() => setShowAddSenderDialog(true)}>
              <Icon name="plus" className="w-4 h-4 mr-2" />
              Add Number
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {senderIDs.map((sender) => (
              <div
                key={sender.id}
                className={cn(
                  'p-4 border rounded-lg flex items-center justify-between',
                  sender.isDefault && 'ring-2 ring-primary'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon name="phone" className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{sender.phoneNumber}</div>
                      {sender.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{sender.country}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(sender.status)}
                  {!sender.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefaultSender(sender.id)}
                    >
                      Set as Default
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SMS Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>SMS Templates</CardTitle>
              <CardDescription>Pre-configured messages with character counter</CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setTemplateContent('');
                setShowTemplateDialog(true);
              }}
            >
              <Icon name="plus" className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {template.characterCount} characters
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {template.segmentCount} segment{template.segmentCount > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <Icon name="edit" className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                  {template.content}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SMS Provider Settings */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Provider Configuration</CardTitle>
          <CardDescription>Twilio integration settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-sid">Account SID</Label>
            <Input
              id="account-sid"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              type="password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-token">Auth Token</Label>
            <Input
              id="auth-token"
              placeholder="Your Twilio auth token"
              type="password"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label>Connection Status</Label>
              <p className="text-sm text-muted-foreground">Twilio API connection</p>
            </div>
            <Badge className="bg-green-100 text-green-800">Connected</Badge>
          </div>

          <div className="pt-4 border-t flex justify-end gap-2">
            <Button variant="outline">Test Connection</Button>
            <Button>Save Configuration</Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Sender Dialog */}
      <Dialog open={showAddSenderDialog} onOpenChange={setShowAddSenderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sender Phone Number</DialogTitle>
            <DialogDescription>
              Register a new phone number for sending SMS
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" placeholder="+1 555 123 4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" placeholder="United States" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSenderDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowAddSenderDialog(false)}>Add Number</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create SMS Template'}
            </DialogTitle>
            <DialogDescription>
              Compose your SMS template with variables and preview character count
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="Order Confirmation"
                defaultValue={editingTemplate?.name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-content">Message Content</Label>
              <Textarea
                id="template-content"
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                placeholder="Enter your SMS message here..."
                rows={5}
              />
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  Use variables like {"{{order_id}}"}, {"{{name}}"}, {"{{date}}"}
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn(
                    currentStats.charCount > 160 ? 'text-yellow-600' : 'text-muted-foreground'
                  )}>
                    {currentStats.charCount}/160 characters
                  </span>
                  <Badge variant="outline">
                    {currentStats.segmentCount} segment{currentStats.segmentCount > 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </div>

            {currentStats.segmentCount > 1 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <Icon name="alertCircle" className="w-4 h-4 inline mr-2" />
                This message will be sent as {currentStats.segmentCount} SMS segments, which may incur additional costs.
              </div>
            )}

            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground mb-2 block">PREVIEW</Label>
              <div className="text-sm">{templateContent || 'Your message preview will appear here...'}</div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTemplateDialog(false);
                setEditingTemplate(null);
                setTemplateContent('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!templateContent.trim()}>
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

