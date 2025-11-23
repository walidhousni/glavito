import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

@Injectable()
export class BotsService {
  constructor(private readonly db: DatabaseService) {}

  listAgents(tenantId: string) {
    return this.db.botAgent.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } });
  }

  async createAgent(tenantId: string, payload: { name: string; description?: string; operatingMode?: 'draft' | 'auto'; minConfidence?: number; allowedChannels?: string[]; guardrails?: Record<string, unknown> }) {
    const data: any = {
      tenantId,
      name: payload.name,
      description: payload.description,
      operatingMode: payload.operatingMode || 'draft',
      minConfidence: typeof payload.minConfidence === 'number' ? payload.minConfidence : 0.7,
      allowedChannels: payload.allowedChannels || [],
      guardrails: (payload.guardrails || {}) as any,
      isActive: false,
    };
    return this.db.botAgent.create({ data });
  }

  activateAgent(tenantId: string, id: string, active: boolean) {
    return this.db.botAgent.update({ where: { id }, data: { isActive: active } });
  }

  bindAgent(tenantId: string, payload: { agentId: string; channelId: string; channelType: string; routingHints?: Record<string, unknown>; isEnabled?: boolean }) {
    return this.db.botChannelBinding.upsert({
      where: { tenantId_botAgentId_channelId: { tenantId, botAgentId: payload.agentId, channelId: payload.channelId } },
      create: {
        tenantId,
        botAgentId: payload.agentId,
        channelId: payload.channelId,
        channelType: payload.channelType,
        routingHints: (payload.routingHints || {}) as any,
        isEnabled: payload.isEnabled ?? true,
      },
      update: {
        channelType: payload.channelType,
        routingHints: (payload.routingHints || {}) as any,
        isEnabled: payload.isEnabled ?? true,
      }
    });
  }

  listBindings(tenantId: string) {
    return this.db.botChannelBinding.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } });
  }
}


