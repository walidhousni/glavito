import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SLAService } from './sla.service';
import { SLAController } from './sla.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    ScheduleModule,
    NotificationsModule,
    forwardRef(() => TicketsModule),
  ],
  controllers: [SLAController],
  providers: [SLAService],
  exports: [SLAService],
})
export class SLAModule {}