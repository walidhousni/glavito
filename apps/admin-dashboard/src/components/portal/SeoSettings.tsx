'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SeoSettings({ title, description, onChange }: { title: string; description: string; onChange: (patch: { title?: string; description?: string }) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO</CardTitle>
        <CardDescription>Meta title & description</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => onChange({ title: e.target.value })} />
        </div>
        <div>
          <Label>Description</Label>
          <Input value={description} onChange={(e) => onChange({ description: e.target.value })} />
        </div>
      </CardContent>
    </Card>
  );
}


