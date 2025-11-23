import { Controller, Get, Post, UseInterceptors, UploadedFile, Param, UseGuards, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesService } from './files.service';

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  uploadFile(@UploadedFile() file: any) {
    return this.filesService.uploadFile(file);
  }

  @Get(':id')
  getFile(@Param('id') id: string) {
    return this.filesService.getFile(id);
  }

  // Media proxy: returns a signed URL for a given stored key (S3 or local)
  @Get('proxy/by-key/:key')
  async getSignedProxy(
    @Param('key') key: string,
    @Query('ttl') ttl?: string,
  ) {
    const seconds = Math.max(60, Math.min(24 * 60 * 60, parseInt(ttl || '3600', 10)))
    return this.filesService.getSignedUrlByKey(key, seconds)
  }
}