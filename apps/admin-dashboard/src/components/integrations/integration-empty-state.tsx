'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Puzzle, ArrowRight, Sparkles } from 'lucide-react';

interface IntegrationEmptyStateProps {
  onConnect?: () => void;
}

export function IntegrationEmptyState({ onConnect }: IntegrationEmptyStateProps) {
  return (
    <Card className="border-2 border-dashed border-border/50 bg-muted/20">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        {/* Animated icon */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative bg-gradient-to-br from-primary/20 to-primary/10 rounded-full p-6">
            <Puzzle className="h-16 w-16 text-primary animate-bounce" style={{ animationDuration: '3s' }} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Connect Your First Integration
        </h3>

        {/* Description */}
        <p className="text-muted-foreground max-w-md mb-8 text-base leading-relaxed">
          Supercharge your workflow by connecting CRM systems, communication channels, and productivity tools.
          Sync data automatically and work smarter.
        </p>

        {/* Features list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 w-full max-w-2xl">
          {[
            { label: 'Auto Sync', desc: 'Real-time data synchronization' },
            { label: 'Field Mapping', desc: 'Customize data transformations' },
            { label: 'Bi-directional', desc: 'Two-way data flow' },
          ].map((feature) => (
            <div
              key={feature.label}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background/50 border border-border/50"
            >
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="text-sm font-medium">{feature.label}</div>
              <div className="text-xs text-muted-foreground">{feature.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Button onClick={onConnect} size="lg" className="group">
          Browse Integrations
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>

        {/* Help text */}
        <p className="text-xs text-muted-foreground mt-6">
          Need help? Check out our{' '}
          <a href="#" className="text-primary hover:underline font-medium">
            integration guides
          </a>
        </p>
      </CardContent>
    </Card>
  );
}

