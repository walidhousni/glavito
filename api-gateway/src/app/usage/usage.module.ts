import { Module, Global } from '@nestjs/common';
import { DatabaseModule } from '@glavito/shared-database';
import { UsageTrackingService } from './usage-tracking.service';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [UsageTrackingService],
  exports: [UsageTrackingService],
})
export class UsageModule {}
