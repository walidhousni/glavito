import { Injectable, Logger } from '@nestjs/common';
import { ChannelAdapter, ChannelType } from '@glavito/shared-types';

/**
 * AdapterRegistryService centralizes access to channel adapters.
 * Adapters register themselves through this service via addAdapter.
 */
@Injectable()
export class AdapterRegistryService {
  private readonly logger = new Logger(AdapterRegistryService.name);
  private readonly adapters = new Map<ChannelType, ChannelAdapter>();

  addAdapter(channel: ChannelType, adapter: ChannelAdapter): void {
    if (!channel || !adapter) return;
    const existing = this.adapters.get(channel);
    if (existing && existing !== adapter) {
      this.logger.warn(`Replacing existing adapter for channel ${channel}`);
    }
    this.adapters.set(channel, adapter);
  }

  getAdapter(channel: ChannelType): ChannelAdapter | undefined {
    return this.adapters.get(channel);
  }

  getAll(): Array<{ channel: ChannelType; adapter: ChannelAdapter }> {
    return Array.from(this.adapters.entries()).map(([channel, adapter]) => ({ channel, adapter }));
  }
}


