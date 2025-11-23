'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { 
  FaPlus,
  FaSearch,
  FaUsers,
  FaCog,
  FaEdit,
  FaTrash,
  FaUserTie,
  FaEye
} from 'react-icons/fa';
import { MdMoreHoriz } from 'react-icons/md';
import { Skeleton } from '@/components/ui/skeleton';

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
import { Separator } from '@/components/ui/separator';
import { Link } from '@/i18n.config';

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <Skeleton className="h-6 w-32 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
              <FaUsers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              {t('title', { fallback: 'Teams Management' })}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[42px]">
            {t('subtitle', { fallback: 'Manage your support teams and their members' })}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-9 px-4 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm">
              <FaPlus className="h-3.5 w-3.5 mr-2" />
              {t('actions.createTeam', { fallback: 'Create Team' })}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md p-0 gap-0 bg-background border-0 shadow-xl rounded-xl">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
              <DialogTitle className="text-lg font-semibold text-foreground">
                {t('create.title', { fallback: 'Create New Team' })}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t('create.description', { fallback: 'Create a new support team to organize your agents and manage tickets.' })}
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium">{t('fields.name', { fallback: 'Team Name' })}</Label>
                <Input
                  id="name"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder={t('placeholders.teamName', { fallback: 'Enter team name' })}
                  className="h-9 border-0 shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-medium">{t('fields.description', { fallback: 'Description' })}</Label>
                <Textarea
                  id="description"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  placeholder={t('placeholders.teamDescription', { fallback: 'Enter team description' })}
                  className="min-h-[80px] border-0 shadow-sm resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color" className="text-xs font-medium">{t('fields.color', { fallback: 'Team Color' })}</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="color"
                    type="color"
                    value={newTeam.color}
                    onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
                    className="h-10 w-20 border-0 shadow-sm rounded-lg cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={newTeam.color}
                    onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
                    className="h-9 flex-1 border-0 shadow-sm"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="px-6 pb-6 pt-0">
              <Button 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)} 
                className="h-9 text-xs border-0 shadow-sm"
              >
                {t('actions.cancel', { fallback: 'Cancel' })}
              </Button>
              <Button 
                onClick={handleCreateTeam} 
                disabled={!newTeam.name} 
                className="h-9 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm"
              >
                {t('actions.create', { fallback: 'Create Team' })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('placeholders.searchTeams', { fallback: 'Search teams...' })}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-9 border-0 shadow-sm"
        />
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeams.map((team, index) => {
          const teamLead = (team.members ?? []).find(m => m.role === 'lead');
          return (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
                <div className="h-1 w-full" style={{ background: team.color || '#3B82F6' }} />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div 
                        className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: team.color || '#3B82F6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold text-foreground mb-1.5 line-clamp-1">
                          {team.name}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {team.isDefault && (
                            <Badge variant="secondary" className="text-xs border-0 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                              {t('labels.default', { fallback: 'Default' })}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs border-0 bg-muted">
                            {(team.members?.length ?? 0)} {t('labels.members', { fallback: 'members' })}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                          <MdMoreHoriz className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          onClick={() => { 
                            setSelectedTeam(team); 
                            setEditForm({ 
                              name: team.name, 
                              description: team.description || '', 
                              color: team.color || '#3B82F6', 
                              isDefault: !!team.isDefault 
                            }); 
                            setIsEditDialogOpen(true); 
                          }}
                          className="text-xs"
                        >
                          <FaEdit className="h-3.5 w-3.5 mr-2 text-blue-600 dark:text-blue-400" />
                          {t('actions.editTeam', { fallback: 'Edit Team' })}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => { 
                            setSelectedTeam(team); 
                            try { 
                              setSettingsForm(JSON.stringify(((team as unknown) as { settings?: Record<string, unknown> }).settings || {}, null, 2)); 
                            } catch { 
                              setSettingsForm('{}'); 
                            } 
                            setIsSettingsDialogOpen(true); 
                          }}
                          className="text-xs"
                        >
                          <FaCog className="h-3.5 w-3.5 mr-2 text-orange-600 dark:text-orange-400" />
                          {t('actions.settings', { fallback: 'Settings' })}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-xs text-red-600 dark:text-red-400" 
                          onClick={() => { 
                            setSelectedTeam(team); 
                            setIsDeleteDialogOpen(true); 
                          }}
                        >
                          <FaTrash className="h-3.5 w-3.5 mr-2" />
                          {t('actions.deleteTeam', { fallback: 'Delete Team' })}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {team.description && (
                    <CardDescription className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {team.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Team Members Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-medium text-foreground">
                          {t('labels.members', { fallback: 'Members' })}
                        </span>
                        <Link href={`/dashboard/teams/${team.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs">
                            <FaEye className="h-3 w-3 mr-1.5" />
                            {t('actions.viewTeam', { fallback: 'View' })}
                          </Button>
                        </Link>
                      </div>
                      <div className="flex -space-x-2">
                        {(team.members ?? []).slice(0, 5).map((member) => (
                          <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                            <AvatarImage src={member.user.avatar} />
                            <AvatarFallback className="text-[10px] bg-muted">
                              {member.user.firstName[0]}{member.user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {(team.members?.length ?? 0) > 5 && (
                          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                            <span className="text-[10px] font-medium text-muted-foreground">
                              +{(team.members?.length ?? 0) - 5}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Team Lead */}
                    {teamLead && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50">
                            <FaUserTie className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-muted-foreground mb-0.5">
                              {t('labels.teamLead', { fallback: 'Team Lead' })}
                            </div>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={teamLead.user.avatar} />
                                <AvatarFallback className="text-[10px]">
                                  {teamLead.user.firstName[0]}
                                  {teamLead.user.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium text-foreground truncate">
                                {teamLead.user.firstName} {teamLead.user.lastName}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs border-0 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                          {t('labels.lead', { fallback: 'Lead' })}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredTeams.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-4 mx-auto">
            <FaUsers className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">
            No teams found
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by creating your first team.'}
          </p>
          {!searchQuery && (
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="h-9 px-4 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm"
            >
              <FaPlus className="h-3.5 w-3.5 mr-2" />
              Create Team
            </Button>
          )}
        </div>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md p-0 gap-0 bg-background border-0 shadow-xl rounded-xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <DialogTitle className="text-lg font-semibold text-foreground">
              {t('actions.editTeam', { fallback: 'Edit Team' })}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-xs font-medium">{t('fields.name', { fallback: 'Team Name' })}</Label>
              <Input 
                id="edit-name" 
                value={editForm.name} 
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} 
                className="h-9 border-0 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-xs font-medium">{t('fields.description', { fallback: 'Description' })}</Label>
              <Textarea 
                id="edit-description" 
                value={editForm.description} 
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} 
                className="min-h-[80px] border-0 shadow-sm resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color" className="text-xs font-medium">{t('fields.color', { fallback: 'Team Color' })}</Label>
              <div className="flex items-center gap-3">
                <Input 
                  id="edit-color" 
                  type="color" 
                  value={editForm.color} 
                  onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))} 
                  className="h-10 w-20 border-0 shadow-sm rounded-lg cursor-pointer"
                />
                <Input 
                  type="text" 
                  value={editForm.color} 
                  onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))} 
                  className="h-9 flex-1 border-0 shadow-sm"
                  placeholder="#3B82F6"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <Label htmlFor="edit-default" className="text-sm font-medium text-foreground">
                {t('labels.default', { fallback: 'Default Team' })}
              </Label>
              <Switch 
                id="edit-default" 
                checked={editForm.isDefault} 
                onCheckedChange={(v) => setEditForm((p) => ({ ...p, isDefault: v }))} 
              />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 pt-0">
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              className="h-9 text-xs border-0 shadow-sm"
            >
              {t('actions.cancel', { fallback: 'Cancel' })}
            </Button>
            <Button 
              onClick={async () => { 
                if (!selectedTeam) return; 
                try { 
                  setSaving(true); 
                  await updateTeam(selectedTeam.id, { 
                    name: editForm.name, 
                    description: editForm.description, 
                    color: editForm.color, 
                    isDefault: editForm.isDefault 
                  }); 
                  setIsEditDialogOpen(false); 
                } finally { 
                  setSaving(false); 
                } 
              }} 
              disabled={saving || !editForm.name.trim()}
              className="h-9 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm"
            >
              {saving ? t('actions.saving', { fallback: 'Saving…' }) : t('actions.save', { fallback: 'Save' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 bg-background border-0 shadow-xl rounded-xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/50">
                <FaCog className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">
                  {t('actions.settings', { fallback: 'Settings' })}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  {t('descriptions.teamSettings', { fallback: 'Edit team JSON settings' })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 py-4">
            <Textarea 
              rows={12} 
              value={settingsForm} 
              onChange={(e) => setSettingsForm(e.target.value)} 
              className="font-mono text-xs border-0 shadow-sm resize-none"
            />
          </div>
          <DialogFooter className="px-6 pb-6 pt-0">
            <Button 
              variant="outline" 
              onClick={() => setIsSettingsDialogOpen(false)}
              className="h-9 text-xs border-0 shadow-sm"
            >
              {t('actions.cancel', { fallback: 'Cancel' })}
            </Button>
            <Button 
              onClick={async () => { 
                if (!selectedTeam) return; 
                try { 
                  setSaving(true); 
                  const parsed = settingsForm.trim() ? JSON.parse(settingsForm) : {}; 
                  await updateTeam(selectedTeam.id, { settings: parsed as Record<string, unknown> }); 
                  setIsSettingsDialogOpen(false); 
                } catch (e) { 
                  console.error('Invalid JSON for team settings', e); 
                } finally { 
                  setSaving(false); 
                } 
              }} 
              disabled={saving}
              className="h-9 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm"
            >
              {saving ? t('actions.saving', { fallback: 'Saving…' }) : t('actions.save', { fallback: 'Save' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md p-0 gap-0 bg-background border-0 shadow-xl rounded-xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50">
                <FaTrash className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">
                  {t('actions.deleteTeam', { fallback: 'Delete Team' })}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  {t('confirmations.deleteTeam', { fallback: 'Are you sure you want to delete this team? This action cannot be undone.' })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="px-6 pb-6 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="h-9 text-xs border-0 shadow-sm"
            >
              {t('actions.cancel', { fallback: 'Cancel' })}
            </Button>
            <Button 
              variant="destructive" 
              onClick={async () => { 
                if (!selectedTeam) return; 
                try { 
                  setDeleting(true); 
                  await deleteTeam(selectedTeam.id); 
                  setIsDeleteDialogOpen(false); 
                } finally { 
                  setDeleting(false); 
                } 
              }} 
              disabled={deleting}
              className="h-9 text-xs border-0 shadow-sm bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              {deleting ? t('actions.deleting', { fallback: 'Deleting…' }) : t('actions.delete', { fallback: 'Delete' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}