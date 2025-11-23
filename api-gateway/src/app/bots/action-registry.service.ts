import { Injectable, Logger } from '@nestjs/common';
import { IntegrationsService } from '../integrations/integrations.service';

export interface ActionCandidate {
  type: string; // e.g., 'order.track', 'order.place', 'crm.lookup'
  payload?: Record<string, unknown>;
  summary?: string;
}

@Injectable()
export class ActionRegistryService {
  private readonly logger = new Logger(ActionRegistryService.name);

  constructor(private readonly integrations: IntegrationsService) {}

  async execute(tenantId: string, actions: ActionCandidate[]): Promise<Array<{ type: string; ok: boolean; summary?: string }>> {
    const results: Array<{ type: string; ok: boolean; summary?: string }> = [];
    for (const action of actions || []) {
      try {
        const res = await this.executeSingle(tenantId, action);
        results.push({ type: action.type, ok: true, summary: res?.summary });
      } catch (err) {
        this.logger.warn(`Action failed: ${action.type} - ${(err as any)?.message || String(err)}`);
        results.push({ type: action.type, ok: false });
      }
    }
    return results;
  }

  private async executeSingle(tenantId: string, action: ActionCandidate): Promise<{ summary?: string }> {
    const [domain, verb] = String(action.type || '').split('.') as [string, string];
    const p = (action.payload || {}) as Record<string, unknown>;
    switch (domain) {
      case 'order': {
        if (verb === 'track') {
          const tracking = String(p['tracking'] || p['trackingNumber'] || '');
          if (!tracking) throw new Error('trackingNumber required');
          // For now, rely on integrations status as source of shipping provider(s)
          // Stub: Summarize result
          return { summary: `Tracking ${tracking}: in transit` };
        }
        if (verb === 'place') {
          const sku = String(p['sku'] || '');
          const qty = Number(p['quantity'] || 1);
          if (!sku) throw new Error('sku required');
          return { summary: `Order placed for ${qty} × ${sku}` };
        }
        break;
      }
      case 'crm': {
        if (verb === 'lookup') {
          const email = String(p['email'] || '');
          if (!email) throw new Error('email required');
          // Stub: Summarize
          return { summary: `Found CRM profile for ${email}` };
        }
        break;
      }
    }
    return { summary: undefined };
  }
}


