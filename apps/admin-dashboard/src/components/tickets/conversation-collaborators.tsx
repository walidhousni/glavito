'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  UserPlus,
  X,
  Loader2,
  Search,
  User,
  Building2,
} from 'lucide-react';
import { conversationsApi } from '@/lib/api/conversations-client';
import { useToast } from '@/components/ui/toast';

interface Collaborator {
  id: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  role?: string;
  type: 'agent' | 'team';
}

interface Team {
  id: string;
  name: string;
  color?: string;
  memberCount?: number;
  members?: Array<{
    id: string;
    userId: string;
    user?: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      avatar?: string;
    };
  }>;
}

interface Agent {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    status: string;
  };
}

interface ConversationCollaboratorsProps {
  conversationId: string;
  conversation?: {
    teamId?: string | null;
    assignedAgentId?: string | null;
    team?: { id: string; name: string; color?: string } | null;
    assignedAgent?: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      avatar?: string;
    } | null;
  };
  onUpdate?: () => void;
}

export function ConversationCollaborators({
  conversationId,
  conversation,
  onUpdate,
}: ConversationCollaboratorsProps) {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'team' | 'agent'>('team');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Collaborator[]>([]);
  const [assignedAgent, setAssignedAgent] = useState<Collaborator | null>(null);

  // Load teams and agents
  const loadOptions = useCallback(async () => {
    try {
      const [teamsList, agentsList] = await Promise.all([
        conversationsApi.listTeams(true),
        conversationsApi.listTeams(true).then(async (teams) => {
          // Get all team members as potential agents
          const allMembers: Agent[] = [];
          for (const team of teams as Team[]) {
            try {
              const members = await conversationsApi.getTeamMembers(team.id);
              if (Array.isArray(members)) {
                members.forEach((member: { id: string; userId: string; user?: { id: string; firstName: string; lastName: string; email: string; avatar?: string; status: string } }) => {
                  if (member.user && !allMembers.find(a => a.userId === member.userId)) {
                    allMembers.push({
                      id: member.id,
                      userId: member.userId,
                      user: member.user,
                    });
                  }
                });
              }
            } catch {
              // Skip teams that fail
            }
          }
          return allMembers;
        }),
      ]);

      setTeams(Array.isArray(teamsList) ? teamsList : []);
      setAvailableAgents(Array.isArray(agentsList) ? agentsList : []);
    } catch (err) {
      console.error('Failed to load teams/agents:', err);
    }
  }, []);

  // Load current collaborators
  const loadCollaborators = useCallback(async () => {
    if (!conversation) return;

    const collaborators: Collaborator[] = [];

    // Add assigned team
    if (conversation.teamId && conversation.team) {
      try {
        const members = await conversationsApi.getTeamMembers(conversation.teamId);
        if (Array.isArray(members)) {
          members.forEach((member: { id: string; userId: string; user?: { firstName?: string; lastName?: string; email?: string; avatar?: string }; role?: string }) => {
            if (member.user) {
              collaborators.push({
                id: member.id,
                userId: member.userId,
                firstName: member.user.firstName,
                lastName: member.user.lastName,
                email: member.user.email,
                avatar: member.user.avatar,
                role: member.role,
                type: 'agent',
              });
            }
          });
        }
      } catch {
        // If team members fail, just show team
        collaborators.push({
          id: conversation.teamId,
          firstName: conversation.team.name,
          type: 'team',
        });
      }
    }

    // Add assigned agent
    if (conversation.assignedAgentId && conversation.assignedAgent) {
      setAssignedAgent({
        id: conversation.assignedAgentId,
        userId: conversation.assignedAgentId,
        firstName: conversation.assignedAgent.firstName,
        lastName: conversation.assignedAgent.lastName,
        email: conversation.assignedAgent.email,
        avatar: conversation.assignedAgent.avatar,
        type: 'agent',
      });
    }

    setTeamMembers(collaborators);
  }, [conversation]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadCollaborators();
  }, [loadCollaborators]);

  const handleAssign = async () => {
    if (!selectedTeamId && !selectedAgentId) return;

    setLoading(true);
    try {
      const payload: { agentId?: string; teamId?: string; reason?: string } = {};
      
      if (selectedType === 'team' && selectedTeamId) {
        payload.teamId = selectedTeamId;
      } else if (selectedType === 'agent' && selectedAgentId) {
        payload.agentId = selectedAgentId;
      }

      const resp = await conversationsApi.assign(conversationId, payload);
      
      if (resp.success) {
        success(
          selectedType === 'team'
            ? 'Team assigned successfully'
            : 'Agent assigned successfully'
        );
        setOpen(false);
        setSelectedTeamId('');
        setSelectedAgentId('');
        onUpdate?.();
        loadCollaborators();
      } else {
        throw new Error(resp.error || 'Failed to assign');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign collaborator';
      toastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeam = async () => {
    setLoading(true);
    try {
      const resp = await conversationsApi.assign(conversationId, { teamId: undefined });
      if (resp.success) {
        success('Team removed successfully');
        onUpdate?.();
        loadCollaborators();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove team';
      toastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAgent = async () => {
    setLoading(true);
    try {
      const resp = await conversationsApi.assign(conversationId, { agentId: undefined });
      if (resp.success) {
        success('Agent removed successfully');
        setAssignedAgent(null);
        onUpdate?.();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove agent';
      toastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAgents = availableAgents.filter((agent) => {
    const name = `${agent.user.firstName} ${agent.user.lastName}`.toLowerCase();
    const email = agent.user.email.toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  const currentTeam = conversation?.team;
  const hasCollaborators = currentTeam || assignedAgent || teamMembers.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Collaborators</h4>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Collaborator</DialogTitle>
              <DialogDescription>
                Assign a team or agent to this conversation
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Type Selector */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={selectedType === 'team' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('team')}
                  className="flex-1"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Team
                </Button>
                <Button
                  type="button"
                  variant={selectedType === 'agent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('agent')}
                  className="flex-1"
                >
                  <User className="h-4 w-4 mr-2" />
                  Agent
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${selectedType === 'team' ? 'teams' : 'agents'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Options List */}
              <ScrollArea className="h-[200px]">
                {selectedType === 'team' ? (
                  <div className="space-y-1">
                    {filteredTeams.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No teams found
                      </p>
                    ) : (
                      filteredTeams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => setSelectedTeamId(team.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left',
                            selectedTeamId === team.id && 'bg-primary/10 border border-primary'
                          )}
                        >
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                            style={{
                              backgroundColor: team.color || '#3B82F6',
                            }}
                          >
                            {team.name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{team.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {team.memberCount || 0} members
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredAgents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No agents found
                      </p>
                    ) : (
                      filteredAgents.map((agent) => (
                        <button
                          key={agent.id}
                          onClick={() => setSelectedAgentId(agent.userId)}
                          className={cn(
                            'w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left',
                            selectedAgentId === agent.userId && 'bg-primary/10 border border-primary'
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={agent.user.avatar} />
                            <AvatarFallback className="text-xs">
                              {agent.user.firstName[0]}{agent.user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {agent.user.firstName} {agent.user.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {agent.user.email}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssign}
                  className="flex-1"
                  disabled={loading || (!selectedTeamId && !selectedAgentId)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    'Assign'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Collaborators */}
      {hasCollaborators ? (
        <div className="space-y-2">
          {/* Assigned Team */}
          {currentTeam && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                  style={{
                    backgroundColor: currentTeam.color || '#3B82F6',
                  }}
                >
                  {currentTeam.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{currentTeam.name}</p>
                  <p className="text-xs text-muted-foreground">Team</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleRemoveTeam}
                disabled={loading}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Assigned Agent */}
          {assignedAgent && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={assignedAgent.avatar} />
                  <AvatarFallback className="text-xs">
                    {assignedAgent.firstName?.[0]}{assignedAgent.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {assignedAgent.firstName} {assignedAgent.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">Assigned Agent</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleRemoveAgent}
                disabled={loading}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Team Members */}
          {teamMembers.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Team Members</p>
                {teamMembers.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="text-xs">
                        {member.firstName?.[0]}{member.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {member.firstName} {member.lastName}
                      </p>
                    </div>
                    {member.role && (
                      <Badge variant="secondary" className="text-xs">
                        {member.role}
                      </Badge>
                    )}
                  </div>
                ))}
                {teamMembers.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{teamMembers.length - 5} more
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-lg bg-muted/30">
          <Users className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
          <p className="text-xs text-muted-foreground text-center">No collaborators</p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Add a team or agent to collaborate
          </p>
        </div>
      )}
    </div>
  );
}

