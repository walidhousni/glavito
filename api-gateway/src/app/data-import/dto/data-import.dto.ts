/**
 * Data Import DTOs
 * Defines data transfer objects for data import operations
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsArray, IsNumber, IsDate, IsBoolean } from 'class-validator';

export enum ImportType {
  CUSTOMERS = 'customers',
  TICKETS = 'tickets',
  AGENTS = 'agents',
  KNOWLEDGE_BASE = 'knowledge_base'
}

export enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum ErrorSeverity {
  ERROR = 'error',
  WARNING = 'warning'
}

export class ImportErrorDto {
  @ApiProperty({ description: 'Row number where error occurred' })
  @IsNumber()
  row: number = 0;

  @ApiProperty({ description: 'Field name that caused the error', required: false })
  @IsOptional()
  @IsString()
  field?: string;

  @ApiProperty({ description: 'Error message' })
  @IsString()
  message: string = '';

  @ApiProperty({ description: 'Error severity level' })
  @IsEnum(ErrorSeverity)
  severity: ErrorSeverity = ErrorSeverity.ERROR;

  @ApiProperty({ description: 'Additional error data', required: false })
  @IsOptional()
  data?: Record<string, any>;
}

export class ImportMappingDto {
  @ApiProperty({ description: 'Source field name from import file' })
  @IsString()
  sourceField: string = '';

  @ApiProperty({ description: 'Target field name in system' })
  @IsString()
  targetField: string = '';

  @ApiProperty({ description: 'Whether this field is required' })
  @IsBoolean()
  required: boolean = false;

  @ApiProperty({ description: 'Transformation function for field value', required: false })
  @IsOptional()
  transform?: (value: any) => any;

  @ApiProperty({ description: 'Validation function for field value', required: false })
  @IsOptional()
  validate?: (value: any) => boolean;
}

export class ImportJobDto {
  @ApiProperty({ description: 'Unique job identifier' })
  @IsString()
  id: string = '';

  @ApiProperty({ description: 'Tenant identifier' })
  @IsString()
  tenantId: string = '';

  @ApiProperty({ description: 'Type of data being imported' })
  @IsEnum(ImportType)
  type: ImportType = ImportType.CUSTOMERS;

  @ApiProperty({ description: 'Current status of the import job' })
  @IsEnum(ImportStatus)
  status: ImportStatus = ImportStatus.PENDING;

  @ApiProperty({ description: 'Original file name' })
  @IsString()
  fileName: string = '';

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  fileSize: number = 0;

  @ApiProperty({ description: 'Total number of records in file' })
  @IsNumber()
  totalRecords: number = 0;

  @ApiProperty({ description: 'Number of processed records' })
  @IsNumber()
  processedRecords: number = 0;

  @ApiProperty({ description: 'Number of successfully imported records' })
  @IsNumber()
  successfulRecords: number = 0;

  @ApiProperty({ description: 'Number of failed records' })
  @IsNumber()
  failedRecords: number = 0;

  @ApiProperty({ description: 'List of import errors' })
  @IsArray()
  errors: ImportErrorDto[] = [];

  @ApiProperty({ description: 'When import started', required: false })
  @IsOptional()
  @IsDate()
  startedAt?: Date;

  @ApiProperty({ description: 'When import completed', required: false })
  @IsOptional()
  @IsDate()
  completedAt?: Date;

  @ApiProperty({ description: 'User who created the import job' })
  @IsString()
  createdBy: string = '';

  @ApiProperty({ description: 'Additional metadata' })
  @IsOptional()
  metadata: Record<string, any> = {};
}

export class ImportPreviewDto {
  @ApiProperty({ description: 'Column headers from the import file' })
  @IsArray()
  headers: string[] = [];

  @ApiProperty({ description: 'Sample data rows from the file' })
  @IsArray()
  sampleData: Record<string, any>[] = [];

  @ApiProperty({ description: 'Suggested field mappings' })
  @IsArray()
  suggestedMappings: ImportMappingDto[] = [];

  @ApiProperty({ description: 'Validation results for the import data' })
  validationResults: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    warnings: ImportErrorDto[];
  } = { totalRows: 0, validRows: 0, invalidRows: 0, warnings: [] };
}

export class CustomerImportDataDto {
  @ApiProperty({ description: 'Customer name' })
  @IsString()
  name: string = '';

  @ApiProperty({ description: 'Customer email address' })
  @IsString()
  email: string = '';

  @ApiProperty({ description: 'Customer phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Customer company name', required: false })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiProperty({ description: 'Customer tags', required: false })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiProperty({ description: 'Custom fields', required: false })
  @IsOptional()
  customFields?: Record<string, any>;

  @ApiProperty({ description: 'Creation date', required: false })
  @IsOptional()
  @IsDate()
  createdAt?: Date;
}

export class TicketImportDataDto {
  @ApiProperty({ description: 'Ticket subject' })
  @IsString()
  subject: string = '';

  @ApiProperty({ description: 'Ticket description' })
  @IsString()
  description: string = '';

  @ApiProperty({ description: 'Customer email address' })
  @IsString()
  customerEmail: string = '';

  @ApiProperty({ description: 'Ticket status' })
  @IsString()
  status: 'open' | 'pending' | 'resolved' | 'closed' = 'open';

  @ApiProperty({ description: 'Ticket priority' })
  @IsString()
  priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

  @ApiProperty({ description: 'Ticket category', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Ticket tags', required: false })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiProperty({ description: 'Assigned agent email', required: false })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiProperty({ description: 'Creation date', required: false })
  @IsOptional()
  @IsDate()
  createdAt?: Date;

  @ApiProperty({ description: 'Last update date', required: false })
  @IsOptional()
  @IsDate()
  updatedAt?: Date;
}

export class AgentImportDataDto {
  @ApiProperty({ description: 'Agent name' })
  @IsString()
  name: string = '';

  @ApiProperty({ description: 'Agent email address' })
  @IsString()
  email: string = '';

  @ApiProperty({ description: 'Agent role' })
  @IsString()
  role: 'agent' | 'supervisor' | 'admin' = 'agent';

  @ApiProperty({ description: 'Agent skills', required: false })
  @IsOptional()
  @IsArray()
  skills?: string[];

  @ApiProperty({ description: 'Agent department', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: 'Whether agent is active' })
  @IsBoolean()
  isActive: boolean = true;
}

export class KnowledgeBaseImportDataDto {
  @ApiProperty({ description: 'Article title' })
  @IsString()
  title: string = '';

  @ApiProperty({ description: 'Article content' })
  @IsString()
  content: string = '';

  @ApiProperty({ description: 'Article category' })
  @IsString()
  category: string = '';

  @ApiProperty({ description: 'Article tags', required: false })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiProperty({ description: 'Whether article is published' })
  @IsBoolean()
  isPublished: boolean = false;

  @ApiProperty({ description: 'Article author', required: false })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({ description: 'Creation date', required: false })
  @IsOptional()
  @IsDate()
  createdAt?: Date;
}