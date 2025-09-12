import { Module } from '@nestjs/common';
import { DatabaseModule } from '@glavito/shared-database';
import { AIModule } from '@glavito/shared-ai';
import { TicketsModule } from '../tickets/tickets.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [DatabaseModule, AIModule, TicketsModule, KnowledgeModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule { }


