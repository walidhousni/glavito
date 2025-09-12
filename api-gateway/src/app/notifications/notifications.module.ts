import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { DatabaseModule } from '@glavito/shared-database'
import { NotificationsService } from './notifications.service'
import { NotificationsController } from './notifications.controller'

@Module({
  imports: [HttpModule, DatabaseModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}


