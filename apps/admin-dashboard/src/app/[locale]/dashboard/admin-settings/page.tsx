'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Settings, Users, Shield, Bell, Palette, Save, RotateCcw, CreditCard, Building, Mail, MapPin, Globe, Globe2, Loader2, AlertCircle, Clock, Wallet, Sparkles } from 'lucide-react';
import { GlavaiAutoResolveSettings } from '@/components/settings/glavai-auto-resolve-settings';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
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
} from '@/components/ui/tabs';
import { BrandAssetsPanel } from '@/components/settings/brand-assets';
import { EmailSmtpPanel } from '@/components/settings/email-smtp';
import { EmailTemplatesPanel } from '@/components/settings/email-templates';
import { EmailBuilderPanel } from '@/components/settings/email-builder';
import { EmailProvidersPanel } from '@/components/settings/email-providers';
import { FeatureTogglesPanel } from '@/components/settings/feature-toggles';
import { WhiteLabelTemplatesPanel } from '@/components/settings/white-label-templates';
import NotificationPreferences from '@/components/settings/notification-preferences';
import { BillingPanel } from '@/components/settings/billing-panel';
import { BotsPanel } from '@/components/settings/bots-panel';
import { TeamsPanel } from '@/components/settings/teams-panel';
import { WhatsAppSettings } from '@/components/settings/channels/whatsapp-settings';
import { InstagramSettings } from '@/components/settings/channels/instagram-settings';
import { SMSSettings } from '@/components/settings/channels/sms-settings';
import { UserManagementPanel } from '@/components/settings/user-management-panel';
import { useWhiteLabel } from '@/lib/hooks/use-white-label';
import { WalletPanel } from '@/components/settings/wallet-panel';
import { VersionToggle } from '@/components/settings/version-toggle';
import type { TenantWhiteLabelSettings } from '@glavito/shared-types';

// Settings state is sourced from white-label settings

// Removed unused inline panel in favor of bound localization controls

export default function AdminSettingsPage() {
  const t = useTranslations('settings');
  const { toast } = useToast();
  const wl = useWhiteLabel() as {
    settings: TenantWhiteLabelSettings | null;
    loading: boolean;
    error: string | null;
    saveCompany: (payload: Partial<TenantWhiteLabelSettings['company']>) => Promise<void>;
    saveLocalization: (payload: Partial<TenantWhiteLabelSettings['localization']>) => Promise<void>;
    loadSettings: () => Promise<void>;
    saveSettings: (patch: Partial<TenantWhiteLabelSettings>) => Promise<void>;
  };
  const { settings, loading, error, saveCompany, saveLocalization, loadSettings } = wl;
  type Company = NonNullable<TenantWhiteLabelSettings['company']>;
  type Localization = NonNullable<TenantWhiteLabelSettings['localization']>;
  const [localCompany, setLocalCompany] = useState<Company>({});
  const [localLoc, setLocalLoc] = useState<Localization>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('companyDetails');
  const [defaultVersion, setDefaultVersion] = useState('2.0');
  const prevSettingsRef = useRef<string>('');
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const tab = sp.get('tab');
      if (tab) setActiveTab(tab);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    // hydrate locals from store without causing loops
    const comp: Company = settings?.company || {};
    const loc: Localization = settings?.localization || {};
    const nextKey = JSON.stringify({ company: comp, localization: loc });
    if (prevSettingsRef.current !== nextKey) {
      prevSettingsRef.current = nextKey;
      setLocalCompany(comp);
      setLocalLoc(loc);
    }
  }, [settings]);

  const handleCompanyChange = (field: keyof Company, value: string) => {
    setLocalCompany(prev => ({ ...(prev || {}), [field]: value }));
    setHasChanges(true);
  };
  const handleCompanyNested = (ns: 'contact' | 'address' | 'businessHours', field: string, value: string | boolean) => {
    const nextNs = { ...((localCompany as Company)[ns] || {}) } as NonNullable<Company[typeof ns]>;
    (nextNs as Record<string, string | boolean>)[field] = value;
    setLocalCompany(prev => ({ ...(prev || {}), [ns]: nextNs } as Company));
    setHasChanges(true);
  };
  
  const handleBusinessHoursDayChange = (dayIndex: number, field: 'enabled' | 'openTime' | 'closeTime', value: string | boolean) => {
    const businessHours = localCompany?.businessHours || { enabled: false, days: [] };
    const days = [...(businessHours.days || [])];
    const dayNames: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'> = 
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    // Ensure we have all 7 days
    while (days.length < 7) {
      days.push({
        day: dayNames[days.length],
        enabled: false,
        openTime: '09:00',
        closeTime: '17:00',
      });
    }
    
    days[dayIndex] = { ...days[dayIndex], [field]: value };
    setLocalCompany(prev => ({
      ...(prev || {}),
      businessHours: { ...businessHours, days },
    } as Company));
    setHasChanges(true);
  };
  const handleLocChange = (field: keyof Localization, value: string) => {
    setLocalLoc(prev => ({ ...(prev || {}), [field]: value }));
    setHasChanges(true);
  };

  const [saving, setSaving] = useState(false);
  
  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      await Promise.all([
        saveCompany(localCompany),
        saveLocalization(localLoc),
        // Branding is now handled in BrandAssetsPanel
      ]);
      setHasChanges(false);
      await loadSettings?.();
      toast({
        title: t('actions.saveSuccess') || 'Settings saved',
        description: t('actions.saveSuccessDesc') || 'Your settings have been saved successfully',
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast({
        title: t('actions.saveError') || 'Failed to save',
        description: errorMessage || t('actions.saveErrorDesc') || 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (): void => {
    setLocalCompany(settings?.company || {});
    setLocalLoc(settings?.localization || {});
    setHasChanges(false);
  };

  if (loading && !settings) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          <div className="w-64 border-r bg-card/50 backdrop-blur-sm p-6">
            <Skeleton className="h-8 w-48 mb-8" />
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
          <div className="flex-1 p-8">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-96 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 border-r bg-slate-900 text-white">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-slate-900" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">{t('title')}</h1>
                <p className="text-sm text-slate-400">{t('subtitle')}</p>
              </div>
            </div>
            
            <nav className="space-y-1">
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                YOUR PREFERENCES
              </div>
              <button
                onClick={() => setActiveTab('companyDetails')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === 'companyDetails' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Building className="w-4 h-4" />
                {t('tabs.companyDetails', { fallback: 'Company Details' })}
              </button>
              
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">
                COMPANY SETTINGS
              </div>
              <button
                onClick={() => setActiveTab('billing')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === 'billing' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                {t('tabs.billing')}
              </button>
              
              <button
                onClick={() => setActiveTab('bots')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === 'bots' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Shield className="w-4 h-4" />
                {t('tabs.bots', { fallback: 'Bots' })}
              </button>

              <button
                onClick={() => setActiveTab('wallet')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === 'wallet' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Wallet className="w-4 h-4" />
                {t('tabs.wallet', { fallback: 'Wallet' })}
              </button>

              <button
                onClick={() => setActiveTab('userManagement')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === 'userManagement' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                {t('tabs.userManagement', { fallback: 'User Management' })}
              </button>
              
              <button
                onClick={() => setActiveTab('team')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === 'team' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                {t('tabs.team')}
              </button>
              
              <button
                onClick={() => setActiveTab('domains')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === 'domains' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Globe2 className="w-4 h-4" />
                {t('tabs.domains')}
              </button>

              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">
                APPEARANCE & CHANNELS
              </div>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === 'appearance' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Palette className="w-4 h-4" />
                {t('tabs.appearance')}
              </button>
              
              <button
                onClick={() => setActiveTab('channels')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === 'channels' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Mail className="w-4 h-4" />
                {t('tabs.channels', { fallback: 'Channels' })}
              </button>
              
              <button
                onClick={() => setActiveTab('email')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === 'email' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Mail className="w-4 h-4" />
                {t('tabs.email', { fallback: 'Email' })}
              </button>
              
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">
                SYSTEM
              </div>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === 'notifications' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Bell className="w-4 h-4" />
                {t('tabs.notifications')}
              </button>
              
              <button
                onClick={() => setActiveTab('features')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === 'features' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Settings className="w-4 h-4" />
                {t('tabs.features', { fallback: 'Features' })}
              </button>
              <button
                onClick={() => setActiveTab('glavai')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                  activeTab === 'glavai' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                GLAVAI
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              {/* Company Details Tab */}
              <TabsContent value="companyDetails" className="space-y-6 mt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-semibold">{t('companyDetails.title', { fallback: 'Company Details' })}</h2>
                    <p className="text-muted-foreground mt-1">{t('companyDetails.subtitle', { fallback: 'Manage your company information and business hours' })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasChanges && (
                      <Button variant="outline" onClick={handleReset}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        {t('actions.reset')}
                      </Button>
                    )}
                    <Button onClick={handleSave} disabled={!hasChanges || saving}>
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('actions.saving') || 'Saving...'}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {t('actions.save')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-6">
                  {/* Company Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        {t('companyDetails.companyInfo', { fallback: 'Company Information' })}
                      </CardTitle>
                      <CardDescription>{t('companyDetails.companyInfoDesc', { fallback: 'Basic information about your company' })}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="company-name">{t('companyDetails.companyName', { fallback: 'Company Name' })}</Label>
                          <Input id="company-name" value={localCompany?.name || ''} onChange={(e) => handleCompanyChange('name', e.target.value)} placeholder={t('companyDetails.companyNamePlaceholder', { fallback: 'Enter company name' })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="website">{t('companyDetails.website', { fallback: 'Website' })}</Label>
                          <Input id="website" type="url" value={localCompany?.website || ''} onChange={(e) => handleCompanyChange('website', e.target.value)} placeholder="https://example.com" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="industry">{t('companyDetails.industry', { fallback: 'Industry' })}</Label>
                          <Select value={localCompany?.industry || ''} onValueChange={(v) => handleCompanyChange('industry', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('companyDetails.selectIndustry', { fallback: 'Select industry' })} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="technology">{t('companyDetails.industries.technology', { fallback: 'Technology' })}</SelectItem>
                              <SelectItem value="healthcare">{t('companyDetails.industries.healthcare', { fallback: 'Healthcare' })}</SelectItem>
                              <SelectItem value="finance">{t('companyDetails.industries.finance', { fallback: 'Finance' })}</SelectItem>
                              <SelectItem value="ecommerce">{t('companyDetails.industries.ecommerce', { fallback: 'E-commerce' })}</SelectItem>
                              <SelectItem value="other">{t('companyDetails.industries.other', { fallback: 'Other' })}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-size">{t('companyDetails.companySize', { fallback: 'Company Size' })}</Label>
                          <Select value={localCompany?.size || ''} onValueChange={(v) => handleCompanyChange('size', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('companyDetails.selectCompanySize', { fallback: 'Select company size' })} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1-10">{t('companyDetails.companySizes.1-10', { fallback: '1-10' })}</SelectItem>
                              <SelectItem value="11-50">{t('companyDetails.companySizes.11-50', { fallback: '11-50' })}</SelectItem>
                              <SelectItem value="51-200">{t('companyDetails.companySizes.51-200', { fallback: '51-200' })}</SelectItem>
                              <SelectItem value="201-500">{t('companyDetails.companySizes.201-500', { fallback: '201-500' })}</SelectItem>
                              <SelectItem value="500+">{t('companyDetails.companySizes.500+', { fallback: '500+' })}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contact Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        {t('companyDetails.contactInfo', { fallback: 'Contact Information' })}
                      </CardTitle>
                      <CardDescription>{t('companyDetails.contactInfoDesc', { fallback: 'Primary contact details' })}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contact-email">{t('companyDetails.contactEmail', { fallback: 'Contact Email' })}</Label>
                          <Input id="contact-email" type="email" value={localCompany?.contact?.email || ''} onChange={(e) => handleCompanyNested('contact', 'email', e.target.value)} placeholder="support@example.com" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contact-phone">{t('companyDetails.contactPhone', { fallback: 'Contact Phone' })}</Label>
                          <Input id="contact-phone" type="tel" value={localCompany?.contact?.phone || ''} onChange={(e) => handleCompanyNested('contact', 'phone', e.target.value)} placeholder="+1 (555) 123-4567" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Address Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        {t('companyDetails.address', { fallback: 'Address' })}
                      </CardTitle>
                      <CardDescription>{t('companyDetails.addressDesc', { fallback: 'Company physical address' })}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="street">{t('companyDetails.street', { fallback: 'Street' })}</Label>
                        <Input id="street" value={localCompany?.address?.street || ''} onChange={(e) => handleCompanyNested('address', 'street', e.target.value)} placeholder="123 Main Street" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">{t('companyDetails.city', { fallback: 'City' })}</Label>
                          <Input id="city" value={localCompany?.address?.city || ''} onChange={(e) => handleCompanyNested('address', 'city', e.target.value)} placeholder="San Francisco" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">{t('companyDetails.state', { fallback: 'State' })}</Label>
                          <Input id="state" value={localCompany?.address?.state || ''} onChange={(e) => handleCompanyNested('address', 'state', e.target.value)} placeholder="CA" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="postal-code">{t('companyDetails.postalCode', { fallback: 'Postal Code' })}</Label>
                          <Input id="postal-code" value={localCompany?.address?.postalCode || ''} onChange={(e) => handleCompanyNested('address', 'postalCode', e.target.value)} placeholder="94105" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">{t('companyDetails.country', { fallback: 'Country' })}</Label>
                        <Select value={localCompany?.address?.country || ''} onValueChange={(v) => handleCompanyNested('address', 'country', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('companyDetails.selectCountry', { fallback: 'Select country' })} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="us">United States</SelectItem>
                            <SelectItem value="ca">Canada</SelectItem>
                            <SelectItem value="uk">United Kingdom</SelectItem>
                            <SelectItem value="de">Germany</SelectItem>
                            <SelectItem value="fr">France</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Business Hours */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        {t('companyDetails.businessHours.title', { fallback: 'Business Hours' })}
                      </CardTitle>
                      <CardDescription>{t('companyDetails.businessHours.description', { fallback: 'Set your company operating hours for each day of the week' })}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="business-hours-enabled">{t('companyDetails.businessHours.enable', { fallback: 'Enable Business Hours' })}</Label>
                          <p className="text-sm text-muted-foreground">{t('companyDetails.businessHours.enableDesc', { fallback: 'Show business hours to customers' })}</p>
                        </div>
                        <Switch
                          id="business-hours-enabled"
                          checked={localCompany?.businessHours?.enabled || false}
                          onCheckedChange={(checked) => handleCompanyNested('businessHours', 'enabled', checked)}
                        />
                      </div>
                      
                      {localCompany?.businessHours?.enabled && (
                        <>
                          <div className="space-y-2">
                            <Label>{t('companyDetails.businessHours.timezone', { fallback: 'Timezone' })}</Label>
                            <Input
                              placeholder="America/New_York"
                              value={localCompany?.businessHours?.timezone || localLoc?.timezone || ''}
                              onChange={(e) => handleCompanyNested('businessHours', 'timezone', e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-3">
                            <Label>{t('companyDetails.businessHours.days', { fallback: 'Operating Hours' })}</Label>
                            <div className="space-y-2">
                              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((dayName, index) => {
                                const day = localCompany?.businessHours?.days?.[index] || {
                                  day: dayName as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
                                  enabled: false,
                                  openTime: '09:00',
                                  closeTime: '17:00',
                                };
                                const dayLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                                
                                return (
                                  <div key={dayName} className="flex items-center gap-4 p-3 border rounded-lg">
                                    <div className="flex items-center gap-2 min-w-[120px]">
                                      <Switch
                                        checked={day.enabled}
                                        onCheckedChange={(checked) => handleBusinessHoursDayChange(index, 'enabled', checked)}
                                      />
                                      <Label className="font-medium">{dayLabel}</Label>
                                    </div>
                                    {day.enabled ? (
                                      <div className="flex items-center gap-2 flex-1">
                                        <Input
                                          type="time"
                                          value={day.openTime || '09:00'}
                                          onChange={(e) => handleBusinessHoursDayChange(index, 'openTime', e.target.value)}
                                          className="w-32"
                                        />
                                        <span className="text-muted-foreground">{t('companyDetails.businessHours.to', { fallback: 'to' })}</span>
                                        <Input
                                          type="time"
                                          value={day.closeTime || '17:00'}
                                          onChange={(e) => handleBusinessHoursDayChange(index, 'closeTime', e.target.value)}
                                          className="w-32"
                                        />
                                      </div>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">{t('companyDetails.businessHours.closed', { fallback: 'Closed' })}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Localization */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        {t('companyDetails.localization', { fallback: 'Localization' })}
                      </CardTitle>
                      <CardDescription>{t('companyDetails.localizationDesc', { fallback: 'Configure language, currency, and timezone settings' })}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{t('companyDetails.localization', { fallback: 'Language' })}</div>
                          <Select value={localLoc?.language || ''} onValueChange={(v) => handleLocChange('language', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('companyDetails.selectLanguage', { fallback: 'Select language' })} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en">EN</SelectItem>
                              <SelectItem value="fr">FR</SelectItem>
                              <SelectItem value="ar">AR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{t('companyDetails.currency', { fallback: 'Currency' })}</div>
                          <Select value={localLoc?.currency || ''} onValueChange={(v) => handleLocChange('currency', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('companyDetails.selectCurrency', { fallback: 'Select currency' })} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="usd">USD</SelectItem>
                              <SelectItem value="eur">EUR</SelectItem>
                              <SelectItem value="gbp">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{t('companyDetails.timezone', { fallback: 'Timezone' })}</div>
                          <Input placeholder="America/New_York" value={localLoc?.timezone || ''} onChange={(e) => handleLocChange('timezone', e.target.value)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">{t('billing.title')}</h2>
                    <p className="text-muted-foreground">{t('billing.subtitle')}</p>
                  </div>
                </div>

                <BillingPanel />
              </TabsContent>

              {/* Wallet Tab */}
              <TabsContent value="wallet" className="space-y-6">
                <WalletPanel />
              </TabsContent>

              {/* User Management Tab */}
              <TabsContent value="userManagement" className="space-y-6">
                <UserManagementPanel />
              </TabsContent>

              {/* Team Tab */}
              <TabsContent value="bots" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">{t('bots.title', { fallback: 'AI Bots' })}</h2>
                    <p className="text-muted-foreground">{t('bots.subtitle', { fallback: 'Configure autopilot agents and bind them to channels' })}</p>
                  </div>
                </div>
                <BotsPanel />
              </TabsContent>

              {/* Team Tab */}
              <TabsContent value="team" className="space-y-6">
                <TeamsPanel />
              </TabsContent>

              {/* Domains Tab */}
              <TabsContent value="domains" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">{t('domains.title')}</h2>
                    <p className="text-muted-foreground">{t('domains.subtitle')}</p>
                  </div>
                </div>
                <BrandAssetsPanel />
              </TabsContent>

              {/* Appearance Tab */}
              <TabsContent value="appearance" className="space-y-6 mt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-semibold">{t('appearance.title')}</h2>
                    <p className="text-muted-foreground mt-1">{t('appearance.subtitle')}</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  {/* Version Toggle */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Default version</CardTitle>
                      <CardDescription>
                        Select the default version you want to use. Your selection will be effective the next time you sign in, and you can switch versions at any time.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <VersionToggle
                        value={defaultVersion}
                        onValueChange={setDefaultVersion}
                        options={[
                          {
                            value: '2.0',
                            title: 'Glavito 2.0',
                            features: [
                              'Enhanced Inbox experience',
                              'Newly structured Contacts page',
                              'Improved step-by-step Broadcasts',
                              'New Flow Builder feature for automation',
                            ],
                          },
                          {
                            value: '1.0',
                            title: 'Glavito 1.0',
                            features: [
                              'Classic layout with all features',
                            ],
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Consolidated Brand Assets & Branding */}
                  <BrandAssetsPanel />
                  {/* White-label Templates */}
                  <WhiteLabelTemplatesPanel />
                </div>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6 mt-0">
                <NotificationPreferences />
              </TabsContent>

              {/* Channels Tab */}
              <TabsContent value="channels" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">{t('channels.title', { fallback: 'Channels' })}</h2>
                    <p className="text-muted-foreground">{t('channels.subtitle', { fallback: 'Manage your communication channels' })}</p>
                  </div>
                </div>

                <Tabs defaultValue="whatsapp" className="w-full">
                  <div className="border-b">
                    <div className="flex gap-4 px-1">
                      <button
                        onClick={(e) => {
                          const tabs = e.currentTarget.closest('[role="tablist"]');
                          tabs?.querySelectorAll('button').forEach(b => b.setAttribute('data-state', 'inactive'));
                          e.currentTarget.setAttribute('data-state', 'active');
                        }}
                        data-state="active"
                        className="px-4 py-2 text-sm font-medium border-b-2 border-primary data-[state=active]:border-primary data-[state=inactive]:border-transparent"
                      >
                        WhatsApp
                      </button>
                      <button
                        onClick={(e) => {
                          const tabs = e.currentTarget.closest('[role="tablist"]');
                          tabs?.querySelectorAll('button').forEach(b => b.setAttribute('data-state', 'inactive'));
                          e.currentTarget.setAttribute('data-state', 'active');
                        }}
                        data-state="inactive"
                        className="px-4 py-2 text-sm font-medium border-b-2 data-[state=active]:border-primary data-[state=inactive]:border-transparent"
                      >
                        Instagram
                      </button>
                      <button
                        onClick={(e) => {
                          const tabs = e.currentTarget.closest('[role="tablist"]');
                          tabs?.querySelectorAll('button').forEach(b => b.setAttribute('data-state', 'inactive'));
                          e.currentTarget.setAttribute('data-state', 'active');
                        }}
                        data-state="inactive"
                        className="px-4 py-2 text-sm font-medium border-b-2 data-[state=active]:border-primary data-[state=inactive]:border-transparent"
                      >
                        SMS
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div data-state="active" className="data-[state=inactive]:hidden">
                      <WhatsAppSettings />
                    </div>
                    <div data-state="inactive" className="data-[state=inactive]:hidden">
                      <InstagramSettings />
                    </div>
                    <div data-state="inactive" className="data-[state=inactive]:hidden">
                      <SMSSettings />
                    </div>
                  </div>
                </Tabs>
              </TabsContent>

              {/* Email Tab */}
              <TabsContent value="email" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">{t('email.title', { fallback: 'Email' })}</h2>
                    <p className="text-muted-foreground">{t('email.subtitle', { fallback: 'Configure email settings' })}</p>
                  </div>
                </div>

                <div className="grid gap-6">
                  {/* Provider configurations */}
                  <EmailProvidersPanel />
                  {/* SMTP Settings */}
                  <EmailSmtpPanel />
                  {/* Email Templates */}
                  <EmailTemplatesPanel />
                  {/* Email Builder */}
                  <EmailBuilderPanel />
                </div>
              </TabsContent>

              {/* Features Tab */}
              <TabsContent value="features" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">{t('features.title', { fallback: 'Features' })}</h2>
                    <p className="text-muted-foreground">{t('features.subtitle', { fallback: 'Enable or disable features' })}</p>
                  </div>
                </div>
                <div className="grid gap-6">
                  <FeatureTogglesPanel />
                </div>
              </TabsContent>

              {/* GLAVAI Tab */}
              <TabsContent value="glavai" className="space-y-6 mt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">GLAVAI Settings</h2>
                    <p className="text-muted-foreground">
                      Configure AI Agent, Copilot, and Insights features
                    </p>
                  </div>
                </div>
                <GlavaiAutoResolveSettings />
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}