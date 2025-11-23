'use client';

import { validateTicketAssign, ValidationError } from './shared/validation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { VariableInput } from './shared/VariableInput';
import { AgentSelector } from './shared/AgentSelector';
import { TeamSelector } from './shared/TeamSelector';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface TicketAssignFormProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export function TicketAssignForm({ config, onChange }: TicketAssignFormProps) {
  const ticketId = config.ticketId || '';
  const assignToUserId = config.assignToUserId || config.userId || '';
  const teamId = config.teamId || '';
  const note = config.note || '';

  const errors = validateTicketAssign(config);

  const updateConfig = (updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
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
      <VariableInput
        value={ticketId}
        onChange={(v) => updateConfig({ ticketId: v })}
        label="Ticket ID"
        placeholder="{{ticketId}} or leave empty to use context"
      />
      <p className="text-[11px] text-muted-foreground">
        Leave empty to use ticketId from workflow context
      </p>

      <AgentSelector
        value={assignToUserId}
        onChange={(v) => updateConfig({ assignToUserId: v, userId: v })}
        label="Assign to Agent"
        allowUnassigned
      />

      <TeamSelector
        value={teamId}
        onChange={(v) => updateConfig({ teamId: v })}
        label="Assign to Team (alternative)"
        allowNone
      />

      <div className="space-y-1">
        <Label className="text-xs">Assignment Note (optional)</Label>
        <Textarea
          value={note}
          onChange={(e) => updateConfig({ note: e.target.value })}
          placeholder="Optional note about this assignment"
          rows={2}
          className="text-xs"
        />
      </div>

      {!assignToUserId && !teamId && (
        <p className="text-xs text-amber-600">
          Warning: Either an agent or team must be selected for assignment
        </p>
      )}
    </div>
  );
}

