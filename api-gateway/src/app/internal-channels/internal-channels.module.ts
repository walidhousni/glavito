import { Module } from '@nestjs/common';
import { InternalChannelsController } from './internal-channels.controller';
import { InternalChannelsService } from './internal-channels.service';
import { CollabModule } from '../collab/collab.module';

@Module({
  imports: [CollabModule],
  controllers: [InternalChannelsController],
  providers: [InternalChannelsService],
  exports: [InternalChannelsService],
})
export class InternalChannelsModule {}

