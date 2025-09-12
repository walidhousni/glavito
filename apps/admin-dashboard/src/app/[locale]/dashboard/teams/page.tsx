'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  Plus, 
  Search, 
  Users, 
  Settings, 
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTeams } from '@/lib/hooks/use-team';
import { CreateTeamRequest, Team } from '@/lib/api/team';
import { Switch } from '@/components/ui/switch';

// Using real API via hook

export default function TeamsPage() {
  const t = useTranslations('teams');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState<CreateTeamRequest>({
    name: '',
    description: '',
    color: '#3B82F6',
    isDefault: false,
    settings: {}
  });

  const { teams, isLoading, createTeam, updateTeam, deleteTeam } = useTeams();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; description?: string; color?: string; isDefault: boolean }>({
    name: '',
    description: '',
    color: '#3B82F6',
    isDefault: false,
  });
  const [settingsForm, setSettingsForm] = useState<string>('{}');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filteredTeams = teams.filter((team: Team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTeam = async () => {
    try {
      await createTeam(newTeam);
      setIsCreateDialogOpen(false);
      setNewTeam({
        name: '',
        description: '',
        color: '#3B82F6',
        isDefault: false,
        settings: {}
      });
    } catch (error) {
      console.error('Failed to create team:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('title', { fallback: 'Teams Management' })}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('subtitle', { fallback: 'Manage your support teams and their members' })}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              {t('actions.createTeam', { fallback: 'Create Team' })}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('create.title', { fallback: 'Create New Team' })}</DialogTitle>
              <DialogDescription>
                {t('create.description', { fallback: 'Create a new support team to organize your agents and manage tickets.' })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('fields.name', { fallback: 'Team Name' })}</Label>
                <Input
                  id="name"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder={t('placeholders.teamName', { fallback: 'Enter team name' })}
                />
              </div>
              <div>
                <Label htmlFor="description">{t('fields.description', { fallback: 'Description' })}</Label>
                <Textarea
                  id="description"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  placeholder={t('placeholders.teamDescription', { fallback: 'Enter team description' })}
                />
              </div>
              <div>
                <Label htmlFor="color">{t('fields.color', { fallback: 'Team Color' })}</Label>
                <Input
                  id="color"
                  type="color"
                  value={newTeam.color}
                  onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {t('actions.cancel', { fallback: 'Cancel' })}
              </Button>
              <Button onClick={handleCreateTeam} disabled={!newTeam.name}>
                {t('actions.create', { fallback: 'Create Team' })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search teams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team, index) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      {team.isDefault && (
                        <Badge variant="secondary" className="mt-1">
                          {t('labels.default', { fallback: 'Default' })}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedTeam(team); setEditForm({ name: team.name, description: team.description || '', color: team.color || '#3B82F6', isDefault: !!team.isDefault }); setIsEditDialogOpen(true); }}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('actions.editTeam', { fallback: 'Edit Team' })}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSelectedTeam(team); try { setSettingsForm(JSON.stringify((team as any).settings || {}, null, 2)); } catch { setSettingsForm('{}'); } setIsSettingsDialogOpen(true); }}>
                        <Settings className="h-4 w-4 mr-2" />
                        {t('actions.settings', { fallback: 'Settings' })}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedTeam(team); setIsDeleteDialogOpen(true); }}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('actions.deleteTeam', { fallback: 'Delete Team' })}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription>{team.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Team Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {(team.members?.length ?? 0)} {t('labels.members', { fallback: 'members' })}
                      </span>
                    </div>
                    <div className="text-gray-500">
                      Created {new Date(team.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Team Members Preview */}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('labels.members', { fallback: 'Members' })}
                      </span>
                    </div>
                    <div className="flex -space-x-2">
                      {(team.members ?? []).slice(0, 4).map((member) => (
                        <Avatar key={member.id} className="h-8 w-8 border-2 border-white dark:border-gray-800">
                          <AvatarImage src={member.user.avatar} />
                          <AvatarFallback className="text-xs">
                            {member.user.firstName[0]}{member.user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {(team.members?.length ?? 0) > 4 && (
                        <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            +{(team.members?.length ?? 0) - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Team Lead */}
                  {(team.members ?? []).find(m => m.role === 'lead') && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('labels.teamLead', { fallback: 'Team Lead' })}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={(team.members ?? []).find(m => m.role === 'lead')?.user.avatar} />
                          <AvatarFallback className="text-xs">
                            {(team.members ?? []).find(m => m.role === 'lead')?.user.firstName[0]}
                            {(team.members ?? []).find(m => m.role === 'lead')?.user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {(team.members ?? []).find(m => m.role === 'lead')?.user.firstName} {(team.members ?? []).find(m => m.role === 'lead')?.user.lastName}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No teams found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by creating your first team.'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          )}
        </div>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('actions.editTeam', { fallback: 'Edit Team' })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">{t('fields.name', { fallback: 'Team Name' })}</Label>
              <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="edit-description">{t('fields.description', { fallback: 'Description' })}</Label>
              <Textarea id="edit-description" value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="edit-color">{t('fields.color', { fallback: 'Team Color' })}</Label>
              <Input id="edit-color" type="color" value={editForm.color} onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-default">{t('labels.default', { fallback: 'Default' })}</Label>
              <Switch id="edit-default" checked={editForm.isDefault} onCheckedChange={(v) => setEditForm((p) => ({ ...p, isDefault: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t('actions.cancel', { fallback: 'Cancel' })}</Button>
            <Button onClick={async () => { if (!selectedTeam) return; try { setSaving(true); await updateTeam(selectedTeam.id, { name: editForm.name, description: editForm.description, color: editForm.color, isDefault: editForm.isDefault }); setIsEditDialogOpen(false); } finally { setSaving(false); } }} disabled={saving || !editForm.name.trim()}>
              {saving ? t('actions.saving', { fallback: 'Saving…' }) : t('actions.save', { fallback: 'Save' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('actions.settings', { fallback: 'Settings' })}</DialogTitle>
            <DialogDescription>
              {t('descriptions.teamSettings', { fallback: 'Edit team JSON settings' })}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Textarea rows={10} value={settingsForm} onChange={(e) => setSettingsForm(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>{t('actions.cancel', { fallback: 'Cancel' })}</Button>
            <Button onClick={async () => { if (!selectedTeam) return; try { setSaving(true); const parsed = settingsForm.trim() ? JSON.parse(settingsForm) : {}; await updateTeam(selectedTeam.id, { settings: parsed as any }); setIsSettingsDialogOpen(false); } catch (e) { console.error('Invalid JSON for team settings', e); } finally { setSaving(false); } }} disabled={saving}>
              {saving ? t('actions.saving', { fallback: 'Saving…' }) : t('actions.save', { fallback: 'Save' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('actions.deleteTeam', { fallback: 'Delete Team' })}</DialogTitle>
            <DialogDescription>
              {t('confirmations.deleteTeam', { fallback: 'Are you sure you want to delete this team? This action cannot be undone.' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>{t('actions.cancel', { fallback: 'Cancel' })}</Button>
            <Button variant="destructive" onClick={async () => { if (!selectedTeam) return; try { setDeleting(true); await deleteTeam(selectedTeam.id); setIsDeleteDialogOpen(false); } finally { setDeleting(false); } }} disabled={deleting}>
              {deleting ? t('actions.deleting', { fallback: 'Deleting…' }) : t('actions.delete', { fallback: 'Delete' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}