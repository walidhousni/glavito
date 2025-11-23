"use client";
import { useEffect, useState } from 'react';
import { useWhiteLabel } from '@/lib/hooks/use-white-label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';

interface FeatureToggleItem {
  id: string;
  featureKey: string;
  isEnabled: boolean;
  configuration?: Record<string, unknown>;
  restrictions?: Record<string, unknown>;
  updatedAt: string;
}

export function FeatureTogglesPanel() {
  const { toggles, loadToggles, upsertToggle, deleteToggle } = useWhiteLabel() as { toggles: FeatureToggleItem[]; loadToggles: () => Promise<void>; upsertToggle: (t: { featureKey: string; isEnabled?: boolean; configuration?: Record<string, unknown>; restrictions?: Record<string, unknown> }) => Promise<void>; deleteToggle: (k: string) => Promise<void> };
  const [featureKey, setFeatureKey] = useState('marketing_launch');
  const [enabled, setEnabled] = useState(true);
  const [plan, setPlan] = useState('starter');
  const tctx = useToast() as unknown as { toast?: (opts: { title: string; description?: string; variant?: string }) => void };

  useEffect(() => {
    loadToggles().catch((e) => console.debug('loadToggles failed', (e as Error)?.message));
  }, [loadToggles]);

  const addOrUpdate = async () => {
    await upsertToggle({ featureKey, isEnabled: enabled, restrictions: { plan } });
    tctx?.toast?.({ title: 'Saved', description: featureKey });
    setFeatureKey('');
  };

  return (
    <Card className="border-slate-200/60 dark:border-slate-700/60">
      <CardHeader>
        <CardTitle>Feature Toggles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="feature_key" value={featureKey} onChange={(e) => setFeatureKey(e.target.value)} />
          <Input placeholder="plan restriction (optional)" value={plan} onChange={(e) => setPlan(e.target.value)} />
          <div className="flex items-center gap-3">
            <Switch checked={enabled} onCheckedChange={(v: boolean) => setEnabled(v)} />
            <Button onClick={addOrUpdate}>Save</Button>
          </div>
        </div>

        <div className="space-y-2">
          {(Array.isArray(toggles) ? toggles : []).map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-md border border-slate-200 dark:border-slate-700">
              <div className="text-sm">
                <div className="font-medium">{t.featureKey}</div>
                <div className="text-slate-500 text-xs">enabled: {String(t.isEnabled)} • plan: {String(((t.restrictions as Record<string, unknown> | undefined)?.['plan']) ?? 'any')} • {new Date(t.updatedAt).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={async () => { await upsertToggle({ featureKey: t.featureKey, isEnabled: !t.isEnabled }); tctx?.toast?.({ title: !t.isEnabled ? 'Enabled' : 'Disabled', description: t.featureKey }); }}>{t.isEnabled ? 'Disable' : 'Enable'}</Button>
                <Button size="sm" variant="destructive" onClick={async () => { await deleteToggle(t.featureKey); tctx?.toast?.({ title: 'Deleted', description: t.featureKey }); }}>Delete</Button>
              </div>
            </div>
          ))}
          {(!Array.isArray(toggles) || toggles.length === 0) && <div className="text-sm text-slate-500">No toggles configured.</div>}
        </div>
      </CardContent>
    </Card>
  );
}


