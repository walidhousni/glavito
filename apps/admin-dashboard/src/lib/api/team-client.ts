import { api } from './config';

export interface TeamStats {
  totalTeams: number;
  totalMembers: number;
  activeMembers: number;
  averageTeamSize: number;
  teamPerformance: Array<{
    teamId: string;
    teamName: string;
    ticketsAssigned: number;
    ticketsCompleted: number;
    averageResolutionTime: number;
    memberCount: number;
  }>;
}

export const teamApi = {
  async getStats(): Promise<TeamStats> {
    const res = await api.get('/teams/stats');
    const data = (res as any)?.data?.data ?? res.data;
    return data as TeamStats;
  },
};


