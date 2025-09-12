/**
 * Data Import Service
 * Handles customer and ticket data migration from external platforms
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@glavito/shared-database';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { ImportStatus } from './dto';
// Using built-in CSV parsing
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { ImportJobDto, ImportErrorDto, ImportMappingDto, ImportPreviewDto } from './dto';

// Custom interface for file uploads
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class DataImportService {
  private readonly logger = new Logger(DataImportService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create import job and analyze file
   */
  async createImportJob(
    tenantId: string,
    userId: string,
    type: ImportJobDto['type'],
    file: MulterFile
  ): Promise<ImportJobDto> {
    try {
      this.logger.log(`Creating import job for tenant: ${tenantId}, type: ${type}`);

      // Validate file
      this.validateImportFile(file);

      // Create job record
      const job: ImportJobDto = {
        id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        type,
        status: ImportStatus.PENDING,
        fileName: file.originalname,
        fileSize: file.size,
        totalRecords: 0,
        processedRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        errors: [],
        createdBy: userId,
        metadata: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          uploadedAt: new Date(),
        },
      };

      // Save file to temporary location
      const filePath = await this.saveImportFile(job.id, file);
      job.metadata.filePath = filePath;

      // Analyze file and get preview
      const preview = await this.analyzeImportFile(job, filePath);
      job.totalRecords = preview.validationResults.totalRows;
      job.metadata.preview = preview;

      // Save job to database
      await this.saveImportJob(job);

      this.logger.log(`Import job created successfully: ${job.id}`);
      return job;
    } catch (error) {
      this.logger.error(`Failed to create import job: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Failed to create import job');
    }
  }

  /**
   * Get import job by ID
   */
  async getImportJob(tenantId: string, jobId: string): Promise<ImportJobDto> {
    try {
      const job = await this.loadImportJob(jobId);
      
      if (!job || job.tenantId !== tenantId) {
        throw new NotFoundException('Import job not found');
      }

      return job;
    } catch (error) {
      this.logger.error(`Failed to get import job: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to get import job');
    }
  }

  /**
   * Get all import jobs for a tenant
   */
  async getImportJobs(tenantId: string): Promise<ImportJobDto[]> {
    try {
      const jobs = await this.databaseService.importJob.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });

      return jobs.map((job: any) => ({
        id: job.id,
        tenantId: job.tenantId,
        type: job.type as ImportJobDto['type'],
        status: job.status as ImportJobDto['status'],
        fileName: job.fileName,
        fileSize: job.fileSize,
        totalRecords: job.totalRecords,
        processedRecords: job.processedRecords,
        successfulRecords: job.successfulRecords,
        failedRecords: job.failedRecords,
        errors: job.errors as ImportErrorDto[],
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdBy: job.createdBy,
        metadata: job.metadata as Record<string, any>,
      }));
    } catch (error) {
      this.logger.error(`Failed to get import jobs: ${error instanceof Error ? error.message : String(error)}`);
      throw new BadRequestException('Failed to get import jobs');
    }
  }

  /**
   * Get import preview for a job
   */
  async getImportPreview(tenantId: string, jobId: string): Promise<ImportPreviewDto> {
    try {
      const job = await this.getImportJob(tenantId, jobId);
      
      if (!job.metadata?.preview) {
        throw new NotFoundException('Import preview not found');
      }

      return job.metadata.preview as ImportPreviewDto;
    } catch (error) {
      this.logger.error(`Failed to get import preview: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to get import preview');
    }
  }

  /**
   * Start import process with mappings
   */
  async startImport(
    tenantId: string,
    jobId: string,
    mappings: ImportMappingDto[]
  ): Promise<ImportJobDto> {
    try {
      const job = await this.getImportJob(tenantId, jobId);

      if (job.status !== 'pending') {
        throw new BadRequestException('Import job is not in pending state');
      }

      // Update job status
      await this.databaseService.importJob.update({
        where: { id: jobId },
        data: {
          status: ImportStatus.PROCESSING,
          startedAt: new Date(),
          metadata: {
            ...job.metadata,
            mappings,
          },
        },
      });

      // Start processing in background
      this.processImportJob(job, mappings).catch(error => {
        this.logger.error(`Import job ${jobId} failed: ${error instanceof Error ? error.message : String(error)}`);
      });

      return { ...job, status: 'processing', startedAt: new Date() };
    } catch (error) {
      this.logger.error(`Failed to start import: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to start import');
    }
  }

  /**
   * Cancel import job
   */
  async cancelImport(tenantId: string, jobId: string): Promise<ImportJobDto> {
    try {
      const job = await this.getImportJob(tenantId, jobId);

      if (job.status === 'completed' || job.status === 'failed') {
        throw new BadRequestException('Cannot cancel completed or failed job');
      }

      await this.databaseService.importJob.update({
        where: { id: jobId },
        data: {
          status: ImportStatus.CANCELLED,
          completedAt: new Date(),
        },
      });

      return { ...job, status: 'cancelled', completedAt: new Date() };
    } catch (error) {
      this.logger.error(`Failed to cancel import: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to cancel import');
    }
  }

  // Private methods for file handling and processing
  private validateImportFile(file: MulterFile): void {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Please upload CSV or Excel files.');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
  }

  private async saveImportFile(jobId: string, file: MulterFile): Promise<string> {
    const uploadDir = path.join(process.cwd(), 'uploads', 'imports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, `${jobId}_${file.originalname}`);
    fs.writeFileSync(filePath, file.buffer);
    return filePath;
  }

  private async analyzeImportFile(job: ImportJobDto, filePath: string): Promise<ImportPreviewDto> {
    // Implementation for file analysis
    // This would parse the file and return preview data
    // For now, returning a basic structure
    return {
      headers: [],
      sampleData: [],
      suggestedMappings: [],
      validationResults: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        warnings: [],
      },
    };
  }

  private async saveImportJob(job: ImportJobDto): Promise<void> {
    await this.databaseService.importJob.create({
      data: {
        id: job.id,
        tenantId: job.tenantId,
        type: job.type,
        status: job.status,
        fileName: job.fileName,
        fileSize: job.fileSize,
        totalRecords: job.totalRecords,
        processedRecords: job.processedRecords,
        successfulRecords: job.successfulRecords,
        failedRecords: job.failedRecords,
        errors: job.errors,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdBy: job.createdBy,
        metadata: job.metadata,
      },
    });
  }

  private async loadImportJob(jobId: string): Promise<ImportJobDto | null> {
    const job = await this.databaseService.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job) return null;

    return {
      id: job.id,
      tenantId: job.tenantId,
      type: job.type as ImportJobDto['type'],
      status: job.status as ImportJobDto['status'],
      fileName: job.fileName,
      fileSize: job.fileSize,
      totalRecords: job.totalRecords,
      processedRecords: job.processedRecords,
      successfulRecords: job.successfulRecords,
      failedRecords: job.failedRecords,
      errors: job.errors as ImportErrorDto[],
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdBy: job.createdBy,
      metadata: job.metadata as Record<string, any>,
    };
  }

  private async processImportJob(job: ImportJobDto, mappings: ImportMappingDto[]): Promise<void> {
    // Implementation for processing import job
    // This would read the file, apply mappings, and import data
    this.logger.log(`Processing import job: ${job.id}`);
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update job status
    await this.databaseService.importJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        processedRecords: job.totalRecords,
        successfulRecords: job.totalRecords,
      },
    });
    
    this.logger.log(`Import job completed: ${job.id}`);
  }
}