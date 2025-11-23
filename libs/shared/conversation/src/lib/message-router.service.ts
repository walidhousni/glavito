import { Injectable, Logger } from '@nestjs/common';
import { AdapterRegistryService } from './adapter-registry.service';
import { OutgoingMessage, MessageDeliveryResult, ChannelType } from '@glavito/shared-types';

@Injectable()
export class MessageRouterService {
  private readonly logger = new Logger(MessageRouterService.name);
  constructor(private readonly registry: AdapterRegistryService) {}

  async route(conversationId: string, channel: ChannelType, message: OutgoingMessage): Promise<MessageDeliveryResult> {
    const adapter = this.registry.getAdapter(channel);
    if (!adapter) {
      this.logger.error(`No adapter registered for channel: ${channel}`);
      return { messageId: `err_${Date.now()}`, status: 'failed', timestamp: new Date(), error: `Channel ${channel} not configured` };
    }
    return await adapter.sendMessage(conversationId, message);
  }
}


