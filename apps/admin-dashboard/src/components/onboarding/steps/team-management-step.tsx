'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  Mail, 
  UserPlus,
  Shield,
  Settings,
  Trash2,
  CheckCircle
} from 'lucide-react';

interface TeamManagementStepProps {
  data: any;
  onComplete: (data: any) => Promise<void>;
  isLoading: boolean;
}

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'supervisor' | 'agent';
  skills: string[];
  isInvited: boolean;
}

interface Team {
  id: string;
  name: string;
  description: string;
  color: string;
  members: string[];
}

export function TeamManagementStep({ data, onComplete, isLoading }: TeamManagementStepProps) {
  const t = useTranslations('onboarding.steps.team');
  
  const [teams, setTeams] = useState<Team[]>(
    data.teams || [
      {
        id: 'support-team',
        name: t('defaultTeams.support.name'),
        description: t('defaultTeams.support.description'),
        color: '#3B82F6',
        members: [],
      },
    ]
  );

  const [members, setMembers] = useState<TeamMember[]>(data.members || []);
  const [newMember, setNewMember] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'agent' as const,
    skills: '',
  });
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);

  const roles = [
    { value: 'admin', label: t('roles.admin.label'), description: t('roles.admin.description') },
    { value: 'supervisor', label: t('roles.supervisor.label'), description: t('roles.supervisor.description') },
    { value: 'agent', label: t('roles.agent.label'), description: t('roles.agent.description') },
  ];

  const addMember = () => {
    if (!newMember.email || !newMember.firstName || !newMember.lastName) return;

    const member: TeamMember = {
      id: Date.now().toString(),
      email: newMember.email,
      firstName: newMember.firstName,
      lastName: newMember.lastName,
      role: newMember.role,
      skills: newMember.skills.split(',').map(s => s.trim()).filter(Boolean),
      isInvited: false,
    };

    setMembers([...members, member]);
    setNewMember({ email: '', firstName: '', lastName: '', role: 'agent', skills: '' });
    setShowAddMember(false);
  };

  const addTeam = () => {
    if (!newTeam.name) return;

    const team: Team = {
      id: newTeam.name.toLowerCase().replace(/\s+/g, '-'),
      name: newTeam.name,
      description: newTeam.description,
      color: newTeam.color,
      members: [],
    };

    setTeams([...teams, team]);
    setNewTeam({ name: '', description: '', color: '#3B82F6' });
    setShowAddTeam(false);
  };

  const removeMember = (memberId: string) => {
    setMembers(members.filter(m => m.id !== memberId));
    setTeams(teams.map(team => ({
      ...team,
      members: team.members.filter(id => id !== memberId)
    })));
  };

  const removeTeam = (teamId: string) => {
    setTeams(teams.filter(t => t.id !== teamId));
  };

  const assignMemberToTeam = (memberId: string, teamId: string) => {
    setTeams(teams.map(team => 
      team.id === teamId 
        ? { ...team, members: [...team.members.filter(id => id !== memberId), memberId] }
        : { ...team, members: team.members.filter(id => id !== memberId) }
    ));
  };

  const handleSubmit = async () => {
    const teamData = {
      teams,
      members,
      invitations: members.filter(m => !m.isInvited).map(member => ({
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        role: member.role,
        skills: member.skills,
      })),
      settings: {
        enableAutoAssignment: true,
        enablePerformanceTracking: true,
        maxConcurrentTickets: 5,
      },
    };

    await onComplete(teamData);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'supervisor': return 'bg-yellow-100 text-yellow-800';
      case 'agent': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-primary" />
            <CardTitle>{t('overview.title')}</CardTitle>
          </div>
          <CardDescription>
            {t('overview.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{teams.length}</div>
              <div className="text-sm text-gray-600">{t('overview.teams')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{members.length}</div>
              <div className="text-sm text-gray-600">{t('overview.members')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {members.filter(m => !m.isInvited).length}
              </div>
              <div className="text-sm text-gray-600">{t('overview.pending')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('teams.title')}</CardTitle>
              <CardDescription>{t('teams.description')}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddTeam(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('teams.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {teams.map((team) => (
              <div key={team.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full mt-1"
                      style={{ backgroundColor: team.color }}
                    />
                    <div>
                      <h3 className="font-medium">{team.name}</h3>
                      <p className="text-sm text-gray-600">{team.description}</p>
                      <Badge variant="secondary" className="mt-2">
                        {team.members.length} {t('teams.members')}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTeam(team.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {showAddTeam && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-medium mb-3">{t('teams.addNew')}</h3>
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="team-name">{t('teams.fields.name')}</Label>
                    <Input
                      id="team-name"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                      placeholder={t('teams.placeholders.name')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="team-color">{t('teams.fields.color')}</Label>
                    <Input
                      id="team-color"
                      type="color"
                      value={newTeam.color}
                      onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="team-description">{t('teams.fields.description')}</Label>
                  <Input
                    id="team-description"
                    value={newTeam.description}
                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                    placeholder={t('teams.placeholders.description')}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={addTeam} size="sm">
                    {t('teams.save')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAddTeam(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('members.title')}</CardTitle>
              <CardDescription>{t('members.description')}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddMember(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t('members.invite')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {member.firstName[0]}{member.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium">{member.firstName} {member.lastName}</h3>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge className={getRoleColor(member.role)}>
                          {roles.find(r => r.value === member.role)?.label}
                        </Badge>
                        {member.isInvited ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {t('members.invited')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Mail className="w-3 h-3 mr-1" />
                            {t('members.pending')}
                          </Badge>
                        )}
                      </div>
                      {member.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {member.skills.map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={teams.find(t => t.members.includes(member.id))?.id || ''}
                      onChange={(e) => assignMemberToTeam(member.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="">{t('members.noTeam')}</option>
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(member.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showAddMember && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-medium mb-3">{t('members.addNew')}</h3>
              <div className="space-y-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="member-firstName">{t('members.fields.firstName')}</Label>
                    <Input
                      id="member-firstName"
                      value={newMember.firstName}
                      onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })}
                      placeholder={t('members.placeholders.firstName')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="member-lastName">{t('members.fields.lastName')}</Label>
                    <Input
                      id="member-lastName"
                      value={newMember.lastName}
                      onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })}
                      placeholder={t('members.placeholders.lastName')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="member-email">{t('members.fields.email')}</Label>
                    <Input
                      id="member-email"
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      placeholder={t('members.placeholders.email')}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="member-role">{t('members.fields.role')}</Label>
                    <select
                      id="member-role"
                      value={newMember.role}
                      onChange={(e) => setNewMember({ ...newMember, role: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      {roles.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="member-skills">{t('members.fields.skills')}</Label>
                    <Input
                      id="member-skills"
                      value={newMember.skills}
                      onChange={(e) => setNewMember({ ...newMember, skills: e.target.value })}
                      placeholder={t('members.placeholders.skills')}
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={addMember} size="sm">
                    {t('members.save')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAddMember(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? t('saving') : t('continue')}
        </Button>
      </div>
    </div>
  );
}