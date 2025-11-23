'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, UserPlus, Trash2, X } from 'lucide-react';

export interface BulkActionsBarProps {
  selectedCount: number;
  onAction: (action: string, params?: unknown) => Promise<void> | void;
  onClear: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onAction,
  onClear,
}: BulkActionsBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="rounded-xl border bg-background shadow-lg px-4 py-3 flex items-center gap-3">
        <Badge variant="secondary" className="text-xs">
          {selectedCount} selected
        </Badge>
        <div className="w-px h-5 bg-border" />
        <Button size="sm" variant="outline" onClick={() => onAction('assign')}>
          <UserPlus className="h-4 w-4 mr-2" />
          Assign
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction('resolve')}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Resolve
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction('delete')}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
        <div className="w-px h-5 bg-border" />
        <Button size="sm" variant="ghost" onClick={onClear}>
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>
    </div>
  );
}


