'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { agentApi, type AgentProfile, type UpdateAgentProfileRequest, type CreateAgentProfileRequest } from '@/lib/api/team';
import { useAuthStore } from '@/lib/store/auth-store';

type Props = {
  userId?: string; // defaults to current user
};

export function AgentProfileForm({ userId }: Props) {
  const t = useTranslations('agents');
  const { user } = useAuthStore();
  const targetUserId = userId || (user?.id ?? '');

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string>('');
  const [languages, setLanguages] = useState<string>('');
  const [timezone, setTimezone] = useState('');
  const [maxTickets, setMaxTickets] = useState<number>(5);
  const [autoAssign, setAutoAssign] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!targetUserId) return;
      setLoading(true);
      try {
        try {
          const p = await agentApi.getAgentProfile(targetUserId);
          if (!cancelled && p) {
            setProfile(p);
            setDisplayName(p.displayName || '');
            setBio(p.bio || '');
            setSkills((p.skills || []).join(', '));
            setLanguages((p.languages || []).join(', '));
            setTimezone(p.timezone || '');
            setMaxTickets(p.maxConcurrentTickets || 5);
            setAutoAssign(p.autoAssign ?? true);
          }
        } catch {
          // not found: allow create
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true };
  }, [targetUserId]);

  const parsedSkills = useMemo(() => skills.split(',').map(s => s.trim()).filter(Boolean), [skills]);
  const parsedLanguages = useMemo(() => languages.split(',').map(s => s.trim()).filter(Boolean), [languages]);

  const handleSave = async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      if (profile) {
        const payload: UpdateAgentProfileRequest = {
          skills: parsedSkills,
          languages: parsedLanguages,
          maxConcurrentTickets: maxTickets,
          availability: {
            autoAssignment: autoAssign,
            workingHours: { timezone },
          },
          preferences: { displayName, bio },
        };
        const updated = await agentApi.updateAgentProfile(targetUserId, payload);
        setProfile(updated);
      } else {
        const payload: CreateAgentProfileRequest = {
          userId: targetUserId,
          displayName,
          bio,
          skills: parsedSkills,
          languages: parsedLanguages,
          timezone,
          maxConcurrentTickets: maxTickets,
          autoAssign,
        };
        const created = await agentApi.createAgentProfile(payload);
        setProfile(created);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="premium-card">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{t('profile.title', { fallback: 'Agent Profile' })}</CardTitle>
        <CardDescription className="text-slate-600 dark:text-slate-400">{t('profile.subtitle', { fallback: 'Helps intelligent routing match tickets to you' })}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Display Name</Label>
            <Input 
              value={displayName} 
              onChange={(e) => setDisplayName(e.target.value)} 
              placeholder="e.g., Jane D." 
              className="rounded-lg focus-ring"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Timezone</Label>
            <Input 
              value={timezone} 
              onChange={(e) => setTimezone(e.target.value)} 
              placeholder="e.g., Europe/Paris" 
              className="rounded-lg focus-ring"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bio</Label>
          <Textarea 
            value={bio} 
            onChange={(e) => setBio(e.target.value)} 
            rows={3} 
            className="rounded-lg focus-ring"
            placeholder="Tell us about your expertise and approach to customer support"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Skills (comma separated)</Label>
            <Input 
              value={skills} 
              onChange={(e) => setSkills(e.target.value)} 
              placeholder="technical, billing, onboarding" 
              className="rounded-lg focus-ring"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {parsedSkills.map((s) => (
                <Badge key={s} variant="secondary" className="rounded-md text-xs px-2 py-1">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Languages (comma separated)</Label>
            <Input 
              value={languages} 
              onChange={(e) => setLanguages(e.target.value)} 
              placeholder="en, fr, ar" 
              className="rounded-lg focus-ring"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {parsedLanguages.map((s) => (
                <Badge key={s} variant="secondary" className="rounded-md text-xs px-2 py-1">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Max concurrent tickets</Label>
            <Input 
              type="number" 
              min={1} 
              max={20} 
              value={maxTickets} 
              onChange={(e) => setMaxTickets(parseInt(e.target.value || '1'))} 
              className="rounded-lg focus-ring"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Maximum number of tickets you can handle simultaneously
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Auto-assign</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Allow automatic ticket assignment
              </p>
            </div>
            <Switch 
              checked={autoAssign} 
              onCheckedChange={(v) => setAutoAssign(Boolean(v))} 
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="btn-gradient rounded-lg px-6"
          >
            {loading ? 'Saving...' : (profile ? 'Update Profile' : 'Create Profile')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


