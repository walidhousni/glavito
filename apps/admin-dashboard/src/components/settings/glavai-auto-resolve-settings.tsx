'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { GlavaiLogo, GlavaiBadge } from '@/components/glavai/glavai-theme';
import { glavaiClient, GlavaiConfig } from '@/lib/api/glavai-client';
import { useToast } from '@/components/ui/toast';
import { Loader2, Save } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'messenger', label: 'Messenger' },
  { id: 'email', label: 'Email' },
  { id: 'web', label: 'Web Chat' },
];

export function GlavaiAutoResolveSettings() {
  const { success, error: toastError } = useToast();
  const [config, setConfig] = useState<GlavaiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await glavaiClient.getConfig();
        setConfig(data);
      } catch (err) {
        console.error('Failed to fetch GLAVAI config:', err);
        toastError('Failed to load GLAVAI settings');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [toastError]);

  const handleSave = async () => {
    if (!config) return;

    // Ensure we're saving the safe config with all defaults applied
    const configToSave: GlavaiConfig = {
      autoResolveEnabled: config.autoResolveEnabled ?? false,
      autoResolveConfidenceThreshold: config.autoResolveConfidenceThreshold ?? 0.85,
      autoResolveChannels: Array.isArray(config.autoResolveChannels) ? config.autoResolveChannels : [],
      autoResolveSendResponse: config.autoResolveSendResponse ?? true,
      glavaiTheme: config.glavaiTheme || {},
    };

    setSaving(true);
    try {
      await glavaiClient.updateConfig(configToSave);
      setConfig(configToSave); // Update local state with saved config
      success('GLAVAI settings saved successfully');
    } catch (err) {
      console.error('Failed to save GLAVAI config:', err);
      toastError('Failed to save GLAVAI settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GlavaiLogo size="sm" variant="icon" />
            <span>GLAVAI Auto-Resolve Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) return null;

  // Safely handle missing or incomplete config with defaults
  const safeConfig: GlavaiConfig = {
    autoResolveEnabled: config.autoResolveEnabled ?? false,
    autoResolveConfidenceThreshold: config.autoResolveConfidenceThreshold ?? 0.85,
    autoResolveChannels: Array.isArray(config.autoResolveChannels) ? config.autoResolveChannels : [],
    autoResolveSendResponse: config.autoResolveSendResponse ?? true,
    glavaiTheme: config.glavaiTheme || {},
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GlavaiLogo size="sm" variant="icon" />
              <span>GLAVAI Auto-Resolve</span>
            </CardTitle>
            <CardDescription>
              Configure AI Agent to automatically resolve routine queries
            </CardDescription>
          </div>
          <GlavaiBadge variant={safeConfig.autoResolveEnabled ? 'success' : 'default'}>
            {safeConfig.autoResolveEnabled ? 'Enabled' : 'Disabled'}
          </GlavaiBadge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-resolve-enabled">Enable Auto-Resolve</Label>
            <p className="text-sm text-gray-500">
              Automatically resolve routine queries with high confidence
            </p>
          </div>
          <Switch
            id="auto-resolve-enabled"
            checked={safeConfig.autoResolveEnabled}
            onCheckedChange={(checked) =>
              setConfig({ ...safeConfig, autoResolveEnabled: checked })
            }
          />
        </div>

        {/* Confidence Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="confidence-threshold">Confidence Threshold</Label>
            <span className="text-sm font-medium text-purple-600">
              {safeConfig.autoResolveConfidenceThreshold.toFixed(2)}
            </span>
          </div>
          <Slider
            id="confidence-threshold"
            min={0.5}
            max={1.0}
            step={0.05}
            value={[safeConfig.autoResolveConfidenceThreshold]}
            onValueChange={([value]) =>
              setConfig({ ...safeConfig, autoResolveConfidenceThreshold: value })
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Conservative (0.85)</span>
            <span>Very High (0.95)</span>
          </div>
          <p className="text-sm text-gray-500">
            Only auto-resolve when confidence exceeds this threshold. Higher values are more
            conservative.
          </p>
        </div>

        {/* Channel Selection */}
        <div className="space-y-3">
          <Label>Allowed Channels</Label>
          <p className="text-sm text-gray-500">
            Select which channels can use auto-resolve
          </p>
          <div className="grid grid-cols-2 gap-3">
            {CHANNELS.map((channel) => (
              <div key={channel.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`channel-${channel.id}`}
                  checked={safeConfig.autoResolveChannels.includes(channel.id)}
                  onCheckedChange={(checked) => {
                    const channels = checked
                      ? [...safeConfig.autoResolveChannels, channel.id]
                      : safeConfig.autoResolveChannels.filter((c) => c !== channel.id);
                    setConfig({ ...safeConfig, autoResolveChannels: channels });
                  }}
                />
                <Label
                  htmlFor={`channel-${channel.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {channel.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Auto-Send vs Review */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-send">Auto-Send Response</Label>
            <p className="text-sm text-gray-500">
              {safeConfig.autoResolveSendResponse
                ? 'Responses will be sent automatically'
                : 'Responses will be created as drafts for review'}
            </p>
          </div>
          <Switch
            id="auto-send"
            checked={safeConfig.autoResolveSendResponse}
            onCheckedChange={(checked) =>
              setConfig({ ...safeConfig, autoResolveSendResponse: checked })
            }
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving || !config} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

