import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { DatabaseModule } from '@glavito/shared-database'
import { NotificationsService } from './notifications.service'
import { NotificationsGateway } from './notifications.gateway'
import { NotificationsController } from './notifications.controller'

@Module({
  imports: [HttpModule, DatabaseModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}


