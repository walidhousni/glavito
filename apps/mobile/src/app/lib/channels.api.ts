import { createApiClient } from './api';

export type Channel = {
  id: string;
  name?: string | null;
  type: string;
  isActive?: boolean;
};

let cachedChannels: Channel[] | null = null;

export async function listChannels(): Promise<Channel[]> {
  const api = createApiClient();
  if (cachedChannels) return cachedChannels;
  const res = await api.get('/channels');
  cachedChannels = (res.data || []) as Channel[];
  return cachedChannels;
}


