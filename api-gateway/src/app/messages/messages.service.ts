import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { ConversationsGateway } from '../conversations/conversations.gateway';

@Injectable()
export class MessagesService {
  constructor(private readonly databaseService: DatabaseService, private readonly convGateway: ConversationsGateway) {}

  create(createMessageDto: any) {
    return this.databaseService.message.create({ data: createMessageDto }).then((msg) => {
      const payload = { event: 'message.created', message: { id: msg.id, conversationId: msg.conversationId, senderId: msg.senderId, senderType: msg.senderType, content: msg.content, messageType: msg.messageType, createdAt: msg.createdAt } };
      // Broadcast to conversation room and tenant
      this.convGateway.broadcast('message.created', payload, undefined, msg.conversationId);
      return msg;
    });
  }

  findAll() {
    return this.databaseService.message.findMany();
  }

  findOne(id: string) {
    return this.databaseService.message.findUnique({ where: { id } });
  }

  update(id: string, updateMessageDto: any) {
    return this.databaseService.message.update({ where: { id }, data: updateMessageDto });
  }

  remove(id: string) {
    return this.databaseService.message.delete({ where: { id } });
  }
}