import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { UsageModule } from '../usage/usage.module';

@Module({
  imports: [
    ConfigModule,
    UsageModule,
    // Use in-memory storage; FilesService will handle persistence to S3 or local fs
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}