import { create } from 'zustand';
import { teamApi, agentApi, Team, TeamMember, AgentProfile, CreateTeamRequest, UpdateTeamRequest, AddTeamMemberRequest, UpdateTeamMemberRequest, UpdateAgentProfileRequest, AgentAvailabilityRequest, AgentPerformanceMetrics } from '@/lib/api/team';

export interface TeamState {
  // State
  teams: Team[];
  currentTeam: Team | null;
  teamMembers: TeamMember[];
  agentProfiles: AgentProfile[];
  availableAgents: AgentProfile[];
  currentAgentProfile: AgentProfile | null;
  agentPerformanceMetrics: AgentPerformanceMetrics | null;
  isLoading: boolean;
  error: string | null;

  // Team Actions
  fetchTeams: () => Promise<void>;
  fetchTeam: (teamId: string) => Promise<void>;
  createTeam: (data: CreateTeamRequest) => Promise<Team>;
  updateTeam: (teamId: string, data: UpdateTeamRequest) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  setCurrentTeam: (team: Team | null) => void;

  // Team Member Actions
  fetchTeamMembers: (teamId: string) => Promise<void>;
  addTeamMember: (teamId: string, data: AddTeamMemberRequest) => Promise<void>;
  updateTeamMember: (teamId: string, memberId: string, data: UpdateTeamMemberRequest) => Promise<void>;
  removeTeamMember: (teamId: string, memberId: string) => Promise<void>;

  // Agent Actions
  fetchAgentProfiles: () => Promise<void>;
  fetchAvailableAgents: (params?: { skills?: string[]; languages?: string[]; maxLoad?: boolean; }) => Promise<void>;
  fetchAgentProfile: (userId: string) => Promise<void>;
  updateAgentProfile: (userId: string, data: UpdateAgentProfileRequest) => Promise<void>;
  updateAgentAvailability: (userId: string, data: AgentAvailabilityRequest) => Promise<void>;
  fetchAgentPerformanceMetrics: (userId: string) => Promise<void>;
  setCurrentAgentProfile: (profile: AgentProfile | null) => void;

  // Utility Actions
  clearError: () => void;
  reset: () => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  // Initial State
  teams: [],
  currentTeam: null,
  teamMembers: [],
  agentProfiles: [],
  availableAgents: [],
  currentAgentProfile: null,
  agentPerformanceMetrics: null,
  isLoading: false,
  error: null,

  // Team Actions
  fetchTeams: async () => {
    set({ isLoading: true, error: null });
    try {
      const teams = await teamApi.getTeams();
      set({ teams, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch teams', isLoading: false });
    }
  },

  fetchTeam: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      const team = await teamApi.getTeam(teamId);
      set({ currentTeam: team, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch team', isLoading: false });
    }
  },

  createTeam: async (data: CreateTeamRequest) => {
    set({ isLoading: true, error: null });
    try {
      const newTeam = await teamApi.createTeam(data);
      const { teams } = get();
      set({ teams: [...teams, newTeam], isLoading: false });
      return newTeam;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create team', isLoading: false });
      throw error;
    }
  },

  updateTeam: async (teamId: string, data: UpdateTeamRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTeam = await teamApi.updateTeam(teamId, data);
      const { teams, currentTeam } = get();
      const updatedTeams = teams.map(team => team.id === teamId ? updatedTeam : team);
      set({ 
        teams: updatedTeams, 
        currentTeam: currentTeam?.id === teamId ? updatedTeam : currentTeam,
        isLoading: false 
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update team', isLoading: false });
    }
  },

  deleteTeam: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      await teamApi.deleteTeam(teamId);
      const { teams, currentTeam } = get();
      const filteredTeams = teams.filter(team => team.id !== teamId);
      set({ 
        teams: filteredTeams,
        currentTeam: currentTeam?.id === teamId ? null : currentTeam,
        isLoading: false 
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete team', isLoading: false });
    }
  },

  setCurrentTeam: (team: Team | null) => {
    set({ currentTeam: team });
  },

  // Team Member Actions
  fetchTeamMembers: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      const members = await teamApi.getTeamMembers(teamId);
      set({ teamMembers: members, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch team members', isLoading: false });
    }
  },

  addTeamMember: async (teamId: string, data: AddTeamMemberRequest) => {
    set({ isLoading: true, error: null });
    try {
      const newMember = await teamApi.addTeamMember(teamId, data);
      const { teamMembers } = get();
      set({ teamMembers: [...teamMembers, newMember], isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to add team member', isLoading: false });
    }
  },

  updateTeamMember: async (teamId: string, memberId: string, data: UpdateTeamMemberRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedMember = await teamApi.updateTeamMember(teamId, memberId, data);
      const { teamMembers } = get();
      const updatedMembers = teamMembers.map(member => 
        member.id === memberId ? updatedMember : member
      );
      set({ teamMembers: updatedMembers, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update team member', isLoading: false });
    }
  },

  removeTeamMember: async (teamId: string, memberId: string) => {
    set({ isLoading: true, error: null });
    try {
      await teamApi.removeTeamMember(teamId, memberId);
      const { teamMembers } = get();
      const filteredMembers = teamMembers.filter(member => member.id !== memberId);
      set({ teamMembers: filteredMembers, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to remove team member', isLoading: false });
    }
  },

  // Agent Actions
  fetchAgentProfiles: async () => {
    set({ isLoading: true, error: null });
    try {
      const profiles = await agentApi.getAgentProfiles();
      set({ agentProfiles: profiles, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch agent profiles', isLoading: false });
    }
  },

  fetchAvailableAgents: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const agents = await agentApi.getAvailableAgents(params);
      set({ availableAgents: agents, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch available agents', isLoading: false });
    }
  },

  fetchAgentProfile: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await agentApi.getAgentProfile(userId);
      set({ currentAgentProfile: profile, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch agent profile', isLoading: false });
    }
  },

  updateAgentProfile: async (userId: string, data: UpdateAgentProfileRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedProfile = await agentApi.updateAgentProfile(userId, data);
      const { agentProfiles, currentAgentProfile } = get();
      const updatedProfiles = agentProfiles.map(profile => 
        profile.userId === userId ? updatedProfile : profile
      );
      set({ 
        agentProfiles: updatedProfiles,
        currentAgentProfile: currentAgentProfile?.userId === userId ? updatedProfile : currentAgentProfile,
        isLoading: false 
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update agent profile', isLoading: false });
    }
  },

  updateAgentAvailability: async (userId: string, data: AgentAvailabilityRequest) => {
    set({ isLoading: true, error: null });
    try {
      await agentApi.updateAgentAvailability(userId, data);
      // Refresh the agent profile to get updated availability
      const { currentAgentProfile } = get();
      if (currentAgentProfile?.userId === userId) {
        await get().fetchAgentProfile(userId);
      }
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update agent availability', isLoading: false });
    }
  },

  fetchAgentPerformanceMetrics: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const metrics = await agentApi.getAgentPerformanceMetrics(userId);
      set({ agentPerformanceMetrics: metrics, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch agent performance metrics', isLoading: false });
    }
  },

  setCurrentAgentProfile: (profile: AgentProfile | null) => {
    set({ currentAgentProfile: profile });
  },

  // Utility Actions
  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      teams: [],
      currentTeam: null,
      teamMembers: [],
      agentProfiles: [],
      availableAgents: [],
      currentAgentProfile: null,
      agentPerformanceMetrics: null,
      isLoading: false,
      error: null,
    });
  },
}));