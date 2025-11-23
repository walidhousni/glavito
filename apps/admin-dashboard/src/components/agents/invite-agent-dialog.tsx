'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { invitationsApi, type InvitationRole } from '@/lib/api/invitations-client';
import { teamApi, type Team } from '@/lib/api/team';
import { useToast } from '@/components/ui/toast';
import { X, UserPlus, Mail, Users, MessageSquare, Sparkles } from 'lucide-react';

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
      if (emails.length === 1) {
        await invitationsApi.sendInvitation({ email: emails[0], role, teamIds: selectedTeamIds, customMessage: message });
        push(t('inviteDialog.successAll'), 'success');
      } else {
        const result = await invitationsApi.sendBulk({ emails, role, teamIds: selectedTeamIds, customMessage: message });
        const sent = typeof result === 'object' && result !== null && 'sent' in (result as Record<string, unknown>)
          ? Number((result as Record<string, unknown>).sent)
          : 0;
        if (sent === emails.length) push(t('inviteDialog.successAll'), 'success');
        else if (sent > 0) push(t('inviteDialog.successPartial', { success: sent, total: emails.length }), 'info');
        else push(t('inviteDialog.failed'), 'error');
      }
      onOpenChange(false);
      clearAll();
    } finally {
      setSubmitting(false);
    }
  };

  const hasInvalid = invalid.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-semibold gradient-text">
                {t('inviteDialog.title')}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t('inviteDialog.subtitle')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Email Input Section */}
          <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <Label className="text-base font-semibold">{t('inviteDialog.emailsLabel')}</Label>
                </div>
                
                <div className="space-y-3">
                  <div className="relative">
                    <div className="min-h-[120px] rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-4 focus-within:border-primary/50 focus-within:bg-background transition-all">
                      {emails.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {emails.map((e) => (
                            <Badge key={e} variant="secondary" className="px-3 py-1.5 text-sm font-medium">
                              <Mail className="h-3 w-3 mr-1.5" />
                              {e}
                              <button 
                                aria-label="remove" 
                                className="ml-2 hover:text-destructive transition-colors" 
                                onClick={() => removeEmail(e)}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Input
                        ref={inputRef}
                        value={input}
                        onChange={(ev) => setInput(ev.target.value)}
                        onKeyDown={onKeyDown}
                        onBlur={() => { if (input.trim()) { addEmailsFromString(input); setInput(''); } }}
                        placeholder={emails.length === 0 ? t('inviteDialog.emailPlaceholder') : t('inviteDialog.addMoreEmails')}
                        className="border-0 focus-visible:ring-0 px-0 bg-transparent text-base placeholder:text-muted-foreground/60"
                      />
                    </div>
                    {emails.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearAll}
                        className="absolute top-2 right-2 h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {hasInvalid && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="h-2 w-2 rounded-full bg-destructive" />
                      <span className="text-sm text-destructive font-medium">
                        {t('inviteDialog.invalidEmails')}: {invalid.join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {emails.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                      <span>{t('inviteDialog.emailsReady', { count: emails.length })}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Role and Teams Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role Selection */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <Label className="text-base font-semibold">{t('inviteDialog.roleLabel')}</Label>
                  </div>
                  <Select value={role} onValueChange={(v) => setRole(v as InvitationRole)}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent" className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <div className="font-medium">{t('roles.agent', { fallback: 'Agent' })}</div>
                            <div className="text-xs text-muted-foreground">{t('inviteDialog.roleDescriptions.agent')}</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="manager" className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="font-medium">{t('roles.manager', { fallback: 'Manager' })}</div>
                            <div className="text-xs text-muted-foreground">{t('inviteDialog.roleDescriptions.manager')}</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin" className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <div className="font-medium">{t('roles.admin', { fallback: 'Admin' })}</div>
                            <div className="text-xs text-muted-foreground">{t('inviteDialog.roleDescriptions.admin')}</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Team Assignment */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <Label className="text-base font-semibold">{t('inviteDialog.teamsLabel')}</Label>
                  </div>
                  
                  <div className="space-y-3">
                    {teams.length === 0 ? (
                      <div className="flex items-center justify-center p-8 text-center">
                        <div className="space-y-2">
                          <Users className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-sm text-muted-foreground">{t('inviteDialog.noTeams')}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                        {teams.map((team) => (
                          <label key={team.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                            <Checkbox
                              checked={selectedTeamIds.includes(team.id)}
                              onCheckedChange={() => toggleTeam(team.id)}
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{team.name}</div>
                              {team.description && (
                                <div className="text-xs text-muted-foreground">{team.description}</div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {selectedTeamIds.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span>{t('inviteDialog.teamsSelected', { count: selectedTeamIds.length })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Custom Message */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <Label className="text-base font-semibold">{t('inviteDialog.messageLabel')}</Label>
                  <Badge variant="secondary" className="text-xs">{t('inviteDialog.optional')}</Badge>
                </div>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('inviteDialog.messagePlaceholder')}
                  className="min-h-[100px] resize-none"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {t('inviteDialog.messageDescription')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-3 pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={submitting}
            className="min-w-[100px]"
          >
            {t('inviteDialog.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!allValid || submitting} 
            className="min-w-[120px] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t('inviteDialog.sending')}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('inviteDialog.send')}
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


