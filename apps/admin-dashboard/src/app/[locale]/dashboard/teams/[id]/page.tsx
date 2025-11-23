'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { teamApi, type Team, type TeamMember } from '@/lib/api/team';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Link } from '@/i18n.config';

export default function TeamDetailsPage() {
  const params = useParams();
  const teamId = String((params as Record<string, string | string[]>)?.id || '');
  const t = useTranslations('teams');

  const [loading, setLoading] = React.useState<boolean>(false);
  const [team, setTeam] = React.useState<Team | null>(null);
  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [settingsDraft, setSettingsDraft] = React.useState<Record<string, any>>({});
  const [autoAssign, setAutoAssign] = React.useState<boolean>(true);

  const [inviteUserId, setInviteUserId] = React.useState<string>('');
  const [inviteRole, setInviteRole] = React.useState<'member' | 'lead' | 'admin'>('member');
  const [availableUsers, setAvailableUsers] = React.useState<Array<{ id: string; email: string; firstName: string; lastName: string }>>([]);

  const load = React.useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const [tData, mData, avail] = await Promise.all([
        teamApi.getTeam(teamId),
        teamApi.getTeamMembers(teamId),
        teamApi.getAvailableUsers(teamId).catch(() => []),
      ]);
      setTeam(tData);
      try {
        const s = (tData as any)?.settings || {};
        setSettingsDraft(s);
        setAutoAssign(Boolean(s.autoAssign ?? true));
      } catch { /* noop */ }
      setMembers(Array.isArray(mData) ? mData : []);
      setAvailableUsers((Array.isArray(avail) ? avail : []).map((u: any) => ({ id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName })));
    } catch {
      setTeam(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  React.useEffect(() => { void load(); }, [load]);

  const handleInvite = async () => {
    if (!teamId || !inviteUserId) return;
    setLoading(true);
    try {
      await teamApi.addTeamMember(teamId, { userId: inviteUserId, role: inviteRole });
      setInviteUserId('');
      await load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text">{team?.name || t('details.title')}</h1>
            <p className="text-slate-600 dark:text-slate-400">{team?.description || t('details.subtitle')}</p>
          </div>
          <Badge className="rounded-xl px-3 py-1" variant="outline">{members.length} {t('members')}</Badge>
        </div>
      </motion.div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="rounded-2xl">
          <TabsTrigger value="members">{t('tabs.members')}</TabsTrigger>
          <TabsTrigger value="settings">{t('tabs.settings')}</TabsTrigger>
          <TabsTrigger value="automation">{t('tabs.automation')}</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="premium-card border-0 shadow-2xl rounded-3xl lg:col-span-2">
              <CardHeader>
                <CardTitle>{t('membersList')}</CardTitle>
                <CardDescription>{t('membersDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('table.name')}</TableHead>
                        <TableHead>{t('table.email')}</TableHead>
                        <TableHead>{t('table.role')}</TableHead>
                        <TableHead className="text-right">{t('table.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.user.firstName} {m.user.lastName}</TableCell>
                          <TableCell>{m.user.email}</TableCell>
                          <TableCell><Badge className="rounded-full px-3 py-1" variant="secondary">{m.role}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" className="rounded-xl">{t('actions.view')}</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {members.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-500 py-8">{t('empty')}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card border-0 shadow-2xl rounded-3xl">
              <CardHeader>
                <CardTitle>{t('invite.title')}</CardTitle>
                <CardDescription>{t('invite.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('invite.selectUser')}</label>
                    <Select value={inviteUserId} onValueChange={setInviteUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('invite.userPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('invite.role')}</label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('invite.rolePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">{t('roles.member')}</SelectItem>
                        <SelectItem value="lead">{t('roles.lead')}</SelectItem>
                        <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex justify-end">
                    <Button disabled={loading || !inviteUserId} onClick={() => void handleInvite()} className="rounded-2xl px-6">
                      {loading ? t('invite.inviting') : t('invite.invite')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card className="premium-card border-0 shadow-2xl rounded-3xl">
            <CardHeader>
              <CardTitle>{t('settings.title')}</CardTitle>
              <CardDescription>{t('settings.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between rounded-2xl border p-4">
                  <div>
                    <div className="font-medium">{t('settings.autoAssign.title')}</div>
                    <div className="text-sm text-slate-500">{t('settings.autoAssign.desc')}</div>
                  </div>
                  <Switch checked={autoAssign} onCheckedChange={(v) => setAutoAssign(Boolean(v))} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.color')}</label>
                    <Input value={settingsDraft.color || ''} onChange={(e) => setSettingsDraft({ ...settingsDraft, color: e.target.value })} placeholder="#3b82f6" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.description')}</label>
                    <Input value={settingsDraft.description || team?.description || ''} onChange={(e) => setSettingsDraft({ ...settingsDraft, description: e.target.value })} placeholder={t('settings.descriptionPlaceholder') as string} />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" className="rounded-2xl" onClick={() => { setSettingsDraft((team as any)?.settings || {}); setAutoAssign(Boolean(((team as any)?.settings || {}).autoAssign ?? true)); }}>{t('settings.reset')}</Button>
                  <Button className="rounded-2xl" disabled={!team} onClick={async () => {
                    if (!team) return;
                    try {
                      await teamApi.updateTeam(team.id, { description: settingsDraft.description ?? team.description, color: settingsDraft.color ?? team.color, settings: { ...(settingsDraft || {}), autoAssign } });
                      await load();
                    } catch { /* noop */ }
                  }}>{t('settings.save')}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card className="premium-card border-0 shadow-2xl rounded-3xl">
            <CardHeader>
              <CardTitle>{t('automation.title')}</CardTitle>
              <CardDescription>{t('automation.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                  {t('automation.description')}
                </div>
                <Link href="/dashboard/workflows">
                  <Button className="rounded-2xl px-6">{t('automation.openBuilder')}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


