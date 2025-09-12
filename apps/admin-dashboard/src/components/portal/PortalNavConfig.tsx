'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type NavItem = { label: string; url: string };

export function PortalNavConfig({ items, onChange }: { items: NavItem[]; onChange: (items: NavItem[]) => void }) {
  const add = () => onChange([...(items || []), { label: 'New', url: '/' }]);
  const update = (idx: number, key: keyof NavItem, value: string) => {
    const next = items.slice();
    (next[idx] as any)[key] = value;
    onChange(next);
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Navigation</CardTitle>
        <CardDescription>Configure top-level portal navigation</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-3">
          {(items || []).map((it, idx) => (
            <div key={idx} className="grid md:grid-cols-3 gap-2">
              <div>
                <Label>Label</Label>
                <Input value={it.label} onChange={(e) => update(idx, 'label', e.target.value)} />
              </div>
              <div>
                <Label>URL</Label>
                <Input value={it.url} onChange={(e) => update(idx, 'url', e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={() => remove(idx)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={add}>Add Item</Button>
      </CardContent>
    </Card>
  );
}


