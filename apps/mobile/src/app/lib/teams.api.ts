import { createApiClient } from './api';

export type Team = {
  id: string;
  name: string;
  color?: string | null;
  isDefault?: boolean;
};

let cachedTeams: Team[] | null = null;

export async function listTeams(includeMembers = false): Promise<Team[]> {
  const api = createApiClient();
  if (!includeMembers && cachedTeams) return cachedTeams;
  const res = await api.get('/teams', { params: { includeMembers } });
  const data = (res.data || []) as Team[];
  if (!includeMembers) cachedTeams = data;
  return data;
}


