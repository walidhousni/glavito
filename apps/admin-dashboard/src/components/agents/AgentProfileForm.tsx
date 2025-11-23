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
import { Separator } from '@/components/ui/separator';
import { agentApi, type AgentProfile, type UpdateAgentProfileRequest, type CreateAgentProfileRequest } from '@/lib/api/team';
import { useAuthStore } from '@/lib/store/auth-store';
import { 
  User, 
  Globe, 
  MessageSquare, 
  Languages, 
  Settings, 
  Zap, 
  Clock,
  CheckCircle,
  Sparkles,
  Target
} from 'lucide-react';

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
    <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card via-card to-muted/20">
      
      <CardContent className="p-8 space-y-8">
        {/* Personal Information Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">{t('profile.personalInformation')}</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                {t('profile.displayName')}
              </Label>
              <Input 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)} 
                placeholder={t('profile.displayNamePlaceholder')} 
                className="h-12 text-base"
              />
              <p className="text-xs text-muted-foreground">
                {t('profile.displayNameDescription')}
              </p>
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                {t('profile.timezone')}
              </Label>
              <Input 
                value={timezone} 
                onChange={(e) => setTimezone(e.target.value)} 
                placeholder={t('profile.timezonePlaceholder')} 
                className="h-12 text-base"
              />
              <p className="text-xs text-muted-foreground">
                {t('profile.timezoneDescription')}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              {t('profile.bio')}
            </Label>
            <Textarea 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              rows={4} 
              className="resize-none text-base"
              placeholder={t('profile.bioPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">
              {t('profile.bioDescription')}
            </p>
          </div>
        </div>

        <Separator />

        {/* Skills & Languages Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">{t('profile.skillsAndLanguages')}</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-600" />
                    {t('profile.skills')}
                  </Label>
                  <Input 
                    value={skills} 
                    onChange={(e) => setSkills(e.target.value)} 
                    placeholder={t('profile.skillsPlaceholder')} 
                    className="h-12 text-base"
                  />
                  {parsedSkills.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {parsedSkills.map((s) => (
                          <Badge key={s} variant="secondary" className="px-3 py-1.5 text-sm font-medium">
                            <Target className="h-3 w-3 mr-1.5" />
                            {s}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('profile.skillsCount', { count: parsedSkills.length })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Languages className="h-4 w-4 text-blue-600" />
                    {t('profile.languages')}
                  </Label>
                  <Input 
                    value={languages} 
                    onChange={(e) => setLanguages(e.target.value)} 
                    placeholder={t('profile.languagesPlaceholder')} 
                    className="h-12 text-base"
                  />
                  {parsedLanguages.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {parsedLanguages.map((s) => (
                          <Badge key={s} variant="outline" className="px-3 py-1.5 text-sm font-medium">
                            <Languages className="h-3 w-3 mr-1.5" />
                            {s.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('profile.languagesCount', { count: parsedLanguages.length })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        {/* Availability & Preferences Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2">
            <Settings className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">{t('profile.availabilityAndPreferences')}</h3>
          </div>
          
          <Card className="bg-gradient-to-br from-muted/30 to-muted/10 border-2">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <Label className="text-base font-semibold">{t('profile.workloadManagement')}</Label>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">{t('profile.maxConcurrentTickets')}</Label>
                    <div className="flex items-center gap-4">
                      <Input 
                        type="number" 
                        min={1} 
                        max={20} 
                        value={maxTickets} 
                        onChange={(e) => setMaxTickets(parseInt(e.target.value || '1'))} 
                        className="h-12 text-base max-w-[120px]"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-muted-foreground">
                          {t('profile.currentLimit', { count: maxTickets })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('profile.recommendedRange')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-600" />
                    <Label className="text-base font-semibold">{t('profile.assignmentPreferences')}</Label>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-background border-2 border-dashed">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <Label className="text-sm font-semibold">{t('profile.autoAssignment')}</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('profile.autoAssignmentDescription')}
                      </p>
                    </div>
                    <Switch 
                      checked={autoAssign} 
                      onCheckedChange={(v) => setAutoAssign(Boolean(v))} 
                      className="data-[state=checked]:bg-green-600"
                    />
                  </div>
                  {autoAssign && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                        {t('profile.autoAssignmentEnabled')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Action Section */}
        <div className="flex items-center justify-between pt-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {profile ? t('profile.updateProfile') : t('profile.createProfile')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('profile.changesDescription')}
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={loading}
            size="lg"
            className="min-w-[140px] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t('profile.saving')}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {profile ? t('profile.updateProfileButton') : t('profile.createProfileButton')}
              </div>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


