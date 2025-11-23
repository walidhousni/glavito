import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface MailchimpConfig {
  apiKey: string;
  server: string; // e.g., 'us1', 'us2', etc.
}

@Injectable()
export class MailchimpAdapter {
  private readonly logger = new Logger(MailchimpAdapter.name);
  private client: AxiosInstance;

  constructor(config: MailchimpConfig) {
    this.client = axios.create({
      baseURL: `https://${config.server}.api.mailchimp.com/3.0`,
      auth: {
        username: 'anystring',
        password: config.apiKey,
      },
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/ping');
      return true;
    } catch (error) {
      this.logger.error('Mailchimp connection test failed', error);
      return false;
    }
  }

  // Lists
  async getLists(params?: { count?: number; offset?: number }) {
    const response = await this.client.get('/lists', { params });
    return response.data;
  }

  async getList(listId: string) {
    const response = await this.client.get(`/lists/${listId}`);
    return response.data;
  }

  // Members
  async getMembers(listId: string, params?: { count?: number; offset?: number }) {
    const response = await this.client.get(`/lists/${listId}/members`, { params });
    return response.data;
  }

  async getMember(listId: string, subscriberHash: string) {
    const response = await this.client.get(`/lists/${listId}/members/${subscriberHash}`);
    return response.data;
  }

  async addMember(listId: string, member: {
    email_address: string;
    status: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending';
    merge_fields?: any;
    tags?: string[];
  }) {
    const response = await this.client.post(`/lists/${listId}/members`, member);
    return response.data;
  }

  async updateMember(listId: string, subscriberHash: string, updates: any) {
    const response = await this.client.patch(
      `/lists/${listId}/members/${subscriberHash}`,
      updates
    );
    return response.data;
  }

  async deleteMember(listId: string, subscriberHash: string) {
    await this.client.delete(`/lists/${listId}/members/${subscriberHash}`);
  }

  // Campaigns
  async getCampaigns(params?: { count?: number; offset?: number; status?: string }) {
    const response = await this.client.get('/campaigns', { params });
    return response.data;
  }

  async getCampaign(campaignId: string) {
    const response = await this.client.get(`/campaigns/${campaignId}`);
    return response.data;
  }

  async createCampaign(campaign: any) {
    const response = await this.client.post('/campaigns', campaign);
    return response.data;
  }

  async sendCampaign(campaignId: string) {
    const response = await this.client.post(`/campaigns/${campaignId}/actions/send`);
    return response.data;
  }

  // Reports
  async getCampaignReports(params?: { count?: number; offset?: number }) {
    const response = await this.client.get('/reports', { params });
    return response.data;
  }

  async getCampaignReport(campaignId: string) {
    const response = await this.client.get(`/reports/${campaignId}`);
    return response.data;
  }

  // Tags
  async getTags(listId: string) {
    const response = await this.client.get(`/lists/${listId}/tag-search`);
    return response.data;
  }

  async addTagToMember(listId: string, subscriberHash: string, tags: string[]) {
    const response = await this.client.post(
      `/lists/${listId}/members/${subscriberHash}/tags`,
      { tags: tags.map((name) => ({ name, status: 'active' })) }
    );
    return response.data;
  }

  // Helper to generate subscriber hash from email
  generateSubscriberHash(email: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
  }
}

