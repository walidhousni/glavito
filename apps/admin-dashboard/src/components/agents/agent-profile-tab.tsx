'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Clock,
  Briefcase,
  Award,
  Edit,
  Save,
  X,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import type { AgentProfile } from '@/lib/api/team';

interface AgentProfileTabProps {
  agent: AgentProfile;
}

export function AgentProfileTab({ agent }: AgentProfileTabProps) {
  const t = useTranslations('agents');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: agent.displayName || '',
    bio: agent.bio || '',
    skills: agent.skills.join(', '),
    languages: agent.languages.join(', '),
    timezone: agent.timezone || '',
  });

  const handleSave = () => {
    // TODO: Implement save logic
    console.log('Saving:', formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      displayName: agent.displayName || '',
      bio: agent.bio || '',
      skills: agent.skills.join(', '),
      languages: agent.languages.join(', '),
      timezone: agent.timezone || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card className="agent-detail-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('personalInformation', { fallback: 'Personal Information' })}
            </CardTitle>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              {t('edit', { fallback: 'Edit' })}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                {t('cancel', { fallback: 'Cancel' })}
              </Button>
              <Button size="sm" onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Save className="h-4 w-4 mr-2" />
                {t('save', { fallback: 'Save' })}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label>{t('displayName', { fallback: 'Display Name' })}</Label>
                <Input
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder={t('displayNamePlaceholder', { fallback: 'Enter display name' })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('bio', { fallback: 'Bio' })}</Label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder={t('bioPlaceholder', { fallback: 'Tell us about yourself' })}
                  rows={4}
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">{t('fullName', { fallback: 'Full Name' })}</div>
                    <div className="font-medium">
                      {`${agent.user?.firstName ?? ''} ${agent.user?.lastName ?? ''}`.trim() || 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">{t('email', { fallback: 'Email' })}</div>
                    <div className="font-medium">{agent.user?.email ?? 'N/A'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">{t('timezone', { fallback: 'Timezone' })}</div>
                    <div className="font-medium">{agent.timezone || 'Not specified'}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">{t('status', { fallback: 'Status' })}</div>
                    <Badge variant="default" className="capitalize">
                      {agent.availability}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">{t('role', { fallback: 'Role' })}</div>
                    <div className="font-medium capitalize">{agent.user?.status ?? 'Active'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isEditing && agent.bio && (
            <>
              <Separator />
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  {t('bio', { fallback: 'Bio' })}
                </div>
                <p className="text-sm">{agent.bio}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Skills & Languages */}
      <Card className="agent-detail-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {t('skillsAndLanguages', { fallback: 'Skills & Languages' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label>{t('skills', { fallback: 'Skills' })}</Label>
                <Input
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  placeholder={t('skillsPlaceholder', { fallback: 'e.g., Technical, Billing, Support' })}
                />
                <p className="text-xs text-muted-foreground">
                  {t('skillsHelp', { fallback: 'Separate skills with commas' })}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t('languages', { fallback: 'Languages' })}</Label>
                <Input
                  value={formData.languages}
                  onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                  placeholder={t('languagesPlaceholder', { fallback: 'e.g., English, Spanish, French' })}
                />
                <p className="text-xs text-muted-foreground">
                  {t('languagesHelp', { fallback: 'Separate languages with commas' })}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-3">
                  {t('skills', { fallback: 'Skills' })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {agent.skills.length > 0 ? (
                    agent.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800"
                      >
                        {skill.replace('_', ' ')}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t('noSkills', { fallback: 'No skills specified' })}
                    </span>
                  )}
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-3">
                  {t('languages', { fallback: 'Languages' })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {agent.languages.length > 0 ? (
                    agent.languages.map((lang) => (
                      <Badge
                        key={lang}
                        variant="outline"
                        className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800"
                      >
                        {lang.toUpperCase()}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t('noLanguages', { fallback: 'No languages specified' })}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Work Settings */}
      <Card className="agent-detail-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            {t('workSettings', { fallback: 'Work Settings' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                {t('maxConcurrentTickets', { fallback: 'Max Concurrent Tickets' })}
              </div>
              <div className="text-2xl font-bold">{agent.maxConcurrentTickets}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                {t('autoAssignment', { fallback: 'Auto Assignment' })}
              </div>
              <Badge variant={agent.autoAssign ? 'default' : 'secondary'} className="text-base px-4 py-1">
                {agent.autoAssign ? t('enabled', { fallback: 'Enabled' }) : t('disabled', { fallback: 'Disabled' })}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

