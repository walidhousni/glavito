'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VersionOption {
  value: string;
  title: string;
  features: string[];
}

interface VersionToggleProps {
  value: string;
  onValueChange: (value: string) => void;
  options: VersionOption[];
  title?: string;
  description?: string;
}

export function VersionToggle({
  value,
  onValueChange,
  options,
  title = 'Default version',
  description = 'Select the default version you want to use. Your selection will be effective the next time you sign in, and you can switch versions at any time.',
}: VersionToggleProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      
      <RadioGroup value={value} onValueChange={onValueChange} className="space-y-4">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <div key={option.value}>
              <Label
                htmlFor={option.value}
                className={cn(
                  'flex items-start gap-4 p-5 rounded-lg border-2 cursor-pointer transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 bg-white'
                )}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className={cn(
                        'h-5 w-5 border-2 relative [&>span]:hidden',
                        isSelected 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300 bg-white'
                      )}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="h-2 w-2 bg-white rounded-full" />
                        </div>
                      )}
                    </RadioGroupItem>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-base mb-3">{option.title}</div>
                    <ul className="space-y-2">
                      {option.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}

