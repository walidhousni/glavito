import { createApiClient } from './api';

export type CustomFieldDefinition = {
  id: string;
  entity: 'ticket' | 'customer';
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'email' | 'phone' | 'url';
  required?: boolean;
  options?: Array<{ value: string; label: string }> | null;
  sortOrder?: number;
  isActive?: boolean;
};

export async function listTicketFieldDefinitions(): Promise<CustomFieldDefinition[]> {
  const api = createApiClient();
  const res = await api.get('/custom-fields', { params: { entity: 'ticket' } });
  return (res.data || []) as CustomFieldDefinition[];
}


