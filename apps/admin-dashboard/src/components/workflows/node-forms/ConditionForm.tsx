'use client';

import { validateCondition, ValidationError } from './shared/validation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { VariableInput } from './shared/VariableInput';
import { Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ConditionFormProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

const OPERATORS = [
  { value: 'equals', label: 'Equals (==)' },
  { value: 'not_equals', label: 'Not Equals (!=)' },
  { value: 'greater_than', label: 'Greater Than (>)' },
  { value: 'greater_than_or_equal', label: 'Greater Than or Equal (>=)' },
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'less_than_or_equal', label: 'Less Than or Equal (<=)' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Not Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'in', label: 'In (array)' },
  { value: 'not_in', label: 'Not In (array)' },
  { value: 'exists', label: 'Exists' },
  { value: 'not_exists', label: 'Not Exists' },
  { value: 'regex', label: 'Matches Regex' },
];

const CONTEXT_FIELDS = [
  { value: 'ticketId', label: 'Ticket ID' },
  { value: 'customerId', label: 'Customer ID' },
  { value: 'conversationId', label: 'Conversation ID' },
  { value: 'userId', label: 'User ID' },
  { value: 'variables.*', label: 'Workflow Variable' },
];

export function ConditionForm({ config, onChange }: ConditionFormProps) {
  const conditions = Array.isArray(config.conditions) ? config.conditions : [];
  const defaultOutput = config.defaultOutput || '';

  const errors = validateCondition(config);

  const updateConfig = (updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  };

  const addCondition = () => {
    updateConfig({
      conditions: [
        ...conditions,
        { field: '', operator: 'equals', value: '' },
      ],
    });
  };

  const updateCondition = (index: number, updates: Partial<{ field: string; operator: string; value: any }>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    updateConfig({ conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    updateConfig({
      conditions: conditions.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <div className="space-y-1">
              {errors.map((error, idx) => (
                <div key={idx}>
                  <strong>{error.field}:</strong> {error.message}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Conditions</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addCondition}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Condition
          </Button>
        </div>

        {conditions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No conditions. Add one to start.</p>
        ) : (
          <div className="space-y-2">
            {conditions.map((condition: any, index: number) => (
              <div key={index} className="border rounded-md p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Condition {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCondition(index)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Field</Label>
                    <Select
                      value={condition.field || ''}
                      onValueChange={(v) => updateCondition(index, { field: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTEXT_FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Operator</Label>
                    <Select
                      value={condition.operator || 'equals'}
                      onValueChange={(v) => updateCondition(index, { operator: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Value</Label>
                    {condition.operator === 'exists' || condition.operator === 'not_exists' ? (
                      <Input
                        value="N/A"
                        disabled
                        className="h-8 text-xs"
                      />
                    ) : (
                      <Input
                        value={String(condition.value || '')}
                        onChange={(e) => updateCondition(index, { value: e.target.value })}
                        placeholder="Value or {{variable}}"
                        className="h-8 text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Default Output Port (optional)</Label>
        <Input
          value={defaultOutput}
          onChange={(e) => updateConfig({ defaultOutput: e.target.value })}
          placeholder="default"
          className="h-8"
        />
        <p className="text-[11px] text-muted-foreground">
          Used when no condition matches. Outputs: true, false
        </p>
      </div>
    </div>
  );
}

