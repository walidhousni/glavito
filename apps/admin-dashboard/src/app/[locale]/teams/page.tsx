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
import { CreateTeamRequest } from '@/lib/api/team';

// Mock data for demonstration
const mockTeams = [
  {
    id: '1',
    tenantId: 'tenant-1',
    name: 'Customer Support',
    description: 'Primary customer support team handling general inquiries',
    color: '#3B82F6',
    isDefault: true,
    settings: {},
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    members: [
      {
        id: 'member-1',
        teamId: '1',
        userId: 'user-1',
        role: 'lead' as const,
        permissions: ['manage_tickets', 'assign_agents'],
        skills: ['customer_service', 'technical_support'],
        availability: {},
        isActive: true,
        joinedAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        user: {
          id: 'user-1',
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          avatar: '',
          status: 'active'
        }
      },
      {
        id: 'member-2',
        teamId: '1',
        userId: 'user-2',
        role: 'member' as const,
        permissions: ['handle_tickets'],
        skills: ['customer_service'],
        availability: {},
        isActive: true,
        joinedAt: '2024-01-16T10:00:00Z',
        updatedAt: '2024-01-16T10:00:00Z',
        user: {
          id: 'user-2',
          email: 'jane.smith@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          avatar: '',
          status: 'active'
        }
      }
    ]
  },
  {
    id: '2',
    tenantId: 'tenant-1',
    name: 'Technical Support',
    description: 'Specialized team for technical issues and escalations',
    color: '#10B981',
    isDefault: false,
    settings: {},
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
    members: [
      {
        id: 'member-3',
        teamId: '2',
        userId: 'user-3',
        role: 'lead' as const,
        permissions: ['manage_tickets', 'assign_agents', 'escalate'],
        skills: ['technical_support', 'troubleshooting', 'api_integration'],
        availability: {},
        isActive: true,
        joinedAt: '2024-01-20T10:00:00Z',
        updatedAt: '2024-01-20T10:00:00Z',
        user: {
          id: 'user-3',
          email: 'mike.wilson@example.com',
          firstName: 'Mike',
          lastName: 'Wilson',
          avatar: '',
          status: 'active'
        }
      }
    ]
  }
];

export default function TeamsPage() {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState<CreateTeamRequest>({
    name: '',
    description: '',
    color: '#3B82F6',
    isDefault: false,
    settings: {}
  });

  // Use mock data for now, replace with actual hook when API is ready
  // const { teams, isLoading, error, createTeam } = useTeams();
  const teams = mockTeams;
  const isLoading = false;
  const error = null;

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTeam = async () => {
    try {
      // await createTeam(newTeam);
      console.log('Creating team:', newTeam);
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
            {t('teams.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('teams.subtitle')}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              {t('teams.createTeam')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Create a new support team to organize your agents and manage tickets.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="Enter team name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  placeholder="Enter team description"
                />
              </div>
              <div>
                <Label htmlFor="color">Team Color</Label>
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
                Cancel
              </Button>
              <Button onClick={handleCreateTeam} disabled={!newTeam.name}>
                Create Team
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder={t('teams.searchTeams')}
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
                          Default
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
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Team
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Member
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Team
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
                        {team.members.length} members
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
                        Members
                      </span>
                    </div>
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 4).map((member) => (
                        <Avatar key={member.id} className="h-8 w-8 border-2 border-white dark:border-gray-800">
                          <AvatarImage src={member.user.avatar} />
                          <AvatarFallback className="text-xs">
                            {member.user.firstName[0]}{member.user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {team.members.length > 4 && (
                        <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            +{team.members.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Team Lead */}
                  {team.members.find(m => m.role === 'lead') && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Team Lead
                      </div>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={team.members.find(m => m.role === 'lead')?.user.avatar} />
                          <AvatarFallback className="text-xs">
                            {team.members.find(m => m.role === 'lead')?.user.firstName[0]}
                            {team.members.find(m => m.role === 'lead')?.user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {team.members.find(m => m.role === 'lead')?.user.firstName} {team.members.find(m => m.role === 'lead')?.user.lastName}
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
    </div>
  );
}