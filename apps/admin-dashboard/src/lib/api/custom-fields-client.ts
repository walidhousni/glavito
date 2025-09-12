import api from './config';

export type CustomFieldEntity = 'ticket' | 'customer' | 'lead' | 'deal';

export interface CustomFieldDefinition {
  id: string;
  tenantId: string;
  entity: CustomFieldEntity;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'email' | 'phone' | 'url';
  required: boolean;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
  validation?: { minLength?: number; maxLength?: number; pattern?: string; min?: number; max?: number };
  conditions?: Record<string, unknown>;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomFieldRequest {
  entity: CustomFieldEntity;
  name: string;
  label: string;
  type: CustomFieldDefinition['type'];
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
  validation?: CustomFieldDefinition['validation'];
  conditions?: Record<string, unknown>;
  sortOrder?: number;
  isActive?: boolean;
}

export class CustomFieldsApiClient {
  constructor(private basePath = '/crm/custom/fields') {}

  async list(entity?: CustomFieldEntity) {
    const { data } = await api.get<CustomFieldDefinition[]>(this.basePath, { params: entity ? { entity } : undefined });
    return data;
    }

  async get(id: string) {
    const { data } = await api.get<CustomFieldDefinition>(`${this.basePath}/${id}`);
    return data;
  }

  async create(payload: CreateCustomFieldRequest) {
    const { data } = await api.post<CustomFieldDefinition>(this.basePath, payload);
    return data;
  }

  async update(id: string, payload: Partial<CreateCustomFieldRequest>) {
    const { data } = await api.patch<CustomFieldDefinition>(`${this.basePath}/${id}`, payload);
    return data;
  }

  async remove(id: string) {
    const { data } = await api.delete(`${this.basePath}/${id}`);
    return data as { success: boolean };
  }
}

export const customFieldsApi = new CustomFieldsApiClient();


