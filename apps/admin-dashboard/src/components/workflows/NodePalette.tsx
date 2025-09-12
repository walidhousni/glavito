'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type PaletteItem = { type: string; label: string };

export function NodePalette({ onAdd }: { onAdd: (type: string) => void }) {
  const items: PaletteItem[] = [
    { type: 'input', label: 'Start' },
    { type: 'default', label: 'Action' },
    { type: 'output', label: 'End' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Nodes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((it) => (
          <Button
            key={it.type + it.label}
            variant="outline"
            className="w-full justify-start"
            onClick={() => onAdd(it.type)}
          >
            {it.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}


