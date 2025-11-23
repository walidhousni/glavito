import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

export interface ChannelBranding {
  logoUrl?: string;
  colors?: Record<string, string>;
  customCss?: string;
  settings?: Record<string, unknown>;
}

export interface ChannelAnalytics {
  deliveryRate?: number;
  readRate?: number;
  responseTime?: number;
  messageCount?: number;
  errorRate?: number;
}

@Injectable()
export class ChannelSettingsService {
  private readonly logger = new Logger(ChannelSettingsService.name);

  constructor(private readonly db: DatabaseService) {}

  async getChannelBranding(
    tenantId: string,
    channelType: string,
  ): Promise<ChannelBranding | null> {
    try {
      const branding = await this.db.channelBranding.findUnique({
        where: {
          tenantId_channelType: {
            tenantId,
            channelType,
          },
        },
      });

      if (!branding) return null;

      return {
        logoUrl: branding.logoUrl || undefined,
        colors: (branding.colors as Record<string, string>) || {},
        customCss: branding.customCss || undefined,
        settings: (branding.settings as Record<string, unknown>) || {},
      };
    } catch (error) {
      this.logger.error(
        `Failed to get channel branding for ${tenantId}/${channelType}:`,
        error,
      );
      throw error;
    }
  }

  async updateChannelBranding(
    tenantId: string,
    channelType: string,
    branding: ChannelBranding,
  ): Promise<ChannelBranding> {
    try {
      const updated = await this.db.channelBranding.upsert({
        where: {
          tenantId_channelType: {
            tenantId,
            channelType,
          },
        },
        update: {
          logoUrl: branding.logoUrl,
          colors: branding.colors || {},
          customCss: branding.customCss,
          settings: branding.settings || {},
        },
        create: {
          tenantId,
          channelType,
          logoUrl: branding.logoUrl,
          colors: branding.colors || {},
          customCss: branding.customCss,
          settings: branding.settings || {},
        },
      });

      return {
        logoUrl: updated.logoUrl || undefined,
        colors: (updated.colors as Record<string, string>) || {},
        customCss: updated.customCss || undefined,
        settings: (updated.settings as Record<string, unknown>) || {},
      };
    } catch (error) {
      this.logger.error(
        `Failed to update channel branding for ${tenantId}/${channelType}:`,
        error,
      );
      throw error;
    }
  }

  async getChannelAnalytics(
    tenantId: string,
    channelType: string,
    dateRange: { from: Date; to: Date },
  ): Promise<ChannelAnalytics> {
    try {
      // Get channel
      const channel = await this.db.channel.findUnique({
        where: {
          tenantId_type: {
            tenantId,
            type: channelType,
          },
        },
      });

      if (!channel) {
        throw new NotFoundException('Channel not found');
      }

      // Calculate analytics from messages
      const messages = await this.db.message.findMany({
        where: {
          conversation: {
            tenantId,
            channelId: channel.id,
          },
          createdAt: {
            gte: dateRange.from,
            lte: dateRange.to,
          },
        },
        select: {
          createdAt: true,
          metadata: true,
        },
      });

      const totalMessages = messages.length;
      const deliveredMessages = messages.filter((m) => {
        const meta = m.metadata as { delivered?: boolean };
        return meta.delivered !== false;
      }).length;
      const readMessages = messages.filter((m) => {
        const meta = m.metadata as { read?: boolean };
        return meta.read === true;
      }).length;

      // Calculate average response time (simplified)
      const responseTimes: number[] = [];
      for (const message of messages) {
        const meta = message.metadata as { responseTime?: number };
        if (meta.responseTime) {
          responseTimes.push(meta.responseTime);
        }
      }
      const avgResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

      return {
        deliveryRate: totalMessages > 0 ? deliveredMessages / totalMessages : 0,
        readRate: totalMessages > 0 ? readMessages / totalMessages : 0,
        responseTime: avgResponseTime,
        messageCount: totalMessages,
        errorRate:
          totalMessages > 0 ? (totalMessages - deliveredMessages) / totalMessages : 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get channel analytics for ${tenantId}/${channelType}:`,
        error,
      );
      throw error;
    }
  }

  async syncWhatsAppTemplates(tenantId: string): Promise<{ synced: number }> {
    try {
      // Get WhatsApp channel config
      const channel = await this.db.channel.findUnique({
        where: {
          tenantId_type: {
            tenantId,
            type: 'whatsapp',
          },
        },
      });

      if (!channel) {
        throw new NotFoundException('WhatsApp channel not found');
      }

      // TODO: Implement actual WhatsApp Business API template sync
      // For now, return placeholder
      this.logger.log(`Syncing WhatsApp templates for tenant ${tenantId}`);

      return { synced: 0 };
    } catch (error) {
      this.logger.error(`Failed to sync WhatsApp templates for ${tenantId}:`, error);
      throw error;
    }
  }
}

