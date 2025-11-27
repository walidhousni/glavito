import { api as ApiClient } from "./config";


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

export class ChannelSettingsClient {
  constructor(private readonly api: typeof ApiClient) {}

  async getChannelBranding(channelType: string): Promise<ChannelBranding | null> {
    const response = await this.api.get<{ data: ChannelBranding }>(
      `/channels/settings/${channelType}/branding`
    );
    return response.data.data;
  }

  async updateChannelBranding(
    channelType: string,
    branding: ChannelBranding
  ): Promise<ChannelBranding> {
    const response = await this.api.put<{ data: ChannelBranding }>(
      `/channels/settings/${channelType}/branding`,
      branding
    );
    return response.data.data;
  }

  async getChannelAnalytics(
    channelType: string,
    dateRange?: { from: string; to: string }
  ): Promise<ChannelAnalytics> {
    const params = new URLSearchParams();
    if (dateRange) {
      params.append('from', dateRange.from);
      params.append('to', dateRange.to);
    }

    const response = await this.api.get<{ data: ChannelAnalytics }>(
      `/channels/settings/${channelType}/analytics?${params.toString()}`
    );
    return response.data.data;
  }

  async syncWhatsAppTemplates(): Promise<{ synced: number }> {
    const response = await this.api.post<{ data: { synced: number } }>(
      '/channels/settings/whatsapp/sync-templates'
    );
    return response.data.data;
  }
}

