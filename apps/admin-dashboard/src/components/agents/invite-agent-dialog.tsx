'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { invitationsApi, type InvitationRole } from '@/lib/api/invitations-client';
import { teamApi, type Team } from '@/lib/api/team';
import { useToast } from '@/components/ui/toast';
import { X, UserPlus } from 'lucide-react';

interface InviteAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMAIL_REGEX = /^(?:[a-zA-Z0-9_'^&/+-])+(?:\.(?:[a-zA-Z0-9_'^&/+-])+)*@(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})$/;

export function InviteAgentDialog({ open, onOpenChange }: InviteAgentDialogProps) {
  const t = useTranslations('agents');
  const { push } = useToast();

  const [input, setInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [role, setRole] = useState<InvitationRole>('agent');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      try {
        const data = await teamApi.getTeams();
        if (!isCancelled) setTeams(data);
      } catch {
        // ignore
      }
    }
    if (open) {
      load();
      // reset focus
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => { isCancelled = true; };
  }, [open]);

  const addEmailsFromString = useCallback((raw: string) => {
    const parts = raw
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;

    setEmails((prev) => {
      const next = new Set(prev);
      const invalids: string[] = [];
      for (const p of parts) {
        if (EMAIL_REGEX.test(p)) next.add(p.toLowerCase());
        else invalids.push(p);
      }
      if (invalids.length) setInvalid((prevInv) => Array.from(new Set([...prevInv, ...invalids])));
      return Array.from(next);
    });
  }, []);

  const removeEmail = (e: string) => {
    setEmails((prev) => prev.filter((x) => x !== e));
  };

  const clearAll = () => {
    setEmails([]);
    setInvalid([]);
    setInput('');
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (input.trim()) {
        addEmailsFromString(input);
        setInput('');
      }
    } else if (e.key === 'Backspace' && !input && emails.length) {
      // Backspace removes last chip
      setEmails((prev) => prev.slice(0, -1));
    }
  };

  const allValid = emails.length > 0;

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) => (
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    ));
  };

  const handleSubmit = async () => {
    if (!allValid || submitting) return;
    setSubmitting(true);
    try {
      let successCount = 0;
      for (const email of emails) {
        try {
          await invitationsApi.sendInvitation({ email, role, teamIds: selectedTeamIds, customMessage: message });
          successCount += 1;
        } catch {
          // push per-email error? Aggregate at end to avoid toast flood
        }
      }
      if (successCount === emails.length) {
        push(t('inviteDialog.successAll'), 'success');
        onOpenChange(false);
        clearAll();
      } else if (successCount > 0) {
        push(t('inviteDialog.successPartial', { success: successCount, total: emails.length }), 'info');
      } else {
        push(t('inviteDialog.failed'), 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const hasInvalid = invalid.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg premium-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-5 w-5" /> {t('inviteDialog.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Emails */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('inviteDialog.emailsLabel')}</Label>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <div className="flex flex-wrap gap-2 mb-2">
                {emails.map((e) => (
                  <span key={e} className="chip chip-primary flex items-center">
                    {e}
                    <button aria-label="remove" className="ml-2 opacity-70 hover:opacity-100 transition-opacity" onClick={() => removeEmail(e)}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <Input
                ref={inputRef}
                value={input}
                onChange={(ev) => setInput(ev.target.value)}
                onKeyDown={onKeyDown}
                onBlur={() => { if (input.trim()) { addEmailsFromString(input); setInput(''); } }}
                placeholder={t('inviteDialog.emailsPlaceholder')}
                className="border-0 focus-visible:ring-0 px-0 bg-transparent"
              />
              {hasInvalid && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {t('inviteDialog.invalidNotice')} {invalid.join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('inviteDialog.roleLabel')}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as InvitationRole)}>
                <SelectTrigger className="w-full rounded-lg focus-ring">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">{t('roles.agent', { fallback: 'Agent' })}</SelectItem>
                  <SelectItem value="manager">{t('roles.manager', { fallback: 'Manager' })}</SelectItem>
                  <SelectItem value="admin">{t('roles.admin', { fallback: 'Admin' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Teams */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('inviteDialog.teamsLabel')}</Label>
              <div className="max-h-28 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900/50">
                {teams.length === 0 ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t('inviteDialog.noTeams')}</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {teams.map((team) => (
                      <label key={team.id} className="flex items-center gap-3 text-sm cursor-pointer">
                        <Checkbox
                          checked={selectedTeamIds.includes(team.id)}
                          onChange={() => toggleTeam(team.id)}
                        />
                        <span className="text-slate-700 dark:text-slate-300">{team.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('inviteDialog.messageLabel')}</Label>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('inviteDialog.messagePlaceholder')}
              className="rounded-lg focus-ring"
            />
          </div>
        </div>

        <DialogFooter className="gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="rounded-lg">
            {t('inviteDialog.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!allValid || submitting} className="btn-gradient rounded-lg">
            {submitting ? t('inviteDialog.sending') : t('inviteDialog.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


