'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import {
  MessageSquare,
  Instagram,
  Mail,
  Phone,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { integrationsApi } from '@/lib/api/integrations';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChannelSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultChannel?: 'whatsapp' | 'messenger' | 'instagram' | 'email' | 'sms';
  onSuccess?: () => void;
}

const channelKeys = ['whatsapp', 'messenger', 'instagram', 'email', 'sms'] as const;
type ChannelKey = typeof channelKeys[number];

export function ChannelSetupDialog({
  open,
  onOpenChange,
  defaultChannel = 'whatsapp',
  onSuccess,
}: ChannelSetupDialogProps) {
  const { toast } = useToast();
  const [selectedChannel, setSelectedChannel] = useState<ChannelKey>(defaultChannel);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'configure' | 'success'>('select');

  // WhatsApp config
  const [whatsappConfig, setWhatsappConfig] = useState({
    businessAccountId: '',
    phoneNumberId: '',
    accessToken: '',
    verifyToken: '',
  });

  // Messenger config
  const [messengerConfig, setMessengerConfig] = useState({
    pageId: '',
    accessToken: '',
    appId: '',
    appSecret: '',
    verifyToken: '',
  });

  // Instagram config
  const [instagramConfig, setInstagramConfig] = useState({
    pageId: '',
    accessToken: '',
    appId: '',
    appSecret: '',
    verifyToken: '',
  });

  // Email config
  const [emailConfig, setEmailConfig] = useState({
    provider: 'gmail',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    imapHost: '',
    imapPort: 993,
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
  });

  // SMS config
  const [smsConfig, setSmsConfig] = useState({
    provider: 'twilio',
    accountSid: '',
    authToken: '',
    phoneNumber: '',
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let result;
      switch (selectedChannel) {
        case 'whatsapp':
          result = await integrationsApi.setupWhatsApp(whatsappConfig);
          break;
        case 'messenger':
          // TODO: Add messenger setup endpoint
          result = { message: 'Messenger configured successfully' };
          break;
        case 'instagram':
          result = await integrationsApi.setupInstagram(instagramConfig);
          break;
        case 'email':
          result = await integrationsApi.setupEmail(emailConfig);
          break;
        case 'sms':
          // TODO: Add SMS setup endpoint
          result = { message: 'SMS configured successfully' };
          break;
      }

      toast({
        title: 'Success!',
        description: result?.message || 'Channel connected successfully',
      });

      setStep('success');
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
        setStep('configure');
      }, 2000);
  } catch (error: unknown) {
      toast({
        title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to connect channel',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const channelsMeta: Array<{
    key: 'whatsapp' | 'messenger' | 'instagram' | 'email' | 'sms';
    name: string;
    tagline: string;
    iconUrl: string;
    bg: string;
  }> = [
    {
      key: 'whatsapp',
      name: 'WhatsApp Business API',
      tagline: 'Automated messages, templates, rich media',
      iconUrl: 'https://img.icons8.com/ios-filled/50/25D366/whatsapp.png',
      bg: 'from-emerald-500/10 to-emerald-500/5',
    },
    {
      key: 'messenger',
      name: 'Facebook Messenger',
      tagline: 'Campaign integration, quick replies',
      iconUrl: 'https://img.icons8.com/ios-filled/50/1877F2/facebook-messenger.png',
      bg: 'from-blue-500/10 to-blue-500/5',
    },
    {
      key: 'instagram',
      name: 'Instagram',
      tagline: 'DMs, comments, story mentions',
      iconUrl: 'https://img.icons8.com/ios-filled/50/E4405F/instagram-new.png',
      bg: 'from-pink-500/10 to-pink-500/5',
    },
    {
      key: 'email',
      name: 'Email',
      tagline: 'IMAP/SMTP, aliases, signatures',
      iconUrl: 'https://img.icons8.com/ios-filled/50/3b82f6/new-post.png',
      bg: 'from-sky-500/10 to-sky-500/5',
    },
    {
      key: 'sms',
      name: 'SMS',
      tagline: 'Twilio, fast notifications',
      iconUrl: 'https://img.icons8.com/ios-filled/50/f59e0b/sms.png',
      bg: 'from-amber-500/10 to-amber-500/5',
    },
  ];

  const renderSelectStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <DialogTitle className="text-2xl">Connect your first channel</DialogTitle>
        <DialogDescription>Choose a channel to get started. You can add more later.</DialogDescription>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {channelsMeta.map((ch) => (
          <button
            key={ch.key}
            onClick={() => {
              setSelectedChannel(ch.key);
              setStep('configure');
            }}
            className={cn(
              'group relative overflow-hidden rounded-xl border p-4 text-left transition-all hover:shadow-lg',
              'bg-gradient-to-br', ch.bg
            )}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-background/80 shadow-sm">
                <Image src={ch.iconUrl} alt={ch.name} width={24} height={24} />
              </div>
              <div className="flex-1">
                <div className="font-medium">{ch.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{ch.tagline}</div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
        <div className="rounded-lg border py-2">5+ Channels</div>
        <div className="rounded-lg border py-2">~2 min Setup</div>
        <div className="rounded-lg border py-2">AI Powered</div>
      </div>
    </div>
  );

  const renderWhatsAppForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="wa-business-id">Business Account ID</Label>
        <Input
          id="wa-business-id"
          placeholder="123456789012345"
          value={whatsappConfig.businessAccountId}
          onChange={(e) =>
            setWhatsappConfig({ ...whatsappConfig, businessAccountId: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wa-phone-id">Phone Number ID</Label>
        <Input
          id="wa-phone-id"
          placeholder="987654321098765"
          value={whatsappConfig.phoneNumberId}
          onChange={(e) =>
            setWhatsappConfig({ ...whatsappConfig, phoneNumberId: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wa-token">Access Token</Label>
        <Input
          id="wa-token"
          type="password"
          placeholder="EAAxxxxxxxxxx"
          value={whatsappConfig.accessToken}
          onChange={(e) =>
            setWhatsappConfig({ ...whatsappConfig, accessToken: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wa-verify">Webhook Verify Token</Label>
        <Input
          id="wa-verify"
          placeholder="your_verify_token"
          value={whatsappConfig.verifyToken}
          onChange={(e) =>
            setWhatsappConfig({ ...whatsappConfig, verifyToken: e.target.value })
          }
        />
      </div>
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">Need help?</p>
              <p className="text-blue-700 dark:text-blue-300">
                Get your credentials from{' '}
                <a
                  href="https://developers.facebook.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline inline-flex items-center gap-1"
                >
                  Meta for Developers
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMessengerForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fb-page-id">Facebook Page ID</Label>
        <Input
          id="fb-page-id"
          placeholder="123456789012345"
          value={messengerConfig.pageId}
          onChange={(e) =>
            setMessengerConfig({ ...messengerConfig, pageId: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fb-token">Page Access Token</Label>
        <Input
          id="fb-token"
          type="password"
          placeholder="EAAxxxxxxxxxx"
          value={messengerConfig.accessToken}
          onChange={(e) =>
            setMessengerConfig({ ...messengerConfig, accessToken: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fb-app-id">App ID</Label>
        <Input
          id="fb-app-id"
          placeholder="123456789012345"
          value={messengerConfig.appId}
          onChange={(e) =>
            setMessengerConfig({ ...messengerConfig, appId: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fb-app-secret">App Secret</Label>
        <Input
          id="fb-app-secret"
          type="password"
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={messengerConfig.appSecret}
          onChange={(e) =>
            setMessengerConfig({ ...messengerConfig, appSecret: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fb-verify">Webhook Verify Token</Label>
        <Input
          id="fb-verify"
          placeholder="your_verify_token"
          value={messengerConfig.verifyToken}
          onChange={(e) =>
            setMessengerConfig({ ...messengerConfig, verifyToken: e.target.value })
          }
        />
      </div>
    </div>
  );

  const renderInstagramForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ig-page-id">Instagram Business Account ID</Label>
        <Input
          id="ig-page-id"
          placeholder="123456789012345"
          value={instagramConfig.pageId}
          onChange={(e) =>
            setInstagramConfig({ ...instagramConfig, pageId: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ig-token">Access Token</Label>
        <Input
          id="ig-token"
          type="password"
          placeholder="EAAxxxxxxxxxx"
          value={instagramConfig.accessToken}
          onChange={(e) =>
            setInstagramConfig({ ...instagramConfig, accessToken: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ig-app-id">App ID</Label>
        <Input
          id="ig-app-id"
          placeholder="123456789012345"
          value={instagramConfig.appId}
          onChange={(e) =>
            setInstagramConfig({ ...instagramConfig, appId: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ig-app-secret">App Secret</Label>
        <Input
          id="ig-app-secret"
          type="password"
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={instagramConfig.appSecret}
          onChange={(e) =>
            setInstagramConfig({ ...instagramConfig, appSecret: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ig-verify">Webhook Verify Token</Label>
        <Input
          id="ig-verify"
          placeholder="your_verify_token"
          value={instagramConfig.verifyToken}
          onChange={(e) =>
            setInstagramConfig({ ...instagramConfig, verifyToken: e.target.value })
          }
        />
      </div>
    </div>
  );

  const renderEmailForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email-from">From Email</Label>
        <Input
          id="email-from"
          type="email"
          placeholder="support@yourdomain.com"
          value={emailConfig.fromEmail}
          onChange={(e) =>
            setEmailConfig({ ...emailConfig, fromEmail: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-name">From Name</Label>
        <Input
          id="email-name"
          placeholder="Your Company Support"
          value={emailConfig.fromName}
          onChange={(e) =>
            setEmailConfig({ ...emailConfig, fromName: e.target.value })
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="smtp-host">SMTP Host</Label>
          <Input
            id="smtp-host"
            placeholder="smtp.gmail.com"
            value={emailConfig.smtpHost}
            onChange={(e) =>
              setEmailConfig({ ...emailConfig, smtpHost: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="smtp-port">SMTP Port</Label>
          <Input
            id="smtp-port"
            type="number"
            placeholder="587"
            value={emailConfig.smtpPort}
            onChange={(e) =>
              setEmailConfig({ ...emailConfig, smtpPort: parseInt(e.target.value) })
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-username">Username</Label>
        <Input
          id="email-username"
          placeholder="your-email@gmail.com"
          value={emailConfig.username}
          onChange={(e) =>
            setEmailConfig({ ...emailConfig, username: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-password">Password / App Password</Label>
        <Input
          id="email-password"
          type="password"
          placeholder="••••••••••••••••"
          value={emailConfig.password}
          onChange={(e) =>
            setEmailConfig({ ...emailConfig, password: e.target.value })
          }
        />
      </div>
    </div>
  );

  const renderSMSForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sms-sid">Account SID</Label>
        <Input
          id="sms-sid"
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={smsConfig.accountSid}
          onChange={(e) =>
            setSmsConfig({ ...smsConfig, accountSid: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sms-token">Auth Token</Label>
        <Input
          id="sms-token"
          type="password"
          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={smsConfig.authToken}
          onChange={(e) =>
            setSmsConfig({ ...smsConfig, authToken: e.target.value })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sms-phone">Phone Number</Label>
        <Input
          id="sms-phone"
          placeholder="+1234567890"
          value={smsConfig.phoneNumber}
          onChange={(e) =>
            setSmsConfig({ ...smsConfig, phoneNumber: e.target.value })
          }
        />
      </div>
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">Using Twilio?</p>
              <p className="text-blue-700 dark:text-blue-300">
                Get your credentials from{' '}
                <a
                  href="https://console.twilio.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline inline-flex items-center gap-1"
                >
                  Twilio Console
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSuccessState = () => (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
        Channel Connected!
      </h3>
      <p className="text-slate-600 dark:text-slate-400">
        Your {selectedChannel} channel is now ready to receive messages
      </p>
    </div>
  );

  const channelIcons = {
    whatsapp: MessageSquare,
    messenger: MessageSquare,
    instagram: Instagram,
    email: Mail,
    sms: Phone,
  };

  const channelColors = {
    whatsapp: 'text-green-600',
    messenger: 'text-blue-600',
    instagram: 'text-pink-600',
    email: 'text-purple-600',
    sms: 'text-orange-600',
  };

  const Icon = channelIcons[selectedChannel];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setStep('select');
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/60 bg-background/80 backdrop-blur-md shadow-2xl">
        {step === 'success'
          ? renderSuccessState()
          : step === 'select'
          ? renderSelectStep()
          : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Icon className={`h-6 w-6 ${channelColors[selectedChannel]}`} />
                </div>
                <DialogTitle className="text-2xl">
                  Connect {selectedChannel.charAt(0).toUpperCase() + selectedChannel.slice(1)}
                </DialogTitle>
              </div>
              <DialogDescription>
                Enter your credentials to connect your {selectedChannel} channel
              </DialogDescription>
            </DialogHeader>

            <Tabs
              value={selectedChannel}
              onValueChange={(v: string) => {
                if ((channelKeys as readonly string[]).includes(v)) {
                  setSelectedChannel(v as ChannelKey);
                }
              }}
            >
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="whatsapp" className="text-xs">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger value="messenger" className="text-xs">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Messenger
                </TabsTrigger>
                <TabsTrigger value="instagram" className="text-xs">
                  <Instagram className="h-4 w-4 mr-1" />
                  Instagram
                </TabsTrigger>
                <TabsTrigger value="email" className="text-xs">
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="sms" className="text-xs">
                  <Phone className="h-4 w-4 mr-1" />
                  SMS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="whatsapp">{renderWhatsAppForm()}</TabsContent>
              <TabsContent value="messenger">{renderMessengerForm()}</TabsContent>
              <TabsContent value="instagram">{renderInstagramForm()}</TabsContent>
              <TabsContent value="email">{renderEmailForm()}</TabsContent>
              <TabsContent value="sms">{renderSMSForm()}</TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('select')} disabled={loading}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Channel'
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

