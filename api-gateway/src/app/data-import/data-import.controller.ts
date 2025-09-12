/**
 * Data Import Controller
 * Handles data import and migration API endpoints
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DataImportService } from './data-import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportMappingDto, ImportJobDto } from './dto';

// Type definition for Multer file
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@ApiTags('data-import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('data-import')
export class DataImportController {
  constructor(private readonly dataImportService: DataImportService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload file for import' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'File uploaded and import job created successfully',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Request() req: any,
    @UploadedFile() file: MulterFile,
    @Body('type') type: 'customers' | 'tickets' | 'agents' | 'knowledge_base'
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!type) {
      throw new BadRequestException('Import type is required');
    }

    const { tenantId, userId } = req.user;
    return this.dataImportService.createImportJob(tenantId, userId, type, file);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get import jobs for tenant' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Import jobs retrieved successfully',
  })
  async getImportJobs(@Request() req: any) {
    const { tenantId } = req.user;
    return this.dataImportService.getImportJobs(tenantId);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get import job by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Import job retrieved successfully',
  })
  async getImportJob(
    @Request() req: any,
    @Param('jobId') jobId: string
  ) {
    const { tenantId } = req.user;
    return this.dataImportService.getImportJob(tenantId, jobId);
  }

  @Get('jobs/:jobId/preview')
  @ApiOperation({ summary: 'Get import preview' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Import preview retrieved successfully',
  })
  async getImportPreview(
    @Request() req: any,
    @Param('jobId') jobId: string
  ) {
    const { tenantId } = req.user;
    return this.dataImportService.getImportPreview(tenantId, jobId);
  }

  @Post('jobs/:jobId/start')
  @ApiOperation({ summary: 'Start import process' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Import started successfully',
  })
  async startImport(
    @Request() req: any,
    @Param('jobId') jobId: string,
    @Body('mappings') mappings: ImportMappingDto[]
  ) {
    if (!mappings || !Array.isArray(mappings)) {
      throw new BadRequestException('Field mappings are required');
    }

    const { tenantId } = req.user;
    return this.dataImportService.startImport(tenantId, jobId, mappings);
  }

  @Post('jobs/:jobId/cancel')
  @ApiOperation({ summary: 'Cancel import job' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Import cancelled successfully',
  })
  async cancelImport(
    @Request() req: any,
    @Param('jobId') jobId: string
  ) {
    const { tenantId } = req.user;
    return this.dataImportService.cancelImport(tenantId, jobId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get import templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Import templates retrieved successfully',
  })
  async getImportTemplates(@Query('type') type?: string) {
    const templates = {
      customers: {
        name: 'Customer Import Template',
        description: 'Template for importing customer data',
        requiredFields: ['name', 'email'],
        optionalFields: ['phone', 'company', 'tags'],
        sampleData: [
          {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            company: 'Acme Corp',
            tags: 'vip,enterprise',
          },
        ],
      },
      tickets: {
        name: 'Ticket Import Template',
        description: 'Template for importing ticket data',
        requiredFields: ['subject', 'description', 'customerEmail'],
        optionalFields: ['status', 'priority', 'category', 'assignedTo'],
        sampleData: [
          {
            subject: 'Login Issue',
            description: 'Unable to login to the system',
            customerEmail: 'customer@example.com',
            status: 'open',
            priority: 'high',
            category: 'technical',
          },
        ],
      },
      agents: {
        name: 'Agent Import Template',
        description: 'Template for importing agent data',
        requiredFields: ['name', 'email', 'role'],
        optionalFields: ['skills', 'department', 'isActive'],
        sampleData: [
          {
            name: 'Jane Smith',
            email: 'jane@company.com',
            role: 'agent',
            skills: 'technical,billing',
            department: 'support',
            isActive: 'true',
          },
        ],
      },
      knowledge_base: {
        name: 'Knowledge Base Import Template',
        description: 'Template for importing knowledge base articles',
        requiredFields: ['title', 'content', 'category'],
        optionalFields: ['tags', 'isPublished', 'author'],
        sampleData: [
          {
            title: 'Getting Started Guide',
            content: 'This guide will help you get started with our platform...',
            category: 'getting-started',
            tags: 'guide,tutorial,beginner',
            isPublished: 'true',
            author: 'Support Team',
          },
        ],
      },
    };

    if (type && templates[type as keyof typeof templates]) {
      return { [type]: templates[type as keyof typeof templates] };
    }

    return templates;
  }
}