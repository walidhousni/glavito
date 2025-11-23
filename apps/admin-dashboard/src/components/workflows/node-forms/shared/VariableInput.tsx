'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Variable } from 'lucide-react';

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  type?: 'input' | 'textarea';
  className?: string;
}

const AVAILABLE_VARIABLES = [
  { name: 'ticketId', description: 'Current ticket ID' },
  { name: 'customerId', description: 'Current customer ID' },
  { name: 'conversationId', description: 'Current conversation ID' },
  { name: 'userId', description: 'Current user ID' },
  { name: 'variables.*', description: 'Any workflow variable' },
];

export function VariableInput({
  value,
  onChange,
  placeholder = 'Enter text or use {{variable}}',
  label,
  type = 'input',
  className,
}: VariableInputProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleInsertVariable = (varName: string) => {
    const cursorPos = (document.activeElement as HTMLInputElement | HTMLTextAreaElement)?.selectionStart || value.length;
    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);
    const newValue = `${before}{{${varName}}}${after}`;
    onChange(newValue);
    setShowPicker(false);
    
    // Restore cursor position
    setTimeout(() => {
      const element = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
      if (element) {
        const newPos = cursorPos + varName.length + 4; // {{}} + varName
        element.setSelectionRange(newPos, newPos);
        element.focus();
      }
    }, 0);
  };

  const InputComponent = type === 'textarea' ? (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      rows={3}
    />
  ) : (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );

  return (
    <div className="space-y-1">
      {label && <Label className="text-xs">{label}</Label>}
      <div className="relative">
        {InputComponent}
        <Popover open={showPicker} onOpenChange={setShowPicker}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 w-7 p-0"
              onClick={() => setShowPicker(true)}
            >
              <Variable className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="end">
            <div className="space-y-1">
              <div className="text-xs font-semibold mb-2">Available Variables</div>
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => handleInsertVariable(v.name)}
                  className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center justify-between"
                >
                  <div>
                    <div className="font-mono">{`{{${v.name}}}`}</div>
                    <div className="text-muted-foreground">{v.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {value.includes('{{') && (
        <div className="flex flex-wrap gap-1 mt-1">
          {value.match(/\{\{([^}]+)\}\}/g)?.map((match, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {match}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

