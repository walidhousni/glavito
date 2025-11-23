import { IsString, IsNumber, IsBoolean, IsEnum, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum SLAStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  BREACHED = 'breached',
  CANCELLED = 'cancelled',
}

export enum EscalationLevel {
  LEVEL_1 = 1,
  LEVEL_2 = 2,
  LEVEL_3 = 3,
  LEVEL_4 = 4,
  LEVEL_5 = 5,
}

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  WEBHOOK = 'webhook',
  PUSH = 'push',
}

export enum ConditionType {
  PRIORITY = 'priority',
  CATEGORY = 'category',
  TAG = 'tag',
  CUSTOMER_TYPE = 'customer_type',
  CHANNEL = 'channel',
}

export enum Operator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
}

export class SLATargetDto {
  @ApiProperty({ description: 'Response time target in minutes' })
  @IsNumber()
  responseTime = 60;

  @ApiProperty({ description: 'Resolution time target in minutes' })
  @IsNumber()
  resolutionTime = 240;

  @ApiProperty({ description: 'Business hours enabled' })
  @IsBoolean()
  businessHoursEnabled = true;
}

export class BusinessHoursDto {
  @ApiProperty({ description: 'Business hours enabled' })
  @IsBoolean()
  enabled = true;

  @ApiProperty({ description: 'Start time' })
  @IsString()
  start = '09:00';

  @ApiProperty({ description: 'End time' })
  @IsString()
  end = '17:00';

  @ApiProperty({ description: 'Timezone' })
  @IsString()
  timezone = 'UTC';
}

export class WeeklyScheduleDto {
  @ApiProperty({ description: 'Monday business hours' })
  @ValidateNested()
  @Type(() => BusinessHoursDto)
  monday = new BusinessHoursDto();

  @ApiProperty({ description: 'Tuesday business hours' })
  @ValidateNested()
  @Type(() => BusinessHoursDto)
  tuesday = new BusinessHoursDto();

  @ApiProperty({ description: 'Wednesday business hours' })
  @ValidateNested()
  @Type(() => BusinessHoursDto)
  wednesday = new BusinessHoursDto();

  @ApiProperty({ description: 'Thursday business hours' })
  @ValidateNested()
  @Type(() => BusinessHoursDto)
  thursday = new BusinessHoursDto();

  @ApiProperty({ description: 'Friday business hours' })
  @ValidateNested()
  @Type(() => BusinessHoursDto)
  friday = new BusinessHoursDto();

  @ApiProperty({ description: 'Saturday business hours' })
  @ValidateNested()
  @Type(() => BusinessHoursDto)
  saturday = new BusinessHoursDto();

  @ApiProperty({ description: 'Sunday business hours' })
  @ValidateNested()
  @Type(() => BusinessHoursDto)
  sunday = new BusinessHoursDto();
}

export class EscalationRuleDto {
  @ApiProperty({ description: 'Escalation level' })
  @IsNumber()
  level = 1;

  @ApiProperty({ description: 'Time threshold in minutes' })
  @IsNumber()
  timeThreshold = 30;

  @ApiProperty({ description: 'Action to take' })
  @IsString()
  action = 'notify_manager';

  @ApiProperty({ description: 'Recipients' })
  @IsArray()
  recipients = [];

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  @IsOptional()
  message?: string;
}

export class NotificationSettingDto {
  @ApiProperty({ description: 'Notification type' })
  @IsString()
  type = 'email';

  @ApiProperty({ description: 'Notification recipients' })
  @IsArray()
  recipients = [];

  @ApiProperty({ description: 'Notification template' })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiProperty({ description: 'Notification conditions' })
  @IsArray()
  conditions = [];
}

export class SLAConditionDto {
  @ApiProperty({ description: 'Condition type' })
  @IsString()
  type = 'priority';

  @ApiProperty({ description: 'Condition operator' })
  @IsString()
  operator = 'equals';

  @ApiProperty({ description: 'Condition value' })
  @IsString()
  value = '';

  @ApiProperty({ description: 'Whether condition is required' })
  @IsBoolean()
  required = true;
}

export class CreateSLAPolicyDto {
  @ApiProperty({ description: 'SLA policy name' })
  @IsString()
  name = '';

  @ApiProperty({ description: 'SLA policy description' })
  @IsString()
  @IsOptional()
  description = '';

  @ApiProperty({ description: 'Priority level' })
  @IsEnum(Priority)
  priority = 'medium';

  @ApiProperty({ description: 'Whether the policy is active' })
  @IsBoolean()
  isActive = true;

  @ApiProperty({ description: 'Conditions to apply this SLA' })
  @IsArray()
  conditions = [];

  @ApiProperty({ description: 'Response and resolution time targets' })
  @ValidateNested()
  @Type(() => SLATargetDto)
  targets = new SLATargetDto();

  @ApiProperty({ description: 'Business hours configuration' })
  @IsOptional()
  businessHours = {};

  @ApiProperty({ description: 'Holiday calendar' })
  @IsArray()
  holidays = [];

  @ApiProperty({ description: 'Escalation configuration' })
  @IsArray()
  escalationRules = [];

  @ApiProperty({ description: 'Notification settings' })
  @IsArray()
  notifications = [];

  @ApiProperty({ description: 'Additional metadata' })
  @IsOptional()
  metadata = {};
}

export class UpdateSLAPolicyDto {
  @ApiProperty({ description: 'SLA policy name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'SLA policy description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Priority level' })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @ApiProperty({ description: 'Whether the policy is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Conditions to apply this SLA' })
  @IsArray()
  @IsOptional()
  conditions?: Array<Record<string, unknown>>;

  @ApiProperty({ description: 'Response and resolution time targets' })
  @ValidateNested()
  @Type(() => SLATargetDto)
  @IsOptional()
  targets?: SLATargetDto;

  @ApiProperty({ description: 'Business hours configuration' })
  @IsOptional()
  businessHours?: any;

  @ApiProperty({ description: 'Holiday calendar' })
  @IsArray()
  @IsOptional()
  holidays?: string[];

  @ApiProperty({ description: 'Escalation configuration' })
  @IsArray()
  @IsOptional()
  escalationRules?: Array<EscalationRuleDto>;

  @ApiProperty({ description: 'Notification settings' })
  @IsArray()
  @IsOptional()
  notifications?: Array<NotificationSettingDto>;

  @ApiProperty({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: any;
}

export class CreateSLAInstanceDto {
  @ApiProperty({ description: 'SLA policy ID' })
  @IsString()
  slaId = '';

  @ApiProperty({ description: 'Ticket ID' })
  @IsString()
  ticketId = '';

  @ApiProperty({ description: 'SLA instance status' })
  @IsEnum(SLAStatus)
  status = 'active';

  @ApiProperty({ description: 'First response due date' })
  @IsOptional()
  firstResponseDue?: Date;

  @ApiProperty({ description: 'Resolution due date' })
  @IsOptional()
  resolutionDue?: Date;

  @ApiProperty({ description: 'Paused duration in minutes' })
  @IsNumber()
  pausedDuration = 0;

  @ApiProperty({ description: 'Breach count' })
  @IsNumber()
  breachCount = 0;

  @ApiProperty({ description: 'Escalation level' })
  @IsNumber()
  escalationLevel = 0;

  @ApiProperty({ description: 'Additional metadata' })
  @IsOptional()
  metadata = {};
}

export class UpdateSLAInstanceDto {
  @ApiProperty({ description: 'SLA instance status' })
  @IsEnum(SLAStatus)
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'First response due date' })
  @IsOptional()
  firstResponseDue?: Date;

  @ApiProperty({ description: 'Resolution due date' })
  @IsOptional()
  resolutionDue?: Date;

  @ApiProperty({ description: 'Paused duration in minutes' })
  @IsNumber()
  @IsOptional()
  pausedDuration?: number;

  @ApiProperty({ description: 'Breach count' })
  @IsNumber()
  @IsOptional()
  breachCount?: number;

  @ApiProperty({ description: 'Escalation level' })
  @IsNumber()
  @IsOptional()
  escalationLevel?: number;

  @ApiProperty({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: any;
}

export class TicketEventDto {
  @ApiProperty({ description: 'Event type' })
  @IsString()
  type = '';

  @ApiProperty({ description: 'Ticket ID' })
  @IsString()
  ticketId = '';

  @ApiProperty({ description: 'Event data' })
  @IsOptional()
  data = {};

  @ApiProperty({ description: 'Timestamp' })
  @IsOptional()
  timestamp?: Date;
}

export class SLAQueryDto {
  @ApiProperty({ description: 'Tenant ID' })
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiProperty({ description: 'SLA policy ID' })
  @IsString()
  @IsOptional()
  slaId?: string;

  @ApiProperty({ description: 'Ticket ID' })
  @IsString()
  @IsOptional()
  ticketId?: string;

  @ApiProperty({ description: 'Status filter' })
  @IsEnum(SLAStatus)
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Priority filter' })
  @IsEnum(Priority)
  @IsOptional()
  priority?: string;

  @ApiProperty({ description: 'Include breached instances' })
  @IsBoolean()
  @IsOptional()
  includeBreached?: boolean;

  @ApiProperty({ description: 'Start date for metrics/query filtering' })
  @IsOptional()
  startDate?: Date;

  @ApiProperty({ description: 'End date for metrics/query filtering' })
  @IsOptional()
  endDate?: Date;

  @ApiProperty({ description: 'Page number' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page = 1;

  @ApiProperty({ description: 'Page size' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit = 20;
}

export class SLAMetricsDto {
  @ApiProperty({ description: 'Total SLA instances' })
  @IsNumber()
  totalInstances = 0;

  @ApiProperty({ description: 'Active SLA instances' })
  @IsNumber()
  activeInstances = 0;

  @ApiProperty({ description: 'Breached SLA instances' })
  @IsNumber()
  breachedInstances = 0;

  @ApiProperty({ description: 'Completed SLA instances' })
  @IsNumber()
  completedInstances = 0;

  @ApiProperty({ description: 'Average response time in minutes' })
  @IsNumber()
  avgResponseTime = 0;

  @ApiProperty({ description: 'Average resolution time in minutes' })
  @IsNumber()
  avgResolutionTime = 0;

  @ApiProperty({ description: 'SLA compliance percentage' })
  @IsNumber()
  complianceRate = 0;

  @ApiProperty({ description: 'SLA policies count' })
  @IsNumber()
  totalPolicies = 0;

  @ApiProperty({ description: 'Active SLA policies' })
  @IsNumber()
  activePolicies = 0;

  @ApiProperty({ description: 'Metrics by priority' })
  @IsOptional()
  byPriority = {};

  @ApiProperty({ description: 'Metrics by category' })
  @IsOptional()
  byCategory = {};

  @ApiProperty({ description: 'Metrics by date range' })
  @IsOptional()
  byDate = {};
}

export class SLABreachDto {
  @ApiProperty({ description: 'SLA instance ID' })
  @IsString()
  instanceId = '';

  @ApiProperty({ description: 'Ticket ID' })
  @IsString()
  ticketId = '';

  @ApiProperty({ description: 'SLA policy ID' })
  @IsString()
  slaId = '';

  @ApiProperty({ description: 'Breach type' })
  @IsString()
  breachType = '';

  @ApiProperty({ description: 'Breach time' })
  @IsOptional()
  breachTime?: Date;

  @ApiProperty({ description: 'Target time' })
  @IsOptional()
  targetTime?: Date;

  @ApiProperty({ description: 'Actual time' })
  @IsOptional()
  actualTime?: Date;

  @ApiProperty({ description: 'Breach details' })
  @IsOptional()
  details = {};
}