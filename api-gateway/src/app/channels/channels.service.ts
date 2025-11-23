import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { WhatsAppAdapter } from '@glavito/shared-conversation';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly whatsappAdapter: WhatsAppAdapter,
  ) {}

  create(createChannelDto: any) {
    return this.databaseService.channel.create({ data: createChannelDto });
  }

  findAll(tenantId?: string) {
    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }
    return this.databaseService.channel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.databaseService.channel.findUnique({ where: { id } });
  }

  update(id: string, updateChannelDto: any) {
    return this.databaseService.channel.update({ where: { id }, data: updateChannelDto });
  }

  remove(id: string) {
    return this.databaseService.channel.delete({ where: { id } });
  }

  async listWhatsAppTemplates() {
    return this.whatsappAdapter.listTemplates();
  }

  async refreshWhatsAppTemplates() {
    return this.whatsappAdapter.listTemplates(true);
  }

  async testSendWhatsAppTemplate(payload: { to: string; templateId: string; templateParams?: Record<string, string>; language?: string }) {
    const { to, templateId, templateParams, language } = payload
    return this.whatsappAdapter.sendMessage('', {
      recipientId: to,
      messageType: 'template' as any,
      templateId,
      templateParams,
      metadata: language ? { language } : undefined
    } as any)
  }

  async createWhatsAppTemplate(payload: {
    name: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    language: string;
    body: string;
    header?: string;
    footer?: string;
    buttons?: Array<{
      type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
      text?: string;
      url?: string;
      phoneNumber?: string;
    }>;
  }) {
    return this.whatsappAdapter.createTemplate(payload);
  }
}