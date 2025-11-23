import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';
import { AgentProfileService } from './agent-profile.service';
import { AgentProfileController } from './agent-profile.controller';
import { TeamEventHandler } from './team-event.handler';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    AuthModule,
    EmailModule,
    SubscriptionsModule,
    ConfigModule,
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    TeamController,
    InvitationController,
    AgentProfileController,
  ],
  providers: [
    TeamService,
    InvitationService,
    AgentProfileService,
    TeamEventHandler,
  ],
  exports: [
    TeamService,
    InvitationService,
    AgentProfileService,
  ],
})
export class TeamModule {}