import { Module } from '@nestjs/common';
import { DatabaseModule } from '@glavito/shared-database';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { TemplatesSeedController } from './templates-seed.controller';
import { IndustryTemplateSeeder } from './industry-template.seeder';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '24h') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TemplatesController, TemplatesSeedController],
  providers: [TemplatesService, IndustryTemplateSeeder],
  exports: [TemplatesService, IndustryTemplateSeeder],
})
export class TemplatesModule {}

