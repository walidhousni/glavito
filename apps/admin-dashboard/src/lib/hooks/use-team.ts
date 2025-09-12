import { useEffect } from 'react';
import { useTeamStore } from '@/lib/store/team-store';
import { CreateTeamRequest, UpdateTeamRequest, AddTeamMemberRequest, UpdateTeamMemberRequest, teamApi } from '@/lib/api/team';

// Hook for managing teams
export const useTeams = () => {
  const {
    teams,
    isLoading,
    error,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    clearError,
  } = useTeamStore();

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return {
    teams,
    isLoading,
    error,
    refetch: fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    clearError,
  };
};

// Hook for managing a specific team
export const useTeam = (teamId?: string) => {
  const {
    currentTeam,
    teamMembers,
    isLoading,
    error,
    fetchTeam,
    fetchTeamMembers,
    addTeamMember,
    updateTeamMember,
    removeTeamMember,
    setCurrentTeam,
    clearError,
  } = useTeamStore();

  useEffect(() => {
    if (teamId) {
      fetchTeam(teamId);
      fetchTeamMembers(teamId);
    } else {
      setCurrentTeam(null);
    }
  }, [teamId, fetchTeam, fetchTeamMembers, setCurrentTeam]);

  const addMember = async (data: AddTeamMemberRequest) => {
    if (!teamId) throw new Error('Team ID is required');
    return addTeamMember(teamId, data);
  };

  const updateMember = async (memberId: string, data: UpdateTeamMemberRequest) => {
    if (!teamId) throw new Error('Team ID is required');
    return updateTeamMember(teamId, memberId, data);
  };

  const removeMember = async (memberId: string) => {
    if (!teamId) throw new Error('Team ID is required');
    return removeTeamMember(teamId, memberId);
  };

  const refetchMembers = () => {
    if (teamId) {
      fetchTeamMembers(teamId);
    }
  };

  return {
    team: currentTeam,
    members: teamMembers,
    isLoading,
    error,
    addMember,
    updateMember,
    removeMember,
    refetchMembers,
    clearError,
  };
};

// Hook for managing team members across all teams
export const useTeamMembers = (teamId?: string) => {
  const {
    teamMembers,
    isLoading,
    error,
    fetchTeamMembers,
    addTeamMember,
    updateTeamMember,
    removeTeamMember,
    clearError,
  } = useTeamStore();

  useEffect(() => {
    if (teamId) {
      fetchTeamMembers(teamId);
    }
  }, [teamId, fetchTeamMembers]);

  const addMember = async (data: AddTeamMemberRequest) => {
    if (!teamId) throw new Error('Team ID is required');
    return addTeamMember(teamId, data);
  };

  const updateMember = async (memberId: string, data: UpdateTeamMemberRequest) => {
    if (!teamId) throw new Error('Team ID is required');
    return updateTeamMember(teamId, memberId, data);
  };

  const removeMember = async (memberId: string) => {
    if (!teamId) throw new Error('Team ID is required');
    return removeTeamMember(teamId, memberId);
  };

  const refetch = () => {
    if (teamId) {
      fetchTeamMembers(teamId);
    }
  };

  return {
    members: teamMembers,
    isLoading,
    error,
    addMember,
    updateMember,
    removeMember,
    refetch,
    clearError,
  };
};