'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useTeams } from '@/lib/hooks/use-team';
import type { CreateTeamRequest, Team } from '@/lib/api/team';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
// (no select used here; keep imports minimal)
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Link } from '@/i18n.config';
import { Plus, Edit, Trash2, Users } from 'lucide-react';

export function TeamsPanel() {
  const t = useTranslations('teams');
  const { teams, isLoading, refetch, createTeam, updateTeam, deleteTeam } = useTeams();

  const [search, setSearch] = React.useState<string>('');
  const [isCreateOpen, setIsCreateOpen] = React.useState<boolean>(false);
  const [creating, setCreating] = React.useState<boolean>(false);
  const [editingTeam, setEditingTeam] = React.useState<Team | null>(null);
  const [isEditOpen, setIsEditOpen] = React.useState<boolean>(false);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState<boolean>(false);
  const [deleting, setDeleting] = React.useState<boolean>(false);

  const [newTeam, setNewTeam] = React.useState<CreateTeamRequest>({
    name: '',
    description: '',
    color: '#3B82F6',
    isDefault: false,
    settings: {},
  });

  const filtered = (teams || []).filter((t) =>
    (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate() {
    try {
      setCreating(true);
      await createTeam(newTeam);
      setIsCreateOpen(false);
      setNewTeam({ name: '', description: '', color: '#3B82F6', isDefault: false, settings: {} });
      await refetch();
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingTeam) return;
    try {
      setSaving(true);
      await updateTeam(editingTeam.id, {
        name: editingTeam.name,
        description: editingTeam.description,
        color: editingTeam.color,
        isDefault: editingTeam.isDefault,
      });
      setIsEditOpen(false);
      await refetch();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingTeam) return;
    try {
      setDeleting(true);
      await deleteTeam(editingTeam.id);
      setIsDeleteOpen(false);
      setIsEditOpen(false);
      setEditingTeam(null);
      await refetch();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold">{t('title', { fallback: 'Teams' })}</h3>
          <p className="text-muted-foreground">{t('subtitle', { fallback: 'Manage your support teams and their members' })}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl">
              <Plus className="h-4 w-4 mr-2" />
              {t('actions.createTeam', { fallback: 'Create Team' })}
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>{t('create.title', { fallback: 'Create New Team' })}</DialogTitle>
              <DialogDescription>{t('create.description', { fallback: 'Create a new support team to organize your agents.' })}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="team-name">{t('fields.name', { fallback: 'Team Name' })}</Label>
                <Input id="team-name" value={newTeam.name} onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="team-desc">{t('fields.description', { fallback: 'Description' })}</Label>
                <Textarea id="team-desc" value={newTeam.description} onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="team-color">{t('fields.color', { fallback: 'Team Color' })}</Label>
                <Input id="team-color" type="color" value={newTeam.color} onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="team-default">{t('labels.default', { fallback: 'Default' })}</Label>
                <Switch id="team-default" checked={!!newTeam.isDefault} onCheckedChange={(v) => setNewTeam({ ...newTeam, isDefault: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">
                {t('actions.cancel', { fallback: 'Cancel' })}
              </Button>
              <Button onClick={() => void handleCreate()} disabled={!newTeam.name || creating} className="rounded-xl">
                {creating ? t('actions.saving', { fallback: 'Saving…' }) : t('actions.create', { fallback: 'Create' })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="premium-card border-0 shadow-2xl rounded-3xl">
        <CardHeader>
          <CardTitle>{t('membersList', { fallback: 'Teams' })}</CardTitle>
          <CardDescription>{t('membersDescription', { fallback: 'All teams in your organization' })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Input placeholder={t('placeholders.searchTeams', { fallback: 'Search teams…' }) as string} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm rounded-2xl" />
              <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isLoading} className="rounded-2xl">
                {t('actions.refresh', { fallback: 'Refresh' })}
              </Button>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((team) => (
                <Card key={team.id} className="border rounded-2xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color || '#3B82F6' }} />
                        <CardTitle className="text-base">{team.name}</CardTitle>
                      </div>
                      {team.isDefault && (
                        <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">{t('labels.default', { fallback: 'Default' })}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{team.description || t('noDescription', { fallback: 'No description' })}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{(team.members || []).length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/teams/${team.id}`}>
                          <Button variant="outline" size="sm" className="rounded-xl">
                            {t('actions.view', { fallback: 'View' })}
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => { setEditingTeam(team); setIsEditOpen(true); }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {t('actions.editTeam', { fallback: 'Edit' })}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!isLoading && filtered.length === 0 && (
                <div className="col-span-full text-sm text-muted-foreground">
                  {t('empty', { fallback: 'No teams found' })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('actions.editTeam', { fallback: 'Edit Team' })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">{t('fields.name', { fallback: 'Team Name' })}</Label>
              <Input id="edit-name" value={editingTeam?.name || ''} onChange={(e) => setEditingTeam((p) => (p ? { ...p, name: e.target.value } : p))} />
            </div>
            <div>
              <Label htmlFor="edit-desc">{t('fields.description', { fallback: 'Description' })}</Label>
              <Textarea id="edit-desc" value={editingTeam?.description || ''} onChange={(e) => setEditingTeam((p) => (p ? { ...p, description: e.target.value } : p))} />
            </div>
            <div>
              <Label htmlFor="edit-color">{t('fields.color', { fallback: 'Team Color' })}</Label>
              <Input id="edit-color" type="color" value={editingTeam?.color || '#3B82F6'} onChange={(e) => setEditingTeam((p) => (p ? { ...p, color: e.target.value } : p))} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-default">{t('labels.default', { fallback: 'Default' })}</Label>
              <Switch id="edit-default" checked={!!editingTeam?.isDefault} onCheckedChange={(v) => setEditingTeam((p) => (p ? { ...p, isDefault: v } : p))} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Button variant="destructive" onClick={() => setIsDeleteOpen(true)} className="rounded-xl">
                <Trash2 className="h-4 w-4 mr-2" />
                {t('actions.deleteTeam', { fallback: 'Delete' })}
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">
                  {t('actions.cancel', { fallback: 'Cancel' })}
                </Button>
                <Button onClick={() => void handleSaveEdit()} disabled={!editingTeam?.name || saving} className="rounded-xl">
                  {saving ? t('actions.saving', { fallback: 'Saving…' }) : t('actions.save', { fallback: 'Save' })}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('actions.deleteTeam', { fallback: 'Delete Team' })}</DialogTitle>
            <DialogDescription>
              {t('confirmations.deleteTeam', { fallback: 'Are you sure you want to delete this team? This action cannot be undone.' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="rounded-xl">
              {t('actions.cancel', { fallback: 'Cancel' })}
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting} className="rounded-xl">
              {deleting ? t('actions.deleting', { fallback: 'Deleting…' }) : t('actions.delete', { fallback: 'Delete' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


