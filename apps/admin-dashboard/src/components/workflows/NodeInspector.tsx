'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FlowNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data?: { label?: string; [k: string]: unknown };
};

export function NodeInspector({ node, onChange }: { node: FlowNode | null; onChange: (patch: Partial<FlowNode>) => void }) {
  if (!node) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Inspector</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">Select a node to edit its properties</CardContent>
      </Card>
    );
  }

  const label = node?.data?.label || '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Inspector</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Label</Label>
          <Input
            value={String(label)}
            onChange={(e) => onChange({ data: { ...(node.data || {}), label: e.target.value } as any })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">X</Label>
            <Input
              type="number"
              value={Number(node.position?.x || 0)}
              onChange={(e) => onChange({ position: { x: parseInt(e.target.value || '0', 10), y: node.position?.y || 0 } as any })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Y</Label>
            <Input
              type="number"
              value={Number(node.position?.y || 0)}
              onChange={(e) => onChange({ position: { x: node.position?.x || 0, y: parseInt(e.target.value || '0', 10) } as any })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


