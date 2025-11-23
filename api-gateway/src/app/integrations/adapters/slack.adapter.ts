import { Injectable, Logger } from '@nestjs/common';
import { WebClient } from '@slack/web-api';

export interface SlackConfig {
  token: string;
  signingSecret?: string;
}

@Injectable()
export class SlackAdapter {
  private readonly logger = new Logger(SlackAdapter.name);
  private client: WebClient;

  constructor(config: SlackConfig) {
    this.client = new WebClient(config.token);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.auth.test();
      return true;
    } catch (error) {
      this.logger.error('Slack connection test failed', error);
      return false;
    }
  }

  async getAuthInfo() {
    return this.client.auth.test();
  }

  // Messages
  async postMessage(params: {
    channel: string;
    text?: string;
    blocks?: any[];
    thread_ts?: string;
  }) {
    return this.client.chat.postMessage(params);
  }

  async updateMessage(params: {
    channel: string;
    ts: string;
    text?: string;
    blocks?: any[];
  }) {
    return this.client.chat.update(params);
  }

  async deleteMessage(params: { channel: string; ts: string }) {
    return this.client.chat.delete(params);
  }

  // Channels
  async listChannels(params?: { exclude_archived?: boolean; limit?: number }) {
    return this.client.conversations.list(params);
  }

  async getChannel(channel: string) {
    return this.client.conversations.info({ channel });
  }

  async createChannel(name: string, isPrivate = false) {
    return this.client.conversations.create({ name, is_private: isPrivate });
  }

  async inviteToChannel(channel: string, users: string[]) {
    return this.client.conversations.invite({ channel, users });
  }

  // Users
  async listUsers() {
    return this.client.users.list();
  }

  async getUser(user: string) {
    return this.client.users.info({ user });
  }

  async getUserByEmail(email: string) {
    return this.client.users.lookupByEmail({ email });
  }

  // Files
  async uploadFile(params: {
    channels?: string[];
    content?: string;
    file?: Buffer;
    filename?: string;
    title?: string;
  }) {
    return this.client.files.upload(params);
  }

  // Reactions
  async addReaction(params: { channel: string; timestamp: string; name: string }) {
    return this.client.reactions.add({
      channel: params.channel,
      timestamp: params.timestamp,
      name: params.name,
    });
  }

  // Webhooks
  async sendWebhook(webhookUrl: string, payload: any) {
    const axios = require('axios');
    return axios.post(webhookUrl, payload);
  }
}

