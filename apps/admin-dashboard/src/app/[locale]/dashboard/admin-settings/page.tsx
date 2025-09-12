'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Users,
  Shield,
  Bell,
  Server,
  Palette,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit,
  Link as LinkIcon,
  Globe,
  Send,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { webhooksApi, WebhookEndpoint } from '@/lib/api/webhooks-client';
import { useWhiteLabel } from '@/lib/hooks/use-white-label';
import { WhiteLabelTemplatesPanel } from '@/components/settings/white-label-templates';
import { FeatureTogglesPanel } from '@/components/settings/feature-toggles';
import { EmailTemplatesPanel } from '@/components/settings/email-templates';
import { EmailSmtpPanel } from '@/components/settings/email-smtp';
import { EmailBuilderPanel } from '@/components/settings/email-builder';
import { useLocalizationStore } from '@/lib/store/localization-store';
import { Select as UISelect, SelectContent as UISelectContent, SelectItem as UISelectItem, SelectTrigger as UISelectTrigger, SelectValue as UISelectValue } from '@/components/ui/select';

import { useTheme } from '@/components/theme-provider';
import { useAuthStore } from '@/lib/store/auth-store';
import { tenantsApi } from '@/lib/api/tenants-client';
import { useCustomFieldsStore } from '@/lib/store/custom-fields-store';
// import { customFieldsApi } from '@/lib/api/custom-fields-client';
// import { useEffect as _useEffect } from 'react';
import ChannelSetupForm from '@/components/integrations/channel-setup-form';
import NotificationPreferences from '@/components/settings/notification-preferences';
import { subscriptionApi, SubscriptionPlanDTO, SubscriptionDTO } from '@/lib/api/subscription-client';

function DashboardBuilderStub() {
  const [config, setConfig] = useState<{ layout: 'grid' | 'masonry'; widgets: string[] }>({ layout: 'grid', widgets: [] });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const data = await tenantsApi.getMyDashboard();
        setConfig({ layout: (data.layout as any) || 'grid', widgets: (data.widgets as any) || [] });
      } catch (e) {
        // ignore load error
      }
    })();
  }, []);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
        <CardDescription>Choose layout and visible widgets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Layout</Label>
            <Select value={config.layout} onValueChange={(v) => setConfig((c) => ({ ...c, layout: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">Grid</SelectItem>
                <SelectItem value="masonry">Masonry</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Widgets (comma separated)</Label>
            <Input value={config.widgets.join(', ')} onChange={(e) => setConfig((c) => ({ ...c, widgets: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
          </div>
        </div>
        <div className="mt-4">
          <Button disabled={saving} onClick={async () => { setSaving(true); try { await tenantsApi.updateMyDashboard(config as any); } finally { setSaving(false); } }}>Save Dashboard</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PermissionsManagerStub() {
  const [roles, setRoles] = useState<Record<string, { permissions: string[] }>>({ admin: { permissions: [] }, agent: { permissions: [] } });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const data = await tenantsApi.getMyRoles();
        setRoles(data || {});
      } catch (e) {
        // ignore load error
      }
    })();
  }, []);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
        <CardDescription>Define permissions per role</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(roles).map(([role, def]) => (
            <div key={role} className="p-3 border rounded-lg">
              <div className="font-medium capitalize">{role}</div>
              <Label className="text-sm">Permissions (comma separated)</Label>
              <Input defaultValue={(def.permissions || []).join(', ')} onBlur={(e) => {
                const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                setRoles((r) => ({ ...r, [role]: { permissions: arr } }));
              }} />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Button disabled={saving} onClick={async () => { setSaving(true); try { await tenantsApi.updateMyRoles(roles); } finally { setSaving(false); } }}>Save Permissions</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Mock admin settings data
const mockAdminSettings = {
  general: {
    companyName: 'Glavito Support',
    companyLogo: '',
    timezone: 'America/New_York',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  },
  security: {
    twoFactorRequired: true,
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,
    sessionTimeout: 480, // minutes
    maxLoginAttempts: 5,
    lockoutDuration: 30 // minutes
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    escalationNotifications: true,
    systemAlerts: true
  },
  integrations: {
    emailProvider: 'sendgrid',
    smsProvider: 'twilio',
    analyticsProvider: 'google',
    chatProvider: 'intercom'
  },
  branding: {
    name: 'Glavito Support',
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    logoUrl: '',
    faviconUrl: '',
    customCss: ''
  },
  apiKeys: [
    {
      id: '1',
      name: 'Production API',
      key: 'pk_live_*********************',
      createdAt: '2024-01-15T10:00:00Z',
      lastUsed: '2024-01-20T14:30:00Z',
      permissions: ['read', 'write']
    },
    {
      id: '2',
      name: 'Development API',
      key: 'pk_test_*********************',
      createdAt: '2024-01-10T10:00:00Z',
      lastUsed: '2024-01-19T09:15:00Z',
      permissions: ['read']
    }
  ],
  users: [
    {
      id: '1',
      email: 'admin@glavito.com',
      firstName: 'John',
      lastName: 'Admin',
      role: 'admin',
      status: 'active',
      lastLogin: '2024-01-20T15:30:00Z',
      createdAt: '2024-01-01T10:00:00Z'
    },
    {
      id: '2',
      email: 'manager@glavito.com',
      firstName: 'Jane',
      lastName: 'Manager',
      role: 'manager',
      status: 'active',
      lastLogin: '2024-01-20T12:15:00Z',
      createdAt: '2024-01-05T10:00:00Z'
    }
  ]
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState(mockAdminSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState('general');
  const [domains, setDomains] = useState<Array<{ id: string; domain: string; status: string; sslStatus: string; verificationToken?: string; dnsRecords?: any; errorMessage?: string }>>([]);
  const [domainInput, setDomainInput] = useState('');
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [whForm, setWhForm] = useState<{ name: string; url: string; events: string; secret?: string }>({ name: '', url: '', events: 'ticket.created', secret: '' });
  const [whLoading, setWhLoading] = useState(false);
  const [whTestLoading, setWhTestLoading] = useState(false);
  // API Keys UI state
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; prefix: string; permissions: string[]; isActive: boolean; lastUsedAt?: string; createdAt: string }>>([]);
  const [apiKeyName, setApiKeyName] = useState('Dev Key');
  const [apiKeyPerms, setApiKeyPerms] = useState('read');
  const [apiKeyNewPlain, setApiKeyNewPlain] = useState<string>('');
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;
  const { applyBranding } = useTheme();
  const { assets, uploadAsset, removeAsset, loading: wlLoading } = useWhiteLabel();
  const { fields, load: loadCustomFields, create: createField, update: updateField, remove: removeField } = useCustomFieldsStore();

  // Billing state
  const [billingPlans, setBillingPlans] = useState<SubscriptionPlanDTO[]>([]);
  const [billingCurrent, setBillingCurrent] = useState<SubscriptionDTO | null>(null);
  const [billingUsage, setBillingUsage] = useState<{ limits?: any; usage?: any } | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  // Load current branding into the form when tenantId is available
  useEffect(() => {
    const loadBranding = async () => {
      if (!tenantId) return;
      try {
        const b = await tenantsApi.getBranding(tenantId);
        setSettings(prev => ({
          ...prev,
          branding: {
            ...prev.branding,
            name: b.name || prev.branding.name,
            logoUrl: b.logoUrl || '',
            faviconUrl: b.faviconUrl || '',
            primaryColor: b.colors?.primary || prev.branding.primaryColor,
            secondaryColor: b.colors?.secondary || prev.branding.secondaryColor,
            customCss: b.customCSS || prev.branding.customCss,
          },
        }));
      } catch (e) {
        // ignore load failures for now
      }
    };
    loadBranding();
  }, [tenantId]);

  // Load custom fields when tab opens
  useEffect(() => {
    if (activeTab === 'customFields') {
      loadCustomFields();
    }
  }, [activeTab, loadCustomFields]);

  // Load domains when branding tab active
  useEffect(() => {
    if (activeTab === 'branding') {
      tenantsApi.listDomains().then(setDomains).catch(() => { /* no-op */ });
    }
  }, [activeTab]);

  // Load billing data when billing tab active
  const loadBilling = async () => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const [p, c, u] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getCurrent(),
        subscriptionApi.usage().catch(() => null),
      ]);
      setBillingPlans(p);
      setBillingCurrent(c);
      setBillingUsage(u ? { limits: u.limits, usage: u.usage } : null);
    } catch (e: any) {
      setBillingError(e?.message || 'Failed to load billing');
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'billing') {
      loadBilling();
    }
  }, [activeTab]);

  const loadWebhooks = async () => {
    try {
      const list = await webhooksApi.listEndpoints();
      setWebhooks(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to load webhooks', e);
    }
  };

  const loadApiKeys = async () => {
    try {
      const list = await tenantsApi.listApiKeys();
      setApiKeys(Array.isArray(list) ? list : []);
    } catch (e) {
      setApiKeys([]);
    }
  };

  const handleCreateWebhook = async () => {
    if (!whForm.name || !whForm.url || !whForm.events) return;
    setWhLoading(true);
    try {
      const events = whForm.events.split(',').map((s) => s.trim()).filter(Boolean);
      await webhooksApi.createEndpoint({
        name: whForm.name,
        url: whForm.url,
        events,
        secret: whForm.secret || undefined,
        retryPolicy: { maxRetries: 3, retryDelay: 2000, backoffMultiplier: 2 },
      });
      setWhForm({ name: '', url: '', events: 'ticket.created', secret: '' });
      await loadWebhooks();
    } finally {
      setWhLoading(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    setWhLoading(true);
    try {
      await webhooksApi.deleteEndpoint(id);
      await loadWebhooks();
    } finally {
      setWhLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!user?.tenantId) return;
    setWhTestLoading(true);
    try {
      await webhooksApi.sendTestEvent('ticket.created', user.tenantId, { ticketId: 'test-ticket', subject: 'Webhook test' });
    } finally {
      setWhTestLoading(false);
    }
  };

  // Lazy load integrations data when integrations tab becomes active
  if (typeof window !== 'undefined' && activeTab === 'integrations') {
    if (webhooks.length === 0) {
      // fire and forget
      loadWebhooks();
    }
    if (apiKeys.length === 0) {
      loadApiKeys();
    }
  }

  const handleSettingChange = (section: string, field: string, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      if (tenantId) {
        await tenantsApi.updateBranding(tenantId, {
          name: settings.branding.name,
          colors: {
            primary: settings.branding.primaryColor,
            secondary: settings.branding.secondaryColor,
          },
          customCSS: settings.branding.customCss,
          logoUrl: settings.branding.logoUrl || undefined,
          faviconUrl: settings.branding.faviconUrl || undefined,
        });
        // Live update:
        applyBranding({
          name: settings.branding.name,
          logoUrl: settings.branding.logoUrl || undefined,
          faviconUrl: settings.branding.faviconUrl || undefined,
          colors: { primary: settings.branding.primaryColor, secondary: settings.branding.secondaryColor },
          customCSS: settings.branding.customCss,
        });
      }
    } finally {
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    setSettings(mockAdminSettings);
    setHasChanges(false);
  };

  const toggleApiKeyVisibility = (keyId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  // Billing functions
  const switchPlan = async (planId: string) => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      await (billingCurrent ? subscriptionApi.update(planId) : subscriptionApi.create(planId));
      await loadBilling();
    } catch (e: any) {
      setBillingError(e?.message || 'Failed to change plan');
    } finally {
      setBillingLoading(false);
    }
  };

  const cancelSubscription = async () => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      await subscriptionApi.cancel();
      await loadBilling();
    } catch (e: any) {
      setBillingError(e?.message || 'Failed to cancel');
    } finally {
      setBillingLoading(false);
    }
  };

  const planPrice = (p: SubscriptionPlanDTO) => (p.price > 0 ? `$${p.price}/mo` : 'Free');
  const currentPlanId = billingCurrent?.plan;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Configure your workspace preferences and integrations
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="glass border-slate-200/60 dark:border-slate-700/60 hover:bg-white/80 dark:hover:bg-slate-800/80"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>

        {/* Modern Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="glass rounded-2xl p-2 border border-white/20 dark:border-slate-700/50 shadow-xl backdrop-blur-xl">
            <TabsList className="grid w-full grid-cols-6 lg:grid-cols-11 gap-1 bg-transparent p-0">
              <TabsTrigger
                value="general"
                className="flex items-center justify-center space-x-2 rounded-xl px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="flex items-center justify-center space-x-2 rounded-xl px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="flex items-center justify-center space-x-2 rounded-xl px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger
                value="integrations"
                className="flex items-center justify-center space-x-2 rounded-xl px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                <Server className="h-4 w-4" />
                <span className="hidden sm:inline">Integrations</span>
              </TabsTrigger>
              <TabsTrigger
                value="branding"
                className="flex items-center justify-center space-x-2 rounded-xl px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Branding</span>
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="flex items-center justify-center space-x-2 rounded-xl px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger
                value="themes"
                className="flex items-center justify-center space-x-2 rounded-xl px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Themes</span>
              </TabsTrigger>
              <TabsTrigger
                value="customFields"
                className="flex items-center justify-center space-x-2 rounded-xl px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Fields</span>
              </TabsTrigger>
              <TabsTrigger
                value="dashboard"
                className="flex items-center justify-center space-x-2 rounded-xl px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="permissions"
                className="flex items-center justify-center space-x-2 rounded-xl px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Permissions</span>
              </TabsTrigger>
              <TabsTrigger
                value="billing"
                className="flex items-center justify-center space-x-2 rounded-xl px-4 py-3 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Billing</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* General Settings */}
          <TabsContent value="general">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="glass rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl backdrop-blur-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/50 dark:to-slate-700/50 px-8 py-6 border-b border-white/20 dark:border-slate-700/50">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">General Settings</h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Configure basic system settings and preferences
                  </p>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Localization quick panel */}
                    <div className="md:col-span-2 p-4 border rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-sm font-semibold">Localization</div>
                          <div className="text-xs text-muted-foreground">Preferred locale and currency</div>
                        </div>
                      </div>
                      <LocalizationInlinePanel />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="company-name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Company Name</Label>
                      <Input
                        id="company-name"
                        value={settings.general.companyName}
                        onChange={(e) => handleSettingChange('general', 'companyName', e.target.value)}
                        className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                      />
                    </div>

                    {/* Localization quick panel */}
                    <div className="md:col-span-2 p-4 border rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-sm font-semibold">Localization</div>
                          <div className="text-xs text-muted-foreground">Preferred locale and currency</div>
                        </div>
                      </div>
                      <LocalizationInlinePanel />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="timezone" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Timezone</Label>
                      <Select
                        value={settings.general.timezone}
                        onValueChange={(value) => handleSettingChange('general', 'timezone', value)}
                      >
                        <SelectTrigger className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass border-slate-200/60 dark:border-slate-700/60">
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                          <SelectItem value="Europe/London">London</SelectItem>
                          <SelectItem value="Europe/Paris">Paris</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="language" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Default Language</Label>
                      <Select
                        value={settings.general.language}
                        onValueChange={(value) => handleSettingChange('general', 'language', value)}
                      >
                        <SelectTrigger className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass border-slate-200/60 dark:border-slate-700/60">
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="ja">Japanese</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="date-format" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Date Format</Label>
                      <Select
                        value={settings.general.dateFormat}
                        onValueChange={(value) => handleSettingChange('general', 'dateFormat', value)}
                      >
                        <SelectTrigger className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass border-slate-200/60 dark:border-slate-700/60">
                          <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                          <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="time-format" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Time Format</Label>
                      <Select
                        value={settings.general.timeFormat}
                        onValueChange={(value) => handleSettingChange('general', 'timeFormat', value)}
                      >
                        <SelectTrigger className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass border-slate-200/60 dark:border-slate-700/60">
                          <SelectItem value="12h">12 Hour</SelectItem>
                          <SelectItem value="24h">24 Hour</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="glass rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl backdrop-blur-xl overflow-hidden">
                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-slate-800/50 dark:to-slate-700/50 px-8 py-6 border-b border-white/20 dark:border-slate-700/50">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Security Settings</h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Configure authentication and security policies
                  </p>
                </div>
                <div className="p-8">
                  <div className="space-y-8">
                    {/* Custom Domains */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Custom Domains</Label>
                      <div className="flex gap-2">
                        <Input placeholder="support.yourdomain.com" value={domainInput} onChange={(e) => setDomainInput(e.target.value)} />
                        <Button onClick={async () => { if (!domainInput) return; const created = await tenantsApi.createDomain(domainInput); setDomains((d) => [created, ...d]); setDomainInput(''); }}>Add</Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Array.isArray(domains) && domains.map((d) => (
                          <div key={d.id} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{d.domain}</div>
                                <div className="text-xs text-muted-foreground">Status: {d.status} · SSL: {d.sslStatus}</div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={async () => { const upd = await tenantsApi.checkDomain(d.id); setDomains((arr) => arr.map((x) => x.id === d.id ? upd : x)); }}>Check</Button>
                                <Button variant="outline" size="sm" onClick={async () => { const upd = await tenantsApi.requestSSL(d.id); setDomains((arr) => arr.map((x) => x.id === d.id ? upd : x)); }} disabled={d.status !== 'active'}>Request SSL</Button>
                                <Button variant="outline" size="sm" onClick={async () => { await tenantsApi.deleteDomain(d.id); setDomains((arr) => arr.filter((x) => x.id !== d.id)); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {d.verificationToken && (
                              <div className="mt-2 text-xs">
                                Create TXT record: <code className="px-1">_glavito.{d.domain}</code> value <code className="px-1">{d.verificationToken}</code>
                              </div>
                            )}
                            {d.errorMessage && (
                              <div className="mt-1 text-xs text-red-600">{d.errorMessage}</div>
                            )}
                          </div>
                        ))}
                        {(!Array.isArray(domains) || domains.length === 0) && (
                          <div className="text-sm text-muted-foreground">No custom domains yet.</div>
                        )}
                      </div>
                    </div>
                    {/* Brand Assets Panel */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Brand Assets</h3>
                        <div className="flex gap-2">
                          <Input id="upload-logo2" type="file" accept="image/*" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const asset = await uploadAsset(file, 'logo');
                              if (asset?.originalUrl) {
                                handleSettingChange('branding', 'logoUrl', asset.originalUrl);
                              }
                            }
                          }} />
                          <Input id="upload-favicon2" type="file" accept="image/*,.ico" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const asset = await uploadAsset(file, 'favicon');
                              if (asset?.originalUrl) {
                                handleSettingChange('branding', 'faviconUrl', asset.originalUrl);
                              }
                            }
                          }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Array.isArray(assets) && assets.length > 0 && assets.map((a) => (
                          <div key={a.id} className="p-4 border rounded-lg">
                            <div className="text-sm font-medium">{a.type}</div>
                            <div className="mt-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={a.originalUrl} alt={a.type} className="max-h-24 object-contain" />
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(a.variants || []).slice(0,3).map((v, idx) => (
                                <a key={idx} href={(v as any).url} target="_blank" rel="noreferrer" className="text-xs underline">{(v as any).size}.{(v as any).format}</a>
                              ))}
                            </div>
                            <div className="mt-3">
                              <Button variant="outline" size="sm" onClick={() => removeAsset(a.id)}>Remove</Button>
                            </div>
                          </div>
                        ))}
                        {!wlLoading && (!Array.isArray(assets) || assets.length === 0) && (
                          <div className="text-sm text-muted-foreground">No brand assets yet.</div>
                        )}
                        {wlLoading && <div className="text-sm text-muted-foreground">Loading assets...</div>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-6 glass rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <div className="space-y-1">
                        <Label htmlFor="two-factor" className="text-base font-semibold text-slate-900 dark:text-white">Require Two-Factor Authentication</Label>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Force all users to enable 2FA for enhanced security</p>
                      </div>
                      <Switch
                        id="two-factor"
                        checked={settings.security.twoFactorRequired}
                        onCheckedChange={(checked: boolean) => handleSettingChange('security', 'twoFactorRequired', checked)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="password-length" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Minimum Password Length</Label>
                        <Input
                          id="password-length"
                          type="number"
                          min="6"
                          max="32"
                          value={settings.security.passwordMinLength}
                          onChange={(e) => handleSettingChange('security', 'passwordMinLength', parseInt(e.target.value))}
                          className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="session-timeout" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Session Timeout (minutes)</Label>
                        <Input
                          id="session-timeout"
                          type="number"
                          min="30"
                          max="1440"
                          value={settings.security.sessionTimeout}
                          onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                          className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="max-attempts" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Max Login Attempts</Label>
                        <Input
                          id="max-attempts"
                          type="number"
                          min="3"
                          max="10"
                          value={settings.security.maxLoginAttempts}
                          onChange={(e) => handleSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                          className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="lockout-duration" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Lockout Duration (minutes)</Label>
                        <Input
                          id="lockout-duration"
                          type="number"
                          min="5"
                          max="120"
                          value={settings.security.lockoutDuration}
                          onChange={(e) => handleSettingChange('security', 'lockoutDuration', parseInt(e.target.value))}
                          className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-6 glass rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <div className="space-y-1">
                        <Label htmlFor="special-chars" className="text-base font-semibold text-slate-900 dark:text-white">Require Special Characters in Passwords</Label>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Passwords must contain special characters for enhanced security</p>
                      </div>
                      <Switch
                        id="special-chars"
                        checked={settings.security.passwordRequireSpecialChars}
                        onCheckedChange={(checked: boolean) => handleSettingChange('security', 'passwordRequireSpecialChars', checked)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>

                    {/* Templates Panel */}
                    <WhiteLabelTemplatesPanel />
                    {/* Email Templates Panel */}
                    <EmailTemplatesPanel />
                    {/* Email Builder Panel */}
                    <EmailBuilderPanel />
                    {/* SMTP Settings Panel */}
                    <EmailSmtpPanel />
                    {/* Feature Toggles Panel */}
                    <FeatureTogglesPanel />
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>
                        Manage system users and their permissions
                      </CardDescription>
                    </div>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {settings.users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Avatar>
                            <AvatarImage src="" />
                            <AvatarFallback>
                              {user.firstName[0]}{user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{user.email}</div>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role}
                              </Badge>
                              <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                                {user.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Integrations: API Keys, Channels and Webhooks */}
          <TabsContent value="integrations">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Channels</CardTitle>
                  <CardDescription>Connect messaging channels</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChannelSetupForm onComplete={() => { /* no-op; could refetch status */ }} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>API Keys</CardTitle>
                      <CardDescription>
                        Manage API keys for external integrations
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input placeholder="Key name" value={apiKeyName} onChange={(e) => setApiKeyName(e.target.value)} className="w-40" />
                      <Input placeholder="Permissions (comma)" value={apiKeyPerms} onChange={(e) => setApiKeyPerms(e.target.value)} className="w-60" />
                      <Button onClick={async () => {
                        const perms = apiKeyPerms.split(',').map((s) => s.trim()).filter(Boolean);
                        const created = await tenantsApi.createApiKey(apiKeyName || 'Key', perms);
                        setApiKeyNewPlain(created.plaintext);
                        await loadApiKeys();
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Generate API Key
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {apiKeyNewPlain && (
                    <div className="mb-4 p-3 border rounded-lg bg-yellow-50 text-yellow-800 text-sm">
                      Copy now: <code className="font-mono">{apiKeyNewPlain}</code> (will not be shown again)
                    </div>
                  )}
                  <div className="space-y-4">
                    {Array.isArray(apiKeys) && apiKeys.map((apiKey) => (
                      <div key={apiKey.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{apiKey.name}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{apiKey.prefix}••••</code>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Last used: {apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleDateString() : '—'}
                          </div>
                          <div className="flex items-center space-x-1 mt-1">
                            {apiKey.permissions.map(permission => (
                              <Badge key={permission} variant="outline" className="text-xs">
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={async () => { await tenantsApi.deleteApiKey(apiKey.id); await loadApiKeys(); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!Array.isArray(apiKeys) || apiKeys.length === 0) && (
                      <div className="text-sm text-muted-foreground">No API keys yet.</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Webhooks Management */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Webhooks</CardTitle>
                      <CardDescription>
                        Receive real-time events to your systems (ticket.created, ticket.assigned, ...)
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={handleSendTest} disabled={whTestLoading}>
                        <Send className="h-4 w-4 mr-2" />
                        {whTestLoading ? 'Sending...' : 'Send Test Event'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-3 md:col-span-1">
                      <Label>Name</Label>
                      <Input value={whForm.name} onChange={(e) => setWhForm({ ...whForm, name: e.target.value })} placeholder="My Integration" />
                      <Label className="mt-3">URL</Label>
                      <div className="flex gap-2">
                        <Input value={whForm.url} onChange={(e) => setWhForm({ ...whForm, url: e.target.value })} placeholder="https://example.com/webhook" className="flex-1" />
                        <Globe className="h-5 w-5 text-muted-foreground mt-2" />
                      </div>
                      <Label className="mt-3">Events (comma separated)</Label>
                      <Input value={whForm.events} onChange={(e) => setWhForm({ ...whForm, events: e.target.value })} placeholder="ticket.created, ticket.assigned" />
                      <Label className="mt-3">Secret (optional)</Label>
                      <Input value={whForm.secret} onChange={(e) => setWhForm({ ...whForm, secret: e.target.value })} placeholder="Used to sign payloads" />
                      <Button onClick={handleCreateWebhook} disabled={whLoading || !whForm.name || !whForm.url} className="w-full mt-3">
                        {whLoading ? 'Adding...' : 'Add Endpoint'}
                      </Button>
                    </div>
                    <div className="md:col-span-2">
                      <div className="space-y-3">
                        {(!Array.isArray(webhooks) || webhooks.length === 0) && (
                          <div className="text-sm text-muted-foreground">No webhook endpoints yet.</div>
                        )}
                        {Array.isArray(webhooks) && webhooks.map((wh) => (
                          <div key={wh.id} className="p-4 border rounded-lg flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium truncate">{wh.name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground truncate">{wh.url}</div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {wh.events.map((e) => (
                                  <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={wh.isActive ? 'default' : 'secondary'} className="text-xs">{wh.isActive ? 'Active' : 'Disabled'}</Badge>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteWebhook(wh.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <NotificationPreferences />
            </motion.div>
          </TabsContent>

          {/* Branding */}
          <TabsContent value="branding">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="glass rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl backdrop-blur-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-slate-800/50 dark:to-slate-700/50 px-8 py-6 border-b border-white/20 dark:border-slate-700/50">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Branding Settings</h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Customize the appearance and branding of your support portal
                  </p>
                </div>
                <div className="p-8">
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label htmlFor="primary-color" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Primary Color</Label>
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Input
                              id="primary-color"
                              type="color"
                              value={settings.branding.primaryColor}
                              onChange={(e) => handleSettingChange('branding', 'primaryColor', e.target.value)}
                              className="w-16 h-12 rounded-xl border-2 border-slate-200/60 dark:border-slate-700/60 cursor-pointer"
                            />
                          </div>
                          <Input
                            value={settings.branding.primaryColor}
                            onChange={(e) => handleSettingChange('branding', 'primaryColor', e.target.value)}
                            className="flex-1 glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="secondary-color" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Secondary Color</Label>
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Input
                              id="secondary-color"
                              type="color"
                              value={settings.branding.secondaryColor}
                              onChange={(e) => handleSettingChange('branding', 'secondaryColor', e.target.value)}
                              className="w-16 h-12 rounded-xl border-2 border-slate-200/60 dark:border-slate-700/60 cursor-pointer"
                            />
                          </div>
                          <Input
                            value={settings.branding.secondaryColor}
                            onChange={(e) => handleSettingChange('branding', 'secondaryColor', e.target.value)}
                            className="flex-1 glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="brand-name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Brand Name</Label>
                      <Input
                        id="brand-name"
                        value={settings.branding.name}
                        onChange={(e) => handleSettingChange('branding', 'name', e.target.value)}
                        placeholder="Your brand display name"
                        className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="logo-url" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Logo URL</Label>
                      <Input
                        id="logo-url"
                        value={settings.branding.logoUrl}
                        onChange={(e) => handleSettingChange('branding', 'logoUrl', e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          id="logo-file"
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !tenantId) return;
                            const asset = await uploadAsset(file, 'logo');
                            if (asset?.originalUrl) handleSettingChange('branding', 'logoUrl', asset.originalUrl);
                          }}
                          className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="favicon-url" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Favicon URL</Label>
                      <Input
                        id="favicon-url"
                        value={settings.branding.faviconUrl}
                        onChange={(e) => handleSettingChange('branding', 'faviconUrl', e.target.value)}
                        placeholder="https://example.com/favicon.ico"
                        className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          id="favicon-file"
                          type="file"
                          accept="image/*,.ico"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !tenantId) return;
                            const asset = await uploadAsset(file, 'favicon');
                            if (asset?.originalUrl) handleSettingChange('branding', 'faviconUrl', asset.originalUrl);
                          }}
                          className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="custom-css" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Custom CSS</Label>
                      <Textarea
                        id="custom-css"
                        value={settings.branding.customCss}
                        onChange={(e) => handleSettingChange('branding', 'customCss', e.target.value)}
                        placeholder="/* Add your custom CSS here */"
                        rows={6}
                        className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Theme Presets */}
          <TabsContent value="themes">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="glass rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl backdrop-blur-xl overflow-hidden">
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-slate-800/50 dark:to-slate-700/50 px-8 py-6 border-b border-white/20 dark:border-slate-700/50">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Theme Presets</h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Select a preset to quickly style your app. You can fine-tune in Branding.
                  </p>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { name: 'Ocean', primary: '#0ea5e9', secondary: '#22d3ee' },
                      { name: 'Sunset', primary: '#f97316', secondary: '#ef4444' },
                      { name: 'Violet', primary: '#8b5cf6', secondary: '#6366f1' },
                    ].map((preset) => (
                      <div key={preset.name} className="glass rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-6 hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{preset.name}</div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="inline-block h-6 w-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: preset.primary }} />
                              <span className="inline-block h-6 w-6 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: preset.secondary }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 glass border-slate-200/60 dark:border-slate-700/60"
                            onClick={() => {
                              handleSettingChange('branding', 'primaryColor', preset.primary);
                              handleSettingChange('branding', 'secondaryColor', preset.secondary);
                              applyBranding({
                                name: settings.branding.name,
                                logoUrl: settings.branding.logoUrl || undefined,
                                faviconUrl: settings.branding.faviconUrl || undefined,
                                colors: { primary: preset.primary, secondary: preset.secondary },
                                customCSS: settings.branding.customCss,
                              });
                            }}
                          >
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                            onClick={() => {
                              handleSettingChange('branding', 'primaryColor', preset.primary);
                              handleSettingChange('branding', 'secondaryColor', preset.secondary);
                              setHasChanges(true);
                            }}
                          >
                            Use
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="glass rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-6 hover:shadow-lg transition-all duration-200">
                      <div className="mb-4">
                        <div className="font-semibold text-slate-900 dark:text-white">Reset to Default</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">Restore original theme variables</div>
                      </div>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                          handleSettingChange('branding', 'primaryColor', '#3B82F6');
                          handleSettingChange('branding', 'secondaryColor', '#8B5CF6');
                          handleSettingChange('branding', 'customCss', '');
                          applyBranding({
                            name: settings.branding.name,
                            logoUrl: settings.branding.logoUrl || undefined,
                            faviconUrl: settings.branding.faviconUrl || undefined,
                            colors: { primary: '#3B82F6', secondary: '#8B5CF6' },
                            customCSS: '',
                          });
                          setHasChanges(true);
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Custom Fields */}
          <TabsContent value="customFields">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Custom Fields</CardTitle>
                  <CardDescription>Define fields for Tickets, Customers, Leads and Deals with validation and conditional logic</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {["ticket", "customer", "lead", "deal"].map((entity) => (
                      <div key={entity as string} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold capitalize">{entity} Fields</h3>
                          <Button size="sm" onClick={async () => {
                            await createField({
                              entity: entity as any,
                              name: `field_${Date.now().toString(36)}`,
                              label: 'New Field',
                              type: 'text',
                            });
                          }}>
                            <Plus className="h-4 w-4 mr-2" />Add Field
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {(fields as any)[entity]?.length ? (fields as any)[entity].map((f: any) => (
                            <div key={f.id} className="p-3 border rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                                <Input value={f.label} onChange={async (e) => { await updateField(f.id, { label: e.target.value }); }} />
                                <Input value={f.name} onChange={async (e) => { await updateField(f.id, { name: e.target.value }); }} />
                                <Select value={f.type} onValueChange={async (v) => { await updateField(f.id, { type: v as any }); }}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {['text', 'textarea', 'number', 'boolean', 'select', 'multiselect', 'date', 'email', 'phone', 'url'].map(t => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm">Required</Label>
                                  <Switch checked={f.required} onCheckedChange={async (c) => { await updateField(f.id, { required: c }); }} />
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="outline" size="sm" onClick={async () => { await removeField(f.id); }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              {['select', 'multiselect'].includes(f.type) && (
                                <div className="mt-2">
                                  <Label className="text-sm">Options (comma separated value:label)</Label>
                                  <Input defaultValue={(f.options || []).map((o: { value: string; label: string }) => `${o.value}:${o.label}`).join(', ')} onBlur={async (e: React.FocusEvent<HTMLInputElement>) => {
                                    const raw = e.target.value;
                                    const options = raw.split(',').map(s => s.trim()).filter(Boolean).map(pair => {
                                      const [value, label] = pair.split(':');
                                      return { value: value?.trim() || '', label: (label || value || '').trim() };
                                    }).filter(o => o.value);
                                    await updateField(f.id, { options });
                                  }} />
                                </div>
                              )}
                            </div>
                          )) : (
                            <div className="text-sm text-muted-foreground">No fields yet.</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Dashboard (stub) */}
          <TabsContent value="dashboard">
            <DashboardBuilderStub />
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="glass rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl backdrop-blur-xl overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-slate-800/50 dark:to-slate-700/50 px-8 py-6 border-b border-white/20 dark:border-slate-700/50">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Notification Settings</h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Configure how and when you receive notifications
                  </p>
                </div>
                <div className="p-8">
                  <NotificationPreferences />
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Users Management */}
          <TabsContent value="users">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="glass rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl backdrop-blur-xl overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800/50 dark:to-slate-700/50 px-8 py-6 border-b border-white/20 dark:border-slate-700/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      Manage system users and their permissions
                    </p>
                  </div>
                  <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
                <div className="p-8">
                  <div className="space-y-4">
                    {settings.users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-6 glass rounded-xl border border-slate-200/60 dark:border-slate-700/60 hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                              {user.firstName[0]}{user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{user.firstName} {user.lastName}</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">{user.email}</div>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                {user.role}
                              </Badge>
                              <Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {user.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" className="glass border-slate-200/60 dark:border-slate-700/60">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="glass border-slate-200/60 dark:border-slate-700/60 hover:border-red-300 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              <div className="glass rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl backdrop-blur-xl overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-slate-800/50 dark:to-slate-700/50 px-8 py-6 border-b border-white/20 dark:border-slate-700/50">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Channels</h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">Connect messaging channels</p>
                </div>
                <div className="p-8">
                  <ChannelSetupForm onComplete={() => { /* no-op; could refetch status */ }} />
                </div>
              </div>

              <div className="glass rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl backdrop-blur-xl overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800/50 dark:to-slate-700/50 px-8 py-6 border-b border-white/20 dark:border-slate-700/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">API Keys</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      Manage API keys for external integrations
                    </p>
                  </div>
                  <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Generate API Key
                  </Button>
                </div>
                <div className="p-8">
                  <div className="space-y-4">
                    {settings.apiKeys.map((apiKey) => (
                      <div key={apiKey.id} className="flex items-center justify-between p-6 glass rounded-xl border border-slate-200/60 dark:border-slate-700/60 hover:shadow-lg transition-all duration-200">
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900 dark:text-white">{apiKey.name}</div>
                          <div className="flex items-center space-x-2 mt-2">
                            <code className="text-sm glass px-3 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60 font-mono">
                              {showApiKeys[apiKey.id] ? apiKey.key : apiKey.key.replace(/\*/g, '•')}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleApiKeyVisibility(apiKey.id)}
                              className="hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              {showApiKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                            Last used: {new Date(apiKey.lastUsed).toLocaleDateString()}
                          </div>
                          <div className="flex items-center space-x-1 mt-2">
                            {apiKey.permissions.map(permission => (
                              <Badge key={permission} variant="outline" className="text-xs">
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" className="glass border-slate-200/60 dark:border-slate-700/60">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="glass border-slate-200/60 dark:border-slate-700/60 hover:border-red-300 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Webhooks Management */}
              <div className="glass rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl backdrop-blur-xl overflow-hidden">
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-slate-800/50 dark:to-slate-700/50 px-8 py-6 border-b border-white/20 dark:border-slate-700/50 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Webhooks</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                      Receive real-time events to your systems (ticket.created, ticket.assigned, ...)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleSendTest} disabled={whTestLoading} className="glass border-slate-200/60 dark:border-slate-700/60">
                      <Send className="h-4 w-4 mr-2" />
                      {whTestLoading ? 'Sending...' : 'Send Test Event'}
                    </Button>
                  </div>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4 md:col-span-1">
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Name</Label>
                        <Input
                          value={whForm.name}
                          onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
                          placeholder="My Integration"
                          className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">URL</Label>
                        <div className="flex gap-2">
                          <Input
                            value={whForm.url}
                            onChange={(e) => setWhForm({ ...whForm, url: e.target.value })}
                            placeholder="https://example.com/webhook"
                            className="flex-1 glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                          />
                          <Globe className="h-5 w-5 text-slate-400 mt-2" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Events (comma separated)</Label>
                        <Input
                          value={whForm.events}
                          onChange={(e) => setWhForm({ ...whForm, events: e.target.value })}
                          placeholder="ticket.created, ticket.assigned"
                          className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Secret (optional)</Label>
                        <Input
                          value={whForm.secret}
                          onChange={(e) => setWhForm({ ...whForm, secret: e.target.value })}
                          placeholder="Used to sign payloads"
                          className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                        />
                      </div>
                      <Button
                        onClick={handleCreateWebhook}
                        disabled={whLoading || !whForm.name || !whForm.url}
                        className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                      >
                        {whLoading ? 'Adding...' : 'Add Endpoint'}
                      </Button>
                    </div>
                    <div className="md:col-span-2">
                      <div className="space-y-4">
                        {(!Array.isArray(webhooks) || webhooks.length === 0) && (
                          <div className="text-sm text-slate-600 dark:text-slate-400 text-center py-8">No webhook endpoints yet.</div>
                        )}
                        {Array.isArray(webhooks) && webhooks.map((wh) => (
                          <div key={wh.id} className="p-6 glass rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between hover:shadow-lg transition-all duration-200">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <LinkIcon className="h-4 w-4 text-slate-400" />
                                <span className="font-semibold text-slate-900 dark:text-white truncate">{wh.name}</span>
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400 truncate mt-1">{wh.url}</div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {wh.events.map((e) => (
                                  <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={wh.isActive ? 'default' : 'secondary'} className="text-xs">
                                {wh.isActive ? 'Active' : 'Disabled'}
                              </Badge>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteWebhook(wh.id)} className="glass border-slate-200/60 dark:border-slate-700/60 hover:border-red-300 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Custom Fields */}
          <TabsContent value="customFields">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="glass rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl backdrop-blur-xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800/50 dark:to-slate-700/50 px-8 py-6 border-b border-white/20 dark:border-slate-700/50">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Custom Fields</h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">Define fields for Tickets, Customers, Leads and Deals with validation and conditional logic</p>
                </div>
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {["ticket", "customer", "lead", "deal"].map((entity) => (
                      <div key={entity as string} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg text-slate-900 dark:text-white capitalize">{entity} Fields</h3>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                            onClick={async () => {
                              await createField({
                                entity: entity as any,
                                name: `field_${Date.now().toString(36)}`,
                                label: 'New Field',
                                type: 'text',
                              });
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />Add Field
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {(fields as any)[entity]?.length ? (fields as any)[entity].map((f: any) => (
                            <div key={f.id} className="p-4 glass rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                                <Input
                                  value={f.label}
                                  onChange={async (e) => { await updateField(f.id, { label: e.target.value }); }}
                                  className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                                />
                                <Input
                                  value={f.name}
                                  onChange={async (e) => { await updateField(f.id, { name: e.target.value }); }}
                                  className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200"
                                />
                                <Select value={f.type} onValueChange={async (v) => { await updateField(f.id, { type: v as any }); }}>
                                  <SelectTrigger className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="glass border-slate-200/60 dark:border-slate-700/60">
                                    {['text', 'textarea', 'number', 'boolean', 'select', 'multiselect', 'date', 'email', 'phone', 'url'].map(t => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm text-slate-700 dark:text-slate-300">Required</Label>
                                  <Switch checked={f.required} onCheckedChange={async (c) => { await updateField(f.id, { required: c }); }} className="data-[state=checked]:bg-blue-600" />
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                  <Button variant="outline" size="sm" onClick={async () => { await removeField(f.id); }} className="glass border-slate-200/60 dark:border-slate-700/60 hover:border-red-300 hover:text-red-600">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              {['select', 'multiselect'].includes(f.type) && (
                                <div className="mt-3">
                                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Options (comma separated value:label)</Label>
                                  <Input
                                    defaultValue={(f.options || []).map((o: { value: string; label: string }) => `${o.value}:${o.label}`).join(', ')}
                                    onBlur={async (e: React.FocusEvent<HTMLInputElement>) => {
                                      const raw = e.target.value;
                                      const options = raw.split(',').map(s => s.trim()).filter(Boolean).map(pair => {
                                        const [value, label] = pair.split(':');
                                        return { value: value?.trim() || '', label: (label || value || '').trim() };
                                      }).filter(o => o.value);
                                      await updateField(f.id, { options });
                                    }}
                                    className="glass border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-200 mt-2"
                                  />
                                </div>
                              )}
                            </div>
                          )) : (
                            <div className="text-sm text-slate-600 dark:text-slate-400 text-center py-8">No fields yet.</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* Dashboard (stub) */}
          <TabsContent value="dashboard">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <DashboardBuilderStub />
            </motion.div>
          </TabsContent>

          {/* Permissions (stub) */}
          <TabsContent value="permissions">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <PermissionsManagerStub />
            </motion.div>
          </TabsContent>

          {/* Billing */}
          <TabsContent value="billing">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="glass rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-xl backdrop-blur-xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800/50 dark:to-slate-700/50 px-8 py-6 border-b border-white/20 dark:border-slate-700/50">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Billing & Subscription</h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-1">
                    Manage your subscription plan and monitor usage
                  </p>
                </div>
                <div className="p-8 space-y-6">
                  {billingError && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
                      <p className="text-sm text-red-600 dark:text-red-400">{billingError}</p>
                    </div>
                  )}

                  {/* Current Subscription */}
                  <div className="premium-card p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Current Plan</h3>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Plan</div>
                        <div className="font-medium capitalize">{currentPlanId || 'none'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Period</div>
                        <div className="font-medium">
                          {billingCurrent?.currentPeriodStart ? new Date(billingCurrent.currentPeriodStart).toLocaleDateString() : ''} → {billingCurrent?.currentPeriodEnd ? new Date(billingCurrent.currentPeriodEnd).toLocaleDateString() : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {billingCurrent && (
                          <Button variant="outline" size="sm" onClick={cancelSubscription} disabled={billingLoading} className="glass border-slate-200/60 dark:border-slate-700/60 hover:border-red-300 hover:text-red-600">
                            Cancel
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={loadBilling} disabled={billingLoading} className="glass border-slate-200/60 dark:border-slate-700/60">
                          Reload
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Usage */}
                  <div className="premium-card p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Usage</h3>
                    {billingUsage ? (
                      <div className="grid md:grid-cols-5 gap-3 text-sm">
                        {(['agents','customers','tickets','storage','apiCalls'] as const).map((k) => (
                          <div key={k} className="analytics-stat">
                            <div className="text-xs text-muted-foreground capitalize">{k}</div>
                            <div className="text-lg font-semibold">{billingUsage.usage?.[k] || 0} / {billingUsage.limits?.[k] === -1 ? '∞' : billingUsage.limits?.[k] || 0}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No usage data available.</div>
                    )}
                  </div>

                  {/* Plans */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Available Plans</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {billingPlans.map((p) => (
                        <div key={p.id} className="premium-card p-6 hover:shadow-2xl transition-all duration-300">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{p.name}</h4>
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{planPrice(p)}</span>
                          </div>
                          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 mb-6">
                            {p.features.map((f) => (
                              <li key={f} className="flex items-center">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-3"></div>
                                {f}
                              </li>
                            ))}
                          </ul>
                          <Button 
                            className="w-full btn-gradient" 
                            disabled={billingLoading || currentPlanId === p.id} 
                            onClick={() => switchPlan(p.id)}
                          >
                            {currentPlanId === p.id ? 'Current Plan' : 'Choose Plan'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function LocalizationInlinePanel() {
  const { load, supportedLocales, supportedCurrencies, locale, currency, setLocale, setCurrency, isLoading } = useLocalizationStore();
  const [loc, setLoc] = useState(locale);
  const [cur, setCur] = useState(currency);
  const [saving, setSaving] = useState(false);
  useEffect(() => { load().catch(() => undefined); }, [load]);
  useEffect(() => { setLoc(locale); }, [locale]);
  useEffect(() => { setCur(currency); }, [currency]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
      <div className="space-y-1">
        <div className="text-sm font-medium">Locale</div>
        <UISelect value={loc} onValueChange={(v) => setLoc(v as any)} disabled={isLoading || saving}>
          <UISelectTrigger><UISelectValue placeholder="Select locale" /></UISelectTrigger>
          <UISelectContent>
            {(Array.isArray(supportedLocales) ? supportedLocales : []).map((l) => (<UISelectItem key={l} value={l}>{l.toUpperCase()}</UISelectItem>))}
          </UISelectContent>
        </UISelect>
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">Currency</div>
        <UISelect value={cur} onValueChange={(v) => setCur(v)} disabled={isLoading || saving}>
          <UISelectTrigger><UISelectValue placeholder="Select currency" /></UISelectTrigger>
          <UISelectContent>
            {(Array.isArray(supportedCurrencies) ? supportedCurrencies : []).map((c) => (<UISelectItem key={c} value={c}>{c}</UISelectItem>))}
          </UISelectContent>
        </UISelect>
      </div>
      <div>
        <Button disabled={saving || isLoading} onClick={async () => { setSaving(true); try { await setLocale(loc as any); await setCurrency(cur); } finally { setSaving(false); } }}>Save</Button>
      </div>
    </div>
  );
}