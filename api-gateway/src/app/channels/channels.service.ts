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

  findAll() {
    return this.databaseService.channel.findMany();
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
}