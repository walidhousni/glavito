/**
 * Data Import and Migration Types
 * Shared types for data import, migration, and transformation
 */

// Base Import Types
export interface DataImportJob {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  sourceType: ImportSourceType;
  importType: ImportDataType;
  status: ImportJobStatus;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  skippedRecords: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  configuration: ImportConfiguration;
  fieldMapping: FieldMapping;
  validationRules: ValidationRules;
  previewData?: ImportPreviewData;
  errorLog: ImportError[];
  progressLog: ImportProgressEntry[];
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Import Source Types
export type ImportSourceType =
  | 'csv'
  | 'json'
  | 'xml'
  | 'excel'
  | 'zendesk'
  | 'freshdesk'
  | 'intercom'
  | 'helpscout'
  | 'salesforce'
  | 'hubspot'
  | 'jira'
  | 'slack'
  | 'custom';

// Import Data Types
export type ImportDataType =
  | 'customers'
  | 'tickets'
  | 'conversations'
  | 'knowledge_base'
  | 'users'
  | 'teams'
  | 'tags'
  | 'categories'
  | 'attachments'
  | 'custom_fields';

// Import Job Status
export type ImportJobStatus =
  | 'pending'
  | 'validating'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

// Import Configuration
export interface ImportConfiguration {
  batchSize: number;
  skipDuplicates: boolean;
  updateExisting: boolean;
  createMissing: boolean;
  validateData: boolean;
  preserveIds: boolean;
  handleRelationships: boolean;
  notifyOnCompletion: boolean;
  retryFailedRecords: boolean;
  maxRetries: number;
  delimiter?: string; // For CSV files
  encoding?: string;
  dateFormat?: string;
  timezone?: string;
  customSettings: Record<string, any>;
}

// Field Mapping
export interface FieldMapping {
  [sourceField: string]: FieldMappingRule;
}

export interface FieldMappingRule {
  targetField: string;
  required: boolean;
  dataType: FieldDataType;
  defaultValue?: any;
  transform?: FieldTransform;
  validation?: FieldValidation;
  condition?: FieldCondition;
}

export type FieldDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'email'
  | 'url'
  | 'phone'
  | 'json'
  | 'array'
  | 'reference';

// Field Transformations
export interface FieldTransform {
  type: TransformType;
  parameters: Record<string, any>;
}

export type TransformType =
  | 'trim'
  | 'lowercase'
  | 'uppercase'
  | 'capitalize'
  | 'replace'
  | 'regex'
  | 'split'
  | 'join'
  | 'format_date'
  | 'parse_json'
  | 'lookup'
  | 'custom';

// Field Validation
export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  enum?: any[];
  custom?: string; // Custom validation function name
}

// Field Conditions
export interface FieldCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'exists' | 'not_exists';
  value: any;
}

// Validation Rules
export interface ValidationRules {
  required: string[];
  unique: string[];
  email: string[];
  phone: string[];
  url: string[];
  date: string[];
  number: string[];
  custom: Record<string, ValidationRule>;
}

export interface ValidationRule {
  type: 'regex' | 'function' | 'lookup' | 'range' | 'length';
  parameters: Record<string, any>;
  errorMessage: string;
}

// Import Preview
export interface ImportPreviewData {
  headers: string[];
  sampleRows: any[][];
  detectedTypes: Record<string, FieldDataType>;
  statistics: ImportStatistics;
  issues: ImportIssue[];
}

export interface ImportStatistics {
  totalRows: number;
  emptyRows: number;
  duplicateRows: number;
  invalidRows: number;
  columnStats: Record<string, ColumnStatistics>;
}

export interface ColumnStatistics {
  name: string;
  type: FieldDataType;
  nullCount: number;
  uniqueCount: number;
  sampleValues: any[];
  issues: string[];
}

export interface ImportIssue {
  type: 'warning' | 'error';
  code: string;
  message: string;
  row?: number;
  column?: string;
  value?: any;
  suggestion?: string;
}

// Import Progress
export interface ImportProgressEntry {
  timestamp: Date;
  stage: ImportStage;
  progress: number; // 0-100
  message: string;
  details?: Record<string, any>;
}

export type ImportStage =
  | 'uploading'
  | 'validating'
  | 'parsing'
  | 'mapping'
  | 'transforming'
  | 'importing'
  | 'finalizing';

// Import Errors
export interface ImportError {
  id: string;
  type: ImportErrorType;
  code: string;
  message: string;
  row?: number;
  column?: string;
  value?: any;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion?: string;
  context?: Record<string, any>;
}

export type ImportErrorType =
  | 'validation'
  | 'transformation'
  | 'duplicate'
  | 'reference'
  | 'system'
  | 'network'
  | 'permission';

// Import Record
export interface DataImportRecord {
  id: string;
  importJobId: string;
  recordIndex: number;
  sourceId?: string;
  recordType: string;
  status: ImportRecordStatus;
  sourceData: Record<string, any>;
  transformedData?: Record<string, any>;
  targetId?: string;
  errorMessage?: string;
  warningMessages: string[];
  validationErrors: ValidationError[];
  processedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type ImportRecordStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'duplicate'
  | 'skipped';

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  value?: any;
}

// Import Templates
export interface DataImportTemplate {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  sourceType: ImportSourceType;
  importType: ImportDataType;
  fieldMapping: FieldMapping;
  validationRules: ValidationRules;
  configuration: ImportConfiguration;
  isSystem: boolean;
  isActive: boolean;
  usageCount: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Migration Plans
export interface DataMigrationPlan {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  sourceSystem: string;
  migrationSteps: MigrationStep[];
  configuration: MigrationConfiguration;
  status: MigrationStatus;
  totalSteps: number;
  completedSteps: number;
  estimatedDuration?: number;
  actualDuration?: number;
  startedAt?: Date;
  completedAt?: Date;
  errorLog: ImportError[];
  progressLog: ImportProgressEntry[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MigrationStep {
  id: string;
  name: string;
  description?: string;
  type: MigrationStepType;
  order: number;
  dependencies: string[];
  configuration: Record<string, any>;
  status: MigrationStepStatus;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  errorMessage?: string;
  metadata: Record<string, any>;
}

export type MigrationStepType =
  | 'export_data'
  | 'validate_data'
  | 'transform_data'
  | 'import_data'
  | 'verify_data'
  | 'cleanup_data'
  | 'update_references'
  | 'custom';

export type MigrationStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export type MigrationStatus =
  | 'draft'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface MigrationConfiguration {
  preserveTimestamps: boolean;
  preserveIds: boolean;
  batchSize: number;
  parallelProcessing: boolean;
  maxConcurrency: number;
  retryFailedSteps: boolean;
  maxRetries: number;
  backupBeforeMigration: boolean;
  validateAfterMigration: boolean;
  notifyOnCompletion: boolean;
  customSettings: Record<string, any>;
}

// Field Mappings
export interface ImportFieldMapping {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  sourceType: ImportSourceType;
  targetType: ImportDataType;
  mappings: FieldMapping;
  transformRules: Record<string, FieldTransform>;
  isDefault: boolean;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response DTOs
export interface CreateImportJobRequest {
  name: string;
  description?: string;
  sourceType: ImportSourceType;
  importType: ImportDataType;
  fileUrl?: string;
  fileName?: string;
  configuration?: Partial<ImportConfiguration>;
  fieldMapping?: FieldMapping;
  validationRules?: Partial<ValidationRules>;
  templateId?: string;
}

export interface UpdateImportJobRequest {
  name?: string;
  description?: string;
  configuration?: Partial<ImportConfiguration>;
  fieldMapping?: FieldMapping;
  validationRules?: Partial<ValidationRules>;
  status?: ImportJobStatus;
}

export interface StartImportJobRequest {
  validateFirst?: boolean;
  notifyOnCompletion?: boolean;
  batchSize?: number;
}

export interface CreateImportTemplateRequest {
  name: string;
  description?: string;
  sourceType: ImportSourceType;
  importType: ImportDataType;
  fieldMapping: FieldMapping;
  validationRules?: ValidationRules;
  configuration?: ImportConfiguration;
}

export interface CreateMigrationPlanRequest {
  name: string;
  description?: string;
  sourceSystem: string;
  migrationSteps: Omit<MigrationStep, 'id' | 'status' | 'startedAt' | 'completedAt' | 'duration' | 'errorMessage'>[];
  configuration?: Partial<MigrationConfiguration>;
}

export interface FileUploadRequest {
  file: Blob | ArrayBuffer | string;
  sourceType: ImportSourceType;
  importType: ImportDataType;
  encoding?: string;
  delimiter?: string;
}

export interface ImportPreviewRequest {
  fileUrl: string;
  sourceType: ImportSourceType;
  importType: ImportDataType;
  sampleSize?: number;
  encoding?: string;
  delimiter?: string;
}

export interface BulkImportRequest {
  jobs: CreateImportJobRequest[];
  executeSequentially?: boolean;
  stopOnError?: boolean;
  notifyOnCompletion?: boolean;
}

// Import Results
export interface ImportJobResult {
  jobId: string;
  status: ImportJobStatus;
  summary: ImportSummary;
  errors: ImportError[];
  warnings: ImportIssue[];
  duration: number;
  completedAt: Date;
}

export interface ImportSummary {
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  skippedRecords: number;
  createdRecords: number;
  updatedRecords: number;
  recordsByType: Record<string, number>;
}

// Import Analytics
export interface ImportAnalytics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalRecordsImported: number;
  averageJobDuration: number;
  successRate: number;
  commonErrors: Array<{
    code: string;
    message: string;
    count: number;
    percentage: number;
  }>;
  importsByType: Array<{
    type: ImportDataType;
    count: number;
    successRate: number;
  }>;
  importsBySource: Array<{
    source: ImportSourceType;
    count: number;
    successRate: number;
  }>;
  trends: Array<{
    period: string;
    jobs: number;
    records: number;
    successRate: number;
  }>;
}

// Source System Connectors
export interface SourceSystemConnector {
  id: string;
  name: string;
  type: ImportSourceType;
  description: string;
  supportedDataTypes: ImportDataType[];
  authenticationMethods: AuthenticationMethod[];
  configuration: ConnectorConfiguration;
  isActive: boolean;
  version: string;
}

export interface AuthenticationMethod {
  type: 'api_key' | 'oauth2' | 'basic_auth' | 'token' | 'custom';
  name: string;
  description: string;
  fields: AuthenticationField[];
}

export interface AuthenticationField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select';
  required: boolean;
  description?: string;
  options?: string[];
  validation?: FieldValidation;
}

export interface ConnectorConfiguration {
  baseUrl?: string;
  apiVersion?: string;
  rateLimit?: {
    requests: number;
    period: number; // seconds
  };
  pagination?: {
    type: 'offset' | 'cursor' | 'page';
    maxPageSize: number;
  };
  customSettings: Record<string, any>;
}

// Export Types
export interface DataExportJob {
  id: string;
  tenantId: string;
  name: string;
  exportType: ImportDataType;
  format: 'csv' | 'json' | 'xml' | 'excel';
  filters: Record<string, any>;
  status: ImportJobStatus;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  recordCount: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface CreateExportJobRequest {
  name: string;
  exportType: ImportDataType;
  format: 'csv' | 'json' | 'xml' | 'excel';
  filters?: Record<string, any>;
  includeFields?: string[];
  excludeFields?: string[];
}

// Validation Constants
export const IMPORT_VALIDATION_RULES = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxRecords: 100000,
  supportedFormats: ['csv', 'json', 'xml', 'xlsx'],
  requiredFields: {
    customers: ['email'],
    tickets: ['subject', 'description'],
    conversations: ['ticketId', 'message'],
    users: ['email', 'firstName', 'lastName'],
  },
} as const;

export const IMPORT_ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_DATA_TYPE: 'INVALID_DATA_TYPE',
  REFERENCE_NOT_FOUND: 'REFERENCE_NOT_FOUND',
  TRANSFORMATION_FAILED: 'TRANSFORMATION_FAILED',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
} as const;/**
 * D
ata Import Types
 * Additional types for data import functionality
 */

export interface ImportJob {
  id: string;
  tenantId: string;
  type: 'customers' | 'tickets' | 'agents' | 'knowledge_base';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  fileName: string;
  fileSize: number;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: ImportError[];
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  metadata: Record<string, any>;
}

// ImportError is already defined above with different properties

export interface ImportMapping {
  sourceField: string;
  targetField: string;
  required: boolean;
  transform?: (value: any) => any;
  validate?: (value: any) => boolean;
}

export interface ImportPreview {
  headers: string[];
  sampleData: Record<string, any>[];
  suggestedMappings: ImportMapping[];
  validationResults: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    warnings: ImportError[];
  };
}

export interface ImportTemplate {
  name: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  sampleData: Record<string, any>[];
}

export interface ImportProgress {
  jobId: string;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  percentage: number;
  estimatedTimeRemaining?: number;
}

export interface CustomerImportData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt?: Date;
}

export interface TicketImportData {
  subject: string;
  description: string;
  customerEmail: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  tags?: string[];
  assignedTo?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AgentImportData {
  name: string;
  email: string;
  role: 'agent' | 'supervisor' | 'admin';
  skills?: string[];
  department?: string;
  isActive: boolean;
}

export interface KnowledgeBaseImportData {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  isPublished: boolean;
  author?: string;
  createdAt?: Date;
}