'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

interface ContextVariableHelperProps {
  className?: string;
}

const AVAILABLE_VARIABLES = [
  { name: 'ticketId', description: 'Current ticket ID', category: 'Context' },
  { name: 'customerId', description: 'Current customer ID', category: 'Context' },
  { name: 'conversationId', description: 'Current conversation ID', category: 'Context' },
  { name: 'userId', description: 'Current user/agent ID', category: 'Context' },
  { name: 'variables.*', description: 'Any workflow variable', category: 'Workflow' },
];

export function ContextVariableHelper({ className }: ContextVariableHelperProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-1">
          <Info className="h-3 w-3" />
          Available Variables
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground mb-2">
          Use <code className="px-1 py-0.5 bg-muted rounded text-[10px]">{'{{variable}}'}</code> syntax to reference variables
        </div>
        <div className="space-y-2">
          {AVAILABLE_VARIABLES.map((v) => (
            <div key={v.name} className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">{`{{${v.name}}}`}</code>
                <div className="text-[10px] text-muted-foreground mt-0.5">{v.description}</div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {v.category}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

