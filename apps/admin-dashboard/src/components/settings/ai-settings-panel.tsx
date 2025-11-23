'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { aiGetAutopilotConfig, aiUpdateAutopilotConfig } from '@/lib/api/ai-client';

const ALL_CHANNELS = ['whatsapp', 'instagram', 'email', 'web'];

export function AISettingsPanel() {
  const [mode, setMode] = useState<'off'|'draft'|'auto'>('off');
  const [minConfidence, setMinConfidence] = useState<number>(0.7);
  const [allowedChannels, setAllowedChannels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    aiGetAutopilotConfig().then((cfg: any) => {
      if (!cfg) return;
      if (cfg.mode) setMode(cfg.mode);
      if (typeof cfg.minConfidence === 'number') setMinConfidence(cfg.minConfidence);
      if (Array.isArray(cfg.allowedChannels)) setAllowedChannels(cfg.allowedChannels);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  function toggleChannel(ch: string) {
    setAllowedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await aiUpdateAutopilotConfig({ mode, minConfidence, allowedChannels });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>AI Autopilot</CardTitle>
        <CardDescription>Configure draft/auto mode, confidence threshold and channels</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode */}
        <div className="space-y-2">
          <Label>Mode</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as 'off'|'draft'|'auto')}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="draft">Draft (suggest only)</SelectItem>
              <SelectItem value="auto">Auto (send when confident)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Min confidence */}
        <div className="space-y-2">
          <Label>Minimum confidence ({Math.round(minConfidence * 100)}%)</Label>
          <Slider value={[minConfidence]} min={0.3} max={0.95} step={0.01} onValueChange={(v) => setMinConfidence(v[0] ?? 0.7)} className="w-80" />
          <p className="text-xs text-muted-foreground">AI must exceed this confidence to auto-send</p>
        </div>

        {/* Channels */}
        <div className="space-y-2">
          <Label>Allowed channels</Label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_CHANNELS.map((ch) => (
              <label key={ch} className="flex items-center gap-2">
                <Checkbox checked={allowedChannels.includes(ch)} onCheckedChange={() => toggleChannel(ch)} />
                <span className="capitalize">{ch}</span>
                {allowedChannels.includes(ch) && <Badge variant="secondary">enabled</Badge>}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">If none selected, all channels are allowed.</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || !loaded}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default AISettingsPanel;


