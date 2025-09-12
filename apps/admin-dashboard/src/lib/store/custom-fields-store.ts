import { create } from 'zustand';
import { CustomFieldDefinition, CreateCustomFieldRequest, customFieldsApi, CustomFieldEntity } from '@/lib/api/custom-fields-client';

interface CustomFieldsState {
  fields: Record<CustomFieldEntity, CustomFieldDefinition[]>;
  loading: boolean;
  error?: string;
  load: (entity?: CustomFieldEntity) => Promise<void>;
  create: (payload: CreateCustomFieldRequest) => Promise<CustomFieldDefinition>;
  update: (id: string, payload: Partial<CreateCustomFieldRequest>) => Promise<CustomFieldDefinition>;
  remove: (id: string) => Promise<void>;
}

export const useCustomFieldsStore = create<CustomFieldsState>((set, get) => ({
  fields: { ticket: [], customer: [], lead: [], deal: [] } as Record<CustomFieldEntity, CustomFieldDefinition[]>,
  loading: false,
  error: undefined,
  load: async (entity) => {
    set({ loading: true, error: undefined });
    try {
      if (entity) {
        const data = await customFieldsApi.list(entity);
        set((state) => ({ fields: { ...state.fields, [entity]: data }, loading: false }));
      } else {
        const [ticket, customer, lead, deal] = await Promise.all([
          customFieldsApi.list('ticket'),
          customFieldsApi.list('customer'),
          customFieldsApi.list('lead'),
          customFieldsApi.list('deal'),
        ]);
        set({ fields: { ticket, customer, lead, deal } as Record<CustomFieldEntity, CustomFieldDefinition[]>, loading: false });
      }
    } catch (e: any) {
      set({ loading: false, error: e?.message || 'Failed to load custom fields' });
    }
  },
  create: async (payload) => {
    const res = await customFieldsApi.create(payload);
    await get().load(payload.entity);
    return res;
  },
  update: async (id, payload) => {
    const res = await customFieldsApi.update(id, payload);
    await get().load(res.entity);
    return res;
  },
  remove: async (id) => {
    const current = get().fields;
    await customFieldsApi.remove(id);
    // reload both in case we don't know entity
    await get().load();
    set({ fields: current });
  },
}));


