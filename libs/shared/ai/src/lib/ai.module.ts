import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIIntelligenceService } from './ai-intelligence.service';
import { VectorStoreService } from './vector-store.service';
import { DatabaseModule } from '@glavito/shared-database';
import { KafkaModule } from '@glavito/shared-kafka';

@Global()
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    KafkaModule
  ],
  providers: [AIIntelligenceService, VectorStoreService],
  exports: [AIIntelligenceService, VectorStoreService],
})
export class AIModule {}