"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWhiteLabel } from '@/lib/hooks/use-white-label';
import type { BrandAsset, BrandAssetType } from '@/lib/api/white-label-client';
import type { WhiteLabelTheme, TenantWhiteLabelSettings } from '@glavito/shared-types';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { Palette, Upload, Download, Eye, Loader2 } from 'lucide-react';
import { exportThemeCSS } from '@/lib/design-tokens';

const ASSET_TYPES: Array<{ key: BrandAssetType; label: string }> = [
  { key: 'logo', label: 'Logo' },
  { key: 'favicon', label: 'Favicon' },
  { key: 'email_header', label: 'Email Header' },
  { key: 'mobile_icon', label: 'Mobile Icon' },
];

const POPULAR_FONTS = [
  'Inter, sans-serif',
  'Roboto, sans-serif',
  'Open Sans, sans-serif',
  'Lato, sans-serif',
  'Montserrat, sans-serif',
  'Poppins, sans-serif',
  'Nunito, sans-serif',
  'Raleway, sans-serif',
];

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div
          className="w-12 h-12 rounded-lg border shadow-sm cursor-pointer transition-opacity hover:opacity-80"
          style={{ backgroundColor: value }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = value;
            input.onchange = (e) => onChange((e.target as HTMLInputElement).value);
            input.click();
          }}
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export function BrandAssetsPanel() {
  const t = useTranslations('settings.brandAssets');
  const { toast } = useToast();
  const { assets, loadAssets, uploadAsset, removeAsset, activateAsset, theme, loadTheme, settings, saveSettings } = useWhiteLabel() as unknown as {
    assets: BrandAsset[];
    loadAssets: () => Promise<void>;
    uploadAsset: (file: File, type: BrandAssetType) => Promise<BrandAsset | null>;
    removeAsset: (id: string) => Promise<void>;
    activateAsset: (id: string) => Promise<BrandAsset | null>;
    theme: WhiteLabelTheme | null;
    loadTheme: () => Promise<void>;
    settings: TenantWhiteLabelSettings | null;
    saveSettings: (patch: Partial<TenantWhiteLabelSettings>) => Promise<void>;
  };
  const [type, setType] = useState<BrandAssetType>('logo');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  
  // Local branding state
  const [localColors, setLocalColors] = useState({
    primaryColor: settings?.branding?.primaryColor || '#3B82F6',
    secondaryColor: settings?.branding?.secondaryColor || '#0EA5E9',
    accentColor: settings?.branding?.accentColor || '#8B5CF6',
  });
  const [localFont, setLocalFont] = useState(
    settings?.branding?.fontFamily || 'Inter, sans-serif'
  );
  const [hasBrandingChanges, setHasBrandingChanges] = useState(false);

  useEffect(() => {
    loadAssets().catch(() => {});
    loadTheme().catch(() => {});
  }, [loadAssets, loadTheme]);

  useEffect(() => {
    if (settings?.branding) {
      setLocalColors({
        primaryColor: settings.branding.primaryColor || '#3B82F6',
        secondaryColor: settings.branding.secondaryColor || '#0EA5E9',
        accentColor: settings.branding.accentColor || '#8B5CF6',
      });
      setLocalFont(settings.branding.fontFamily || 'Inter, sans-serif');
    }
  }, [settings]);

  const assetList = useMemo<BrandAsset[]>(() => (Array.isArray(assets) ? assets : []), [assets]);

  const activeByType = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    assetList.forEach((a) => { if (a.isActive) map[a.type] = a.id; });
    return map;
  }, [assetList]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadAsset(file, type);
      await loadTheme();
      toast({
        title: t('messages.uploaded') || 'Uploaded',
        description: t(`assetTypes.${type}`) || type,
      });
    } catch (err: unknown) {
      toast({
        title: 'Failed to upload',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleColorChange = (key: string, value: string) => {
    setLocalColors((prev) => ({ ...prev, [key]: value }));
    setHasBrandingChanges(true);
  };

  const handleFontChange = (font: string) => {
    setLocalFont(font);
    setHasBrandingChanges(true);
  };

  const handleSaveBranding = async () => {
    setSaving(true);
    try {
      await saveSettings({
        branding: {
          ...settings?.branding,
          ...localColors,
          fontFamily: localFont,
        },
      });
      setHasBrandingChanges(false);
      await loadTheme();
      toast({
        title: 'Branding saved',
        description: 'Your brand settings have been saved successfully.',
      });
    } catch (err: unknown) {
      toast({
        title: 'Failed to save',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportTheme = () => {
    const themeData = {
      colors: {
        primary: localColors.primaryColor,
        secondary: localColors.secondaryColor,
        accent: localColors.accentColor,
      },
      typography: {
        fontFamily: localFont,
      },
    };

    const css = exportThemeCSS(themeData);
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme.css';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Theme exported',
      description: 'Your theme CSS has been downloaded.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Brand Colors & Typography */}
      <Card className="border-slate-200/60 dark:border-slate-700/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Brand Colors & Typography
              </CardTitle>
              <CardDescription>Customize your brand colors and fonts</CardDescription>
            </div>
            <div className="flex gap-2">
              {hasBrandingChanges && (
                <Button variant="outline" size="sm" onClick={() => {
                  setLocalColors({
                    primaryColor: settings?.branding?.primaryColor || '#3B82F6',
                    secondaryColor: settings?.branding?.secondaryColor || '#0EA5E9',
                    accentColor: settings?.branding?.accentColor || '#8B5CF6',
                  });
                  setLocalFont(settings?.branding?.fontFamily || 'Inter, sans-serif');
                  setHasBrandingChanges(false);
                }}>
                  Reset
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExportTheme}>
                <Download className="w-4 h-4 mr-2" />
                Export Theme
              </Button>
              <Button size="sm" onClick={handleSaveBranding} disabled={!hasBrandingChanges || saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ColorPicker
              label="Primary Color"
              value={localColors.primaryColor}
              onChange={(v) => handleColorChange('primaryColor', v)}
            />
            <ColorPicker
              label="Secondary Color"
              value={localColors.secondaryColor}
              onChange={(v) => handleColorChange('secondaryColor', v)}
            />
            <ColorPicker
              label="Accent Color"
              value={localColors.accentColor}
              onChange={(v) => handleColorChange('accentColor', v)}
            />
          </div>

          <div className="space-y-2">
            <Label>Font Family</Label>
            <Input
              type="text"
              value={localFont}
              onChange={(e) => handleFontChange(e.target.value)}
              placeholder="Inter, sans-serif"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {POPULAR_FONTS.map((font) => (
                <Button
                  key={font}
                  variant={localFont === font ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFontChange(font)}
                  className="justify-start"
                  style={{ fontFamily: font }}
                >
                  {font.split(',')[0]}
                </Button>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div className="border-t pt-4">
            <Label className="mb-3 block">Live Preview</Label>
            <Tabs defaultValue="portal" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="portal">Portal</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="mobile">Mobile</TabsTrigger>
              </TabsList>

              <TabsContent value="portal" className="space-y-4 mt-4">
                <div
                  className="rounded-lg border p-6 space-y-4"
                  style={{ fontFamily: localFont }}
                >
                  <div
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: localColors.primaryColor, color: 'white' }}
                  >
                    <h3 className="text-lg font-semibold">
                      {settings?.company?.name || 'Your Company'}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm">This is how your portal will look with the selected branding.</p>
                    <Button
                      size="sm"
                      style={{
                        backgroundColor: localColors.accentColor,
                        color: 'white',
                      }}
                    >
                      Action Button
                    </Button>
                  </div>
                  <div
                    className="p-2 rounded text-center text-xs"
                    style={{
                      backgroundColor: localColors.secondaryColor + '20',
                      color: localColors.secondaryColor,
                    }}
                  >
                    Powered by {settings?.company?.name || 'Your Company'}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-4 mt-4">
                <div className="rounded-lg border p-4" style={{ fontFamily: localFont }}>
                  <div
                    className="p-3 rounded-t-lg"
                    style={{ backgroundColor: localColors.primaryColor, color: 'white' }}
                  >
                    <p className="text-sm font-semibold">
                      {settings?.company?.name || 'Your Company'}
                    </p>
                  </div>
                  <div className="p-4 bg-white">
                    <p className="text-sm mb-3">Hello Customer,</p>
                    <p className="text-sm mb-3">
                      This is how your emails will appear with your brand colors.
                    </p>
                    <Button
                      size="sm"
                      style={{
                        backgroundColor: localColors.accentColor,
                        color: 'white',
                      }}
                    >
                      View Details
                    </Button>
                  </div>
                  <div
                    className="p-2 text-xs text-center"
                    style={{ color: localColors.primaryColor }}
                  >
                    © {new Date().getFullYear()} {settings?.company?.name}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mobile" className="space-y-4 mt-4">
                <div className="mx-auto w-64">
                  <div className="rounded-2xl border-4 border-gray-800 p-2 bg-white">
                    <div
                      className="rounded-xl p-3 mb-2"
                      style={{ backgroundColor: localColors.primaryColor, color: 'white' }}
                    >
                      <p className="text-xs font-semibold">
                        {settings?.company?.name || 'Your Company'}
                      </p>
                    </div>
                    <div className="space-y-2 p-2" style={{ fontFamily: localFont }}>
                      <p className="text-xs">Mobile app preview</p>
                      <Button
                        size="sm"
                        className="w-full"
                        style={{
                          backgroundColor: localColors.accentColor,
                          color: 'white',
                        }}
                      >
                        Button
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Brand Assets Upload */}
      <Card className="border-slate-200/60 dark:border-slate-700/60">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>Upload logos, favicons, and other brand assets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('upload.assetType')}</label>
              <Input list="asset-types" value={type} onChange={(e) => setType(e.target.value as BrandAssetType)} />
              <datalist id="asset-types">
                {ASSET_TYPES.map((assetType) => (
                  <option key={assetType.key} value={assetType.key}>{t(`assetTypes.${assetType.key}`)}</option>
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('upload.uploadFile')}</label>
              <Input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} />
            </div>
            <div className="space-y-2">
              <Button disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('upload.uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {t('upload.selectAndUpload')}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">{t('assets.title')}</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {assetList.map((a) => (
                <div key={a.id} className="p-3 rounded-md border border-slate-200 dark:border-slate-700">
                  <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{t(`assetTypes.${a.type}`)}</div>
                  <div className="aspect-video bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded mb-2 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.originalUrl} alt={t(`assetTypes.${a.type}`)} className="max-h-32 object-contain" />
                  </div>
                  <div className="text-xs text-slate-500 mb-2">v{a.version} • {new Date(a.updatedAt).toLocaleString()}</div>
                  <div className="flex gap-2">
                    {!a.isActive && (
                      <Button size="sm" onClick={async () => { await activateAsset(a.id); await loadTheme(); toast({ title: t('messages.activated'), description: t(`assetTypes.${a.type}`) }); }}>{t('assets.activate')}</Button>
                    )}
                    {a.isActive && (
                      <span className="text-xs text-green-600 dark:text-green-400 py-1 px-2">Active</span>
                    )}
                    <Button size="sm" variant="destructive" onClick={async () => { await removeAsset(a.id); await loadTheme(); toast({ title: t('messages.deleted'), description: t(`assetTypes.${a.type}`) }); }}>{t('assets.delete')}</Button>
                  </div>
                </div>
              ))}
              {assetList.length === 0 && <div className="text-sm text-slate-500">{t('assets.empty')}</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Computed Theme Display */}
      {theme && theme.colors && (
        <Card className="border-slate-200/60 dark:border-slate-700/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('theme.title')}</CardTitle>
                <CardDescription>Current computed theme from all settings</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => loadTheme()}>{t('theme.refresh')}</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-md border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500 mb-2">{t('theme.colors')}</div>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(theme.colors || {}).map(([k, v]) => (
                    <div key={k} className="flex flex-col items-center gap-1">
                      <div className="w-full h-10 rounded" style={{ background: String(v) }} />
                      <div className="text-[10px] text-slate-500">{k}</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-slate-500 mt-2">{t('theme.font')}: {theme.typography?.fontFamily || t('theme.system')}</div>
                <div className="text-xs text-slate-500 mt-2">{t('theme.logo')}: {theme.assets?.logoUrl ? t('theme.configured') : t('theme.notSet')}</div>
              </div>
              <div className="p-3 rounded-md border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500 mb-2">{t('theme.emailTheme')}</div>
                <div className="space-y-2">
                  <div className="h-8 rounded" style={{ background: theme.email?.headerBackground || '#f3f4f6' }} />
                  <div className="p-3 rounded" style={{ background: theme.email?.contentBackground || '#ffffff', color: theme.email?.textColor || '#000000' }}>
                    <div className="text-sm font-medium mb-2">{t('theme.preview')}</div>
                    <p style={{ margin: 0 }}>{t('theme.bodyText')} <a href="#" style={{ color: theme.email?.linkColor || '#3b82f6' }}>{t('theme.link')}</a>.</p>
                    <div className="mt-2">
                      <a className="inline-block px-3 py-2 rounded" style={{ background: theme.email?.buttonBackground || '#3b82f6', color: theme.email?.buttonTextColor || '#ffffff' }}>{t('theme.button')}</a>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500">{t('theme.footer')}: {theme.email?.footerText || ''}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domains are managed in the dedicated Domains tab (DomainManager) */}
    </div>
  );
}


