import { Module } from '@nestjs/common';
import { TicketCollabController } from './ticket-collab.controller';
import { TicketCollabService } from './ticket-collab.service';
import { CollabModule } from '../collab/collab.module';

@Module({
  imports: [CollabModule],
  controllers: [TicketCollabController],
  providers: [TicketCollabService],
  exports: [TicketCollabService],
})
export class TicketCollabModule {}

