'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/lib/icons';
import { useWhiteLabel } from '@/lib/hooks/use-white-label';
import { exportThemeCSS } from '@/lib/design-tokens';
import { toast } from '@/hooks/use-toast';


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
          className="w-12 h-12 rounded-lg border shadow-sm cursor-pointer"
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

export function BrandingHub() {
  const t = useTranslations('settings.whiteLabel.branding');
  const { settings, saveSettings } = useWhiteLabel();

  const [localColors, setLocalColors] = useState({
    primaryColor: settings?.branding?.primaryColor || '#3B82F6',
    secondaryColor: settings?.branding?.secondaryColor || '#0EA5E9',
    accentColor: settings?.branding?.accentColor || '#8B5CF6',
  });

  const [localFont, setLocalFont] = useState(
    settings?.branding?.fontFamily || 'Inter, sans-serif'
  );

  const [hasChanges, setHasChanges] = useState(false);

  const handleColorChange = (key: string, value: string) => {
    setLocalColors((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleFontChange = (font: string) => {
    setLocalFont(font);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveSettings({
        branding: {
          ...settings?.branding,
          ...localColors,
          fontFamily: localFont,
        },
      });
      setHasChanges(false);
      toast({
        title: 'Branding updated',
        description: 'Your brand settings have been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save branding settings.',
        variant: 'destructive',
      });
    }
  };

  const handleExportTheme = () => {
    const theme = {
      colors: {
        primary: localColors.primaryColor,
        secondary: localColors.secondaryColor,
        accent: localColors.accentColor,
      },
      typography: {
        fontFamily: localFont,
      },
    };

    const css = exportThemeCSS(theme);
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

  const popularFonts = [
    'Inter, sans-serif',
    'Roboto, sans-serif',
    'Open Sans, sans-serif',
    'Lato, sans-serif',
    'Montserrat, sans-serif',
    'Poppins, sans-serif',
    'Nunito, sans-serif',
    'Raleway, sans-serif',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{t('title')}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={() => window.location.reload()}>
              <Icon name="x" className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
          <Button variant="outline" onClick={handleExportTheme}>
            <Icon name="download" className="w-4 h-4 mr-2" />
            {t('exportTheme')}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Icon name="save" className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <div className="space-y-6">
          {/* Color Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="palette" className="w-5 h-5" />
                {t('colorPicker')}
              </CardTitle>
              <CardDescription>
                Customize your brand colors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Font Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="fileText" className="w-5 h-5" />
                {t('fontSelector')}
              </CardTitle>
              <CardDescription>
                Choose your brand typography
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Font Family</Label>
                <Input
                  type="text"
                  value={localFont}
                  onChange={(e) => handleFontChange(e.target.value)}
                  placeholder="Inter, sans-serif"
                />
              </div>

              <div className="space-y-2">
                <Label>Popular Fonts</Label>
                <div className="grid grid-cols-2 gap-2">
                  {popularFonts.map((font) => (
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
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="upload" className="w-5 h-5" />
                {t('logoUpload')}
              </CardTitle>
              <CardDescription>
                Upload your brand logo and favicon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                  <Icon name="upload" className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    SVG, PNG, JPG (max. 2MB)
                  </p>
                </div>

                {settings?.branding?.logoUrl && (
                  <div className="p-4 bg-muted rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={settings.branding.logoUrl}
                        alt="Current Logo"
                        className="h-12 w-auto object-contain"
                      />
                      <span className="text-sm">Current Logo</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Icon name="trash" className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Panel */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon name="eye" className="w-5 h-5" />
                {t('livePreview')}
              </CardTitle>
              <CardDescription>
                See how your brand looks across different contexts
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                    {/* Header */}
                    <div
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: localColors.primaryColor, color: 'white' }}
                    >
                      <h3 className="text-lg font-semibold">
                        {settings?.company?.name || 'Your Company'}
                      </h3>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <p className="text-sm">
                        This is how your portal will look with the selected branding.
                      </p>
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

                    {/* Footer */}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

