import { Module } from '@nestjs/common';
import { DatabaseModule } from '@glavito/shared-database';
// @ts-ignore
import { LocalizationService } from './localization.service';
// @ts-ignore
import { LocalizationController } from './localization.controller';

@Module({
  imports: [DatabaseModule],
  providers: [LocalizationService],
  controllers: [LocalizationController],
  exports: [LocalizationService],
})
export class LocalizationModule {}


