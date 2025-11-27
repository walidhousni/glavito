'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';
import { aiApi } from '@/lib/api/ai-client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AITriageSettingsProps {
  onClose?: () => void;
}

export function AITriageSettings({ onClose }: AITriageSettingsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Configuration state
  const [mode, setMode] = useState<'off' | 'draft' | 'auto'>('off');
  const [minConfidence, setMinConfidence] = useState(0.7);
  const [allowedChannels, setAllowedChannels] = useState<string[]>([]);

  // Load current configuration
  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      const config = await aiApi.getAutopilotConfig();
      if (config) {
        setMode(config.mode || 'off');
        setMinConfidence(config.minConfidence || 0.7);
        setAllowedChannels(config.allowedChannels || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load AI triage configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    try {
      setSaving(true);
      await aiApi.setAutopilotConfig({
        mode,
        minConfidence,
        allowedChannels,
      });
      toast({
        title: 'Success',
        description: 'AI triage configuration saved',
      });
      onClose?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Triage Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading configuration...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          AI Triage Settings
        </CardTitle>
        <CardDescription>
          Configure automatic ticket triage and routing powered by deep learning
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Autopilot Mode */}
        <div className="space-y-3">
          <Label htmlFor="mode" className="text-base font-semibold">
            Autopilot Mode
          </Label>
          <Select value={mode} onValueChange={(v) => setMode(v as any)}>
            <SelectTrigger id="mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium">Off</div>
                    <div className="text-xs text-muted-foreground">No automatic triage</div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="draft">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="font-medium">Draft Mode</div>
                    <div className="text-xs text-muted-foreground">
                      Show predictions, manual assignment
                    </div>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="auto">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="font-medium">Auto Mode</div>
                    <div className="text-xs text-muted-foreground">
                      Automatic triage and assignment
                    </div>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Mode descriptions */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            {mode === 'off' && (
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-gray-500" />
                <div>
                  <div className="font-medium">Triage Disabled</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Tickets will not be automatically analyzed or assigned. All routing must be done manually.
                  </div>
                </div>
              </div>
            )}
            {mode === 'draft' && (
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 mt-0.5 text-blue-500" />
                <div>
                  <div className="font-medium">Draft Mode Active</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    AI will analyze tickets and show predictions (intent, priority, category), but agents must manually assign tickets. Use this mode to evaluate AI accuracy before enabling full automation.
                  </div>
                </div>
              </div>
            )}
            {mode === 'auto' && (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />
                <div>
                  <div className="font-medium">Full Automation Active</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    AI will automatically analyze and assign tickets to agents when confidence exceeds the threshold. Agents can still override AI assignments.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confidence Threshold */}
        {mode !== 'off' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="confidence" className="text-base font-semibold">
                Minimum Confidence
              </Label>
              <Badge variant="secondary" className="font-mono">
                {(minConfidence * 100).toFixed(0)}%
              </Badge>
            </div>
            <Slider
              value={[minConfidence * 100]}
              onValueChange={(v) => setMinConfidence(v[0] / 100)}
              min={50}
              max={95}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {mode === 'auto'
                ? 'Tickets will only be auto-assigned when AI confidence exceeds this threshold'
                : 'Predictions below this threshold will be marked as low confidence'}
            </p>
          </div>
        )}

        {/* Allowed Channels */}
        {mode !== 'off' && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">Allowed Channels</Label>
            <div className="space-y-2">
              {['email', 'whatsapp', 'instagram', 'web', 'phone'].map((channel) => (
                <div key={channel} className="flex items-center space-x-2">
                  <Switch
                    id={`channel-${channel}`}
                    checked={allowedChannels.length === 0 || allowedChannels.includes(channel)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        if (allowedChannels.length === 0) {
                          // If all were allowed, now only allow this one
                          setAllowedChannels([channel]);
                        } else {
                          setAllowedChannels([...allowedChannels, channel]);
                        }
                      } else {
                        const filtered = allowedChannels.filter((c) => c !== channel);
                        setAllowedChannels(filtered);
                      }
                    }}
                  />
                  <Label
                    htmlFor={`channel-${channel}`}
                    className="text-sm font-normal capitalize cursor-pointer"
                  >
                    {channel}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {allowedChannels.length === 0
                ? 'All channels enabled for triage'
                : `Triage enabled for ${allowedChannels.length} channel(s)`}
            </p>
          </div>
        )}

        {/* Status Badge */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Current Status</span>
            </div>
            <Badge
              variant={mode === 'auto' ? 'default' : mode === 'draft' ? 'secondary' : 'outline'}
              className={
                mode === 'auto'
                  ? 'bg-green-500'
                  : mode === 'draft'
                  ? 'bg-blue-500'
                  : ''
              }
            >
              {mode === 'auto' ? 'Active' : mode === 'draft' ? 'Draft' : 'Disabled'}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          {onClose && (
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          )}
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

