"use client";
import { useEffect, useState } from 'react';
import { useWhiteLabel } from '@/lib/hooks/use-white-label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export function FeatureTogglesPanel() {
  const { toggles, loadToggles, upsertToggle, deleteTemplate } = useWhiteLabel() as any;
  const [featureKey, setFeatureKey] = useState('marketing_launch');
  const [enabled, setEnabled] = useState(true);
  const [plan, setPlan] = useState('starter');

  useEffect(() => {
    loadToggles().catch(() => {});
  }, [loadToggles]);

  const addOrUpdate = async () => {
    await upsertToggle({ featureKey, isEnabled: enabled, restrictions: { plan } });
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
          {toggles?.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-md border border-slate-200 dark:border-slate-700">
              <div className="text-sm">
                <div className="font-medium">{t.featureKey}</div>
                <div className="text-slate-500 text-xs">enabled: {String(t.isEnabled)} • plan: {(t.restrictions as any)?.plan || 'any'} • {new Date(t.updatedAt).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => upsertToggle({ featureKey: t.featureKey, isEnabled: !t.isEnabled })}>{t.isEnabled ? 'Disable' : 'Enable'}</Button>
                <Button size="sm" variant="destructive" onClick={() => (deleteTemplate as any)(t.featureKey)}>Delete</Button>
              </div>
            </div>
          ))}
          {(!toggles || toggles.length === 0) && <div className="text-sm text-slate-500">No toggles configured.</div>}
        </div>
      </CardContent>
    </Card>
  );
}


