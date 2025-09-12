/**
 * Portal Customization Step Component
 * Comprehensive portal customization interface with real-time preview
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Palette,
  Eye,
  Globe,
  Settings,
  Upload,
  Download,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Smartphone,
  Monitor,
  Tablet,
} from 'lucide-react';

interface PortalCustomizationStepProps {
  onNext: () => void;
  onPrevious: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
}

interface PortalConfig {
  name: string;
  description: string;
  subdomain: string;
  customDomain?: string;
  branding: {
    logo?: { url: string; alt: string };
    favicon?: { url: string };
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      surface: string;
      text: {
        primary: string;
        secondary: string;
        muted: string;
      };
    };
  };
  features: {
    ticketSubmission: { enabled: boolean };
    knowledgeBase: { enabled: boolean };
    liveChat: { enabled: boolean };
  };
  customization: {
    layout: {
      headerStyle: 'minimal' | 'standard' | 'prominent';
      navigationStyle: 'horizontal' | 'vertical';
      containerWidth: 'narrow' | 'standard' | 'wide';
    };
  };
}

export function PortalCustomizationStep({
  onNext,
  onPrevious,
  onSkip,
  isLoading = false,
}: PortalCustomizationStepProps) {
  const t = useTranslations('onboarding.portal');
  const [activeTab, setActiveTab] = useState('basic');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  const [portalConfig, setPortalConfig] = useState<PortalConfig>({
    name: '',
    description: '',
    subdomain: '',
    branding: {
      colors: {
        primary: '#3B82F6',
        secondary: '#64748B',
        accent: '#F59E0B',
        background: '#FFFFFF',
        surface: '#F8FAFC',
        text: {
          primary: '#1E293B',
          secondary: '#475569',
          muted: '#94A3B8',
        },
      },
    },
    features: {
      ticketSubmission: { enabled: true },
      knowledgeBase: { enabled: true },
      liveChat: { enabled: false },
    },
    customization: {
      layout: {
        headerStyle: 'standard',
        navigationStyle: 'horizontal',
        containerWidth: 'standard',
      },
    },
  });

  // Auto-save functionality
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      if (portalConfig.name && portalConfig.subdomain) {
        handleAutoSave();
      }
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [portalConfig]);

  const handleAutoSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      // API call to save portal config
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [portalConfig]);

  const updateConfig = (path: string, value: any) => {
    setPortalConfig(prev => {
      const keys = path.split('.');
      const newConfig = { ...prev };
      let current: any = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const generateSubdomain = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    updateConfig('name', name);
    if (!portalConfig.subdomain || portalConfig.subdomain === generateSubdomain(portalConfig.name)) {
      updateConfig('subdomain', generateSubdomain(name));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('description')}
        </p>
      </div>

      {/* Save Status */}
      <AnimatePresence>
        {saveStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-center"
          >
            <Badge
              variant={saveStatus === 'saved' ? 'default' : saveStatus === 'error' ? 'destructive' : 'secondary'}
              className="flex items-center gap-2"
            >
              {saveStatus === 'saving' && <RefreshCw className="h-3 w-3 animate-spin" />}
              {saveStatus === 'saved' && <CheckCircle className="h-3 w-3" />}
              {saveStatus === 'error' && <AlertCircle className="h-3 w-3" />}
              {saveStatus === 'saving' && t('saving')}
              {saveStatus === 'saved' && t('saved')}
              {saveStatus === 'error' && t('saveError')}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {t('configuration')}
                  </CardTitle>
                  <CardDescription>{t('configurationDescription')}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreviewOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {t('preview')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">{t('tabs.basic')}</TabsTrigger>
                  <TabsTrigger value="branding">{t('tabs.branding')}</TabsTrigger>
                  <TabsTrigger value="features">{t('tabs.features')}</TabsTrigger>
                  <TabsTrigger value="layout">{t('tabs.layout')}</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="portal-name">{t('fields.name')}</Label>
                      <Input
                        id="portal-name"
                        value={portalConfig.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder={t('placeholders.name')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subdomain">{t('fields.subdomain')}</Label>
                      <div className="flex">
                        <Input
                          id="subdomain"
                          value={portalConfig.subdomain}
                          onChange={(e) => updateConfig('subdomain', e.target.value)}
                          placeholder={t('placeholders.subdomain')}
                          className="rounded-r-none"
                        />
                        <div className="flex items-center px-3 bg-muted border border-l-0 rounded-r-md text-sm text-muted-foreground">
                          .support.com
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{t('fields.description')}</Label>
                    <Textarea
                      id="description"
                      value={portalConfig.description}
                      onChange={(e) => updateConfig('description', e.target.value)}
                      placeholder={t('placeholders.description')}
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="branding" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(portalConfig.branding.colors).map(([key, value]) => {
                      if (typeof value === 'object') return null;
                      return (
                        <div key={key} className="space-y-2">
                          <Label className="capitalize">{key}</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={value}
                              onChange={(e) => updateConfig(`branding.colors.${key}`, e.target.value)}
                              className="w-12 h-10 p-1 border rounded"
                            />
                            <Input
                              value={value}
                              onChange={(e) => updateConfig(`branding.colors.${key}`, e.target.value)}
                              placeholder="#000000"
                              className="font-mono text-sm"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="features" className="space-y-4">
                  {Object.entries(portalConfig.features).map(([key, feature]) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
                        <p className="text-sm text-muted-foreground">
                          {t(`features.${key}.description`)}
                        </p>
                      </div>
                      <Switch
                        checked={feature.enabled}
                        onCheckedChange={(checked) => updateConfig(`features.${key}.enabled`, checked)}
                      />
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="layout" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('fields.headerStyle')}</Label>
                      <Select
                        value={portalConfig.customization.layout.headerStyle}
                        onValueChange={(value) => updateConfig('customization.layout.headerStyle', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimal">{t('headerStyles.minimal')}</SelectItem>
                          <SelectItem value="standard">{t('headerStyles.standard')}</SelectItem>
                          <SelectItem value="prominent">{t('headerStyles.prominent')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('fields.navigationStyle')}</Label>
                      <Select
                        value={portalConfig.customization.layout.navigationStyle}
                        onValueChange={(value) => updateConfig('customization.layout.navigationStyle', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="horizontal">{t('navigationStyles.horizontal')}</SelectItem>
                          <SelectItem value="vertical">{t('navigationStyles.vertical')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {t('livePreview')}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant={previewDevice === 'desktop' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewDevice('desktop')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewDevice === 'tablet' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewDevice('tablet')}
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewDevice === 'mobile' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPreviewDevice('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className={`border rounded-lg overflow-hidden transition-all duration-300 ${
                  previewDevice === 'desktop' ? 'aspect-video' :
                  previewDevice === 'tablet' ? 'aspect-[4/3] max-w-md mx-auto' :
                  'aspect-[9/16] max-w-xs mx-auto'
                }`}
                style={{
                  backgroundColor: portalConfig.branding.colors.background,
                  color: portalConfig.branding.colors.text.primary,
                }}
              >
                <div 
                  className="h-12 flex items-center px-4 border-b"
                  style={{ backgroundColor: portalConfig.branding.colors.primary }}
                >
                  <div className="text-white font-medium">
                    {portalConfig.name || t('previewPortalName')}
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">
                      {t('previewWelcome')}
                    </h3>
                    <p className="text-sm opacity-75">
                      {portalConfig.description || t('previewDescription')}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {portalConfig.features.ticketSubmission.enabled && (
                      <div 
                        className="p-3 rounded border text-center text-sm"
                        style={{ backgroundColor: portalConfig.branding.colors.surface }}
                      >
                        {t('previewSubmitTicket')}
                      </div>
                    )}
                    {portalConfig.features.knowledgeBase.enabled && (
                      <div 
                        className="p-3 rounded border text-center text-sm"
                        style={{ backgroundColor: portalConfig.branding.colors.surface }}
                      >
                        {t('previewKnowledgeBase')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" />
                {t('uploadLogo')}
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Palette className="h-4 w-4 mr-2" />
                {t('colorPresets')}
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Globe className="h-4 w-4 mr-2" />
                {t('customDomain')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={onPrevious} disabled={isLoading}>
          {t('previous')}
        </Button>
        <div className="flex items-center gap-2">
          {onSkip && (
            <Button variant="ghost" onClick={onSkip} disabled={isLoading}>
              {t('skip')}
            </Button>
          )}
          <Button 
            onClick={onNext} 
            disabled={isLoading || !portalConfig.name || !portalConfig.subdomain}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t('creating')}
              </>
            ) : (
              t('next')
            )}
          </Button>
        </div>
      </div>

      {/* Full Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t('fullPreview')}</DialogTitle>
            <DialogDescription>
              {t('fullPreviewDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 border rounded-lg overflow-hidden">
            <iframe
              src={`/portal-preview?config=${encodeURIComponent(JSON.stringify(portalConfig))}`}
              className="w-full h-full"
              title="Portal Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}