'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Save, 
  RotateCcw, 
  Loader2, 
  AlertCircle, 
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { SettingsNavigation } from '@/components/settings/settings-navigation';
import { BrandingPreview } from '@/components/settings/branding-preview';
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
import { UserManagementPanel } from '@/components/settings/user-management-panel';
import { useWhiteLabel } from '@/lib/hooks/use-white-label';
import { WalletPanel } from '@/components/settings/wallet-panel';
import { VersionToggle } from '@/components/settings/version-toggle';
import type { TenantWhiteLabelSettings } from '@glavito/shared-types';

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
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 p-8">
        <div className="max-w-[1600px] mx-auto flex gap-8">
          <div className="w-64 shrink-0">
            <Skeleton className="h-8 w-32 mb-6" />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid gap-6">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900">
          <div className="max-w-[1600px] mx-auto flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}
      
      <div className="max-w-[1600px] mx-auto p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-64 shrink-0 space-y-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
                {t('title')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('subtitle')}
              </p>
            </div>
            
            <SettingsNavigation 
              activeSection={activeTab} 
              onNavigate={(section, item) => setActiveTab(item || section)} 
            />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Tabs value={activeTab} className="space-y-6">
                  {/* Company Details Tab */}
                  <TabsContent value="companyDetails" className="space-y-6 mt-0">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight">{t('companyDetails.title', { fallback: 'Company Details' })}</h2>
                        <p className="text-muted-foreground mt-1">{t('companyDetails.subtitle', { fallback: 'Manage your company information and business hours' })}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {hasChanges && (
                          <Button variant="outline" onClick={handleReset} size="sm">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {t('actions.reset')}
                          </Button>
                        )}
                        <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm" className="bg-blue-600 hover:bg-blue-700">
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
                      <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle>{t('companyDetails.companyInfo', { fallback: 'Company Information' })}</CardTitle>
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

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle>{t('companyDetails.contactInfo', { fallback: 'Contact Information' })}</CardTitle>
                            <CardDescription>{t('companyDetails.contactInfoDesc', { fallback: 'Primary contact details' })}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="contact-email">{t('companyDetails.contactEmail', { fallback: 'Contact Email' })}</Label>
                              <Input id="contact-email" type="email" value={localCompany?.contact?.email || ''} onChange={(e) => handleCompanyNested('contact', 'email', e.target.value)} placeholder="support@example.com" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="contact-phone">{t('companyDetails.contactPhone', { fallback: 'Contact Phone' })}</Label>
                              <Input id="contact-phone" type="tel" value={localCompany?.contact?.phone || ''} onChange={(e) => handleCompanyNested('contact', 'phone', e.target.value)} placeholder="+1 (555) 123-4567" />
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle>{t('companyDetails.localization', { fallback: 'Localization' })}</CardTitle>
                            <CardDescription>{t('companyDetails.localizationDesc', { fallback: 'Language and currency' })}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label>{t('companyDetails.language', { fallback: 'Language' })}</Label>
                              <Select value={localLoc?.language || ''} onValueChange={(v) => handleLocChange('language', v)}>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('companyDetails.selectLanguage', { fallback: 'Select language' })} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="en">English</SelectItem>
                                  <SelectItem value="fr">Français</SelectItem>
                                  <SelectItem value="ar">العربية</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>{t('companyDetails.currency', { fallback: 'Currency' })}</Label>
                              <Select value={localLoc?.currency || ''} onValueChange={(v) => handleLocChange('currency', v)}>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('companyDetails.selectCurrency', { fallback: 'Select currency' })} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="usd">USD ($)</SelectItem>
                                  <SelectItem value="eur">EUR (€)</SelectItem>
                                  <SelectItem value="gbp">GBP (£)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle>{t('companyDetails.businessHours.title', { fallback: 'Business Hours' })}</CardTitle>
                          <CardDescription>{t('companyDetails.businessHours.description', { fallback: 'Set your company operating hours' })}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <div className="space-y-0.5">
                              <Label htmlFor="business-hours-enabled" className="text-base">{t('companyDetails.businessHours.enable', { fallback: 'Enable Business Hours' })}</Label>
                              <p className="text-sm text-muted-foreground">{t('companyDetails.businessHours.enableDesc', { fallback: 'Show business hours to customers' })}</p>
                            </div>
                            <Switch
                              id="business-hours-enabled"
                              checked={localCompany?.businessHours?.enabled || false}
                              onCheckedChange={(checked) => handleCompanyNested('businessHours', 'enabled', checked)}
                            />
                          </div>
                          
                          {localCompany?.businessHours?.enabled && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                              <div className="grid gap-3">
                                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((dayName, index) => {
                                  const day = localCompany?.businessHours?.days?.[index] || {
                                    day: dayName as any,
                                    enabled: false,
                                    openTime: '09:00',
                                    closeTime: '17:00',
                                  };
                                  const dayLabel = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                                  
                                  return (
                                    <div key={dayName} className="flex items-center gap-4 p-3 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                      <div className="flex items-center gap-3 min-w-[140px]">
                                        <Switch
                                          checked={day.enabled}
                                          onCheckedChange={(checked) => handleBusinessHoursDayChange(index, 'enabled', checked)}
                                        />
                                        <span className="font-medium text-sm">{dayLabel}</span>
                                      </div>
                                      {day.enabled ? (
                                        <div className="flex items-center gap-3 flex-1">
                                          <Input
                                            type="time"
                                            value={day.openTime || '09:00'}
                                            onChange={(e) => handleBusinessHoursDayChange(index, 'openTime', e.target.value)}
                                            className="w-32 h-9"
                                          />
                                          <span className="text-sm text-muted-foreground">{t('companyDetails.businessHours.to', { fallback: 'to' })}</span>
                                          <Input
                                            type="time"
                                            value={day.closeTime || '17:00'}
                                            onChange={(e) => handleBusinessHoursDayChange(index, 'closeTime', e.target.value)}
                                            className="w-32 h-9"
                                          />
                                        </div>
                                      ) : (
                                        <span className="text-sm text-muted-foreground italic px-2">{t('companyDetails.businessHours.closed', { fallback: 'Closed' })}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Billing Tab */}
                  <TabsContent value="billing" className="space-y-6 mt-0">
                    <BillingPanel />
                  </TabsContent>

                  {/* Wallet Tab */}
                  <TabsContent value="wallet" className="space-y-6 mt-0">
                    <WalletPanel />
                  </TabsContent>

                  {/* User Management Tab */}
                  <TabsContent value="userManagement" className="space-y-6 mt-0">
                    <UserManagementPanel />
                  </TabsContent>

                  {/* Bots Tab */}
                  <TabsContent value="bots" className="space-y-6 mt-0">
                    <BotsPanel />
                  </TabsContent>

                  {/* Team Tab */}
                  <TabsContent value="team" className="space-y-6 mt-0">
                    <TeamsPanel />
                  </TabsContent>

                  {/* Domains Tab */}
                  <TabsContent value="domains" className="space-y-6 mt-0">
                    <BrandAssetsPanel />
                  </TabsContent>

                  {/* Appearance Tab */}
                  <TabsContent value="appearance" className="space-y-6 mt-0">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                      <div className="xl:col-span-2 space-y-6">
                        <Card className="border-0 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                          <CardHeader>
                            <CardTitle>Default version</CardTitle>
                            <CardDescription>
                              Select the default version you want to use. Your selection will be effective the next time you sign in.
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
                        
                        <BrandAssetsPanel />
                        <WhiteLabelTemplatesPanel />
                      </div>
                      
                      <div className="xl:col-span-1">
                        <div className="sticky top-6">
                          <BrandingPreview 
                            colors={{
                              primary: settings?.branding?.primaryColor || '#2563EB',
                              secondary: settings?.branding?.secondaryColor || '#0EA5E9',
                              accent: settings?.branding?.accentColor || '#10B981',
                            }}
                            logoUrl={settings?.branding?.logoUrl}
                            fontFamily={settings?.branding?.fontFamily}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Notifications Tab */}
                  <TabsContent value="notifications" className="space-y-6 mt-0">
                    <NotificationPreferences />
                  </TabsContent>

                  {/* Channels Tab */}
                  <TabsContent value="channels" className="space-y-6 mt-0">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-semibold">{t('channels.title', { fallback: 'Channels' })}</h2>
                        <p className="text-muted-foreground">{t('channels.subtitle', { fallback: 'Manage your communication channels' })}</p>
                      </div>
                    </div>
                    {/* Channel content would go here */}
                  </TabsContent>

                  {/* Email Tab */}
                  <TabsContent value="email" className="space-y-6 mt-0">
                    <Tabs defaultValue="smtp" className="w-full">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-semibold">{t('email.title', { fallback: 'Email Configuration' })}</h2>
                          <p className="text-muted-foreground">{t('email.subtitle', { fallback: 'Manage SMTP, templates, and providers' })}</p>
                        </div>
                      </div>
                      
                      <div className="bg-white dark:bg-slate-900 rounded-xl p-1 mb-6 inline-flex border border-slate-200 dark:border-slate-800">
                        <TabsList className="bg-transparent">
                          <TabsTrigger value="smtp">SMTP Settings</TabsTrigger>
                          <TabsTrigger value="templates">Templates</TabsTrigger>
                          <TabsTrigger value="builder">Builder</TabsTrigger>
                          <TabsTrigger value="providers">Providers</TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="smtp" className="mt-0">
                        <EmailSmtpPanel />
                      </TabsContent>
                      <TabsContent value="templates" className="mt-0">
                        <EmailTemplatesPanel />
                      </TabsContent>
                      <TabsContent value="builder" className="mt-0">
                        <EmailBuilderPanel />
                      </TabsContent>
                      <TabsContent value="providers" className="mt-0">
                        <EmailProvidersPanel />
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  {/* Features Tab */}
                  <TabsContent value="features" className="space-y-6 mt-0">
                    <FeatureTogglesPanel />
                  </TabsContent>

                  {/* GLAVAI Tab */}
                  <TabsContent value="glavai" className="space-y-6 mt-0">
                    {/* GLAVAI content would go here */}
                  </TabsContent>
                </Tabs>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}