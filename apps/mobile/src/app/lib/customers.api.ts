import { createApiClient } from './api';

export type Customer = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  company?: string | null;
};

export async function searchCustomers(q?: string): Promise<Customer[]> {
  const api = createApiClient();
  const res = await api.get('/customers', { params: { q } });
  return (res.data || []) as Customer[];
}


