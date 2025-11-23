'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps {
  value: [number];
  onValueChange: (value: [number]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

/**
 * Minimal slider compatible with Shadcn's array-based Slider API.
 * Internally uses a native input[type="range"] for broad compatibility without extra deps.
 */
export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: SliderProps): React.JSX.Element {
  const current = value?.[0] ?? 0;
  const percentage = ((current - min) / (max - min)) * 100;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const next = Number(e.currentTarget.value);
    onValueChange([next]);
  }

  return (
    <div className={cn('w-full select-none', className)}>
      <div className="relative h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="absolute left-0 top-0 h-2 rounded-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
        />
        <input
          type="range"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          min={min}
          max={max}
          step={step}
          value={current}
          onChange={handleChange}
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 h-2 w-full appearance-none bg-transparent',
            'focus:outline-none'
          )}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        />
        {/* Thumb */}
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-white bg-primary shadow transition-transform"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
      <div className="mt-2 flex w-full justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
