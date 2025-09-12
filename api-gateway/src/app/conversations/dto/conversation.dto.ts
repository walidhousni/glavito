import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsArray, 
  IsObject, 
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  ValidateNested,
  IsUUID
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Enums
export enum ChannelTypeEnum {
  WHATSAPP = 'whatsapp',
  INSTAGRAM = 'instagram',
  EMAIL = 'email',
  WEB = 'web',
  VOICE = 'voice',
  VIDEO = 'video',
  SMS = 'sms',
  TELEGRAM = 'telegram'
}

export enum MessageTypeEnum {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact',
  STICKER = 'sticker',
  TEMPLATE = 'template'
}

export enum SenderTypeEnum {
  CUSTOMER = 'customer',
  AGENT = 'agent',
  SYSTEM = 'system',
  BOT = 'bot'
}

export enum ConversationStatusEnum {
  ACTIVE = 'active',
  WAITING = 'waiting',
  CLOSED = 'closed',
  ARCHIVED = 'archived'
}

export enum ConversationPriorityEnum {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// DTOs for message ingestion
export class AttachmentDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  url: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  filename?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  size?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class LocationDto {
  @ApiProperty()
  @IsNumber()
  latitude: number;

  @ApiProperty()
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

export class IngestMessageDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiProperty()
  @IsString()
  senderId: string;

  @ApiProperty({ enum: SenderTypeEnum })
  @IsEnum(SenderTypeEnum)
  senderType: SenderTypeEnum;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: MessageTypeEnum })
  @IsEnum(MessageTypeEnum)
  messageType: MessageTypeEnum;

  @ApiProperty({ enum: ChannelTypeEnum })
  @IsEnum(ChannelTypeEnum)
  channel: ChannelTypeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channelMessageId?: string;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  replyToMessageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isForwarded?: boolean;

  @ApiPropertyOptional({ type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty()
  @IsString()
  tenantId: string;
}

// DTOs for conversation management
export class CreateConversationDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty()
  @IsUUID()
  channelId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ enum: ConversationPriorityEnum })
  @IsOptional()
  @IsEnum(ConversationPriorityEnum)
  priority?: ConversationPriorityEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateConversationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ enum: ConversationStatusEnum })
  @IsOptional()
  @IsEnum(ConversationStatusEnum)
  status?: ConversationStatusEnum;

  @ApiPropertyOptional({ enum: ConversationPriorityEnum })
  @IsOptional()
  @IsEnum(ConversationPriorityEnum)
  priority?: ConversationPriorityEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: MessageTypeEnum })
  @IsEnum(MessageTypeEnum)
  messageType: MessageTypeEnum;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  templateParams?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  replyToMessageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class MergeConversationsDto {
  @ApiProperty()
  @IsArray()
  @IsUUID(undefined, { each: true })
  conversationIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  primaryConversationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mergeReason?: string;
}

export class AssignConversationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignmentReason?: string;

  @ApiPropertyOptional({ enum: ConversationPriorityEnum })
  @IsOptional()
  @IsEnum(ConversationPriorityEnum)
  priority?: ConversationPriorityEnum;
}

export class ConversationFilterDto {
  @ApiPropertyOptional({ enum: ConversationStatusEnum, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ConversationStatusEnum, { each: true })
  status?: ConversationStatusEnum[];

  @ApiPropertyOptional({ enum: ConversationPriorityEnum, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ConversationPriorityEnum, { each: true })
  priority?: ConversationPriorityEnum[];

  @ApiPropertyOptional({ enum: ChannelTypeEnum, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ChannelTypeEnum, { each: true })
  channelType?: ChannelTypeEnum[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedAgentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

// Response DTOs
export class ConversationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  customerId: string;

  @ApiProperty()
  channelId: string;

  @ApiPropertyOptional()
  subject?: string;

  @ApiProperty({ enum: ConversationStatusEnum })
  status: ConversationStatusEnum;

  @ApiProperty({ enum: ConversationPriorityEnum })
  priority: ConversationPriorityEnum;

  @ApiPropertyOptional()
  assignedAgentId?: string;

  @ApiPropertyOptional()
  teamId?: string;

  @ApiProperty()
  tags: string[];

  @ApiProperty()
  metadata: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  lastMessageAt?: Date;

  @ApiPropertyOptional()
  closedAt?: Date;

  @ApiPropertyOptional()
  closedBy?: string;

  @ApiPropertyOptional()
  closeReason?: string;
}

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  conversationId: string;

  @ApiProperty()
  senderId: string;

  @ApiProperty({ enum: SenderTypeEnum })
  senderType: SenderTypeEnum;

  @ApiProperty()
  content: string;

  @ApiProperty()
  normalizedContent: string;

  @ApiProperty({ enum: MessageTypeEnum })
  messageType: MessageTypeEnum;

  @ApiProperty({ enum: ChannelTypeEnum })
  channel: ChannelTypeEnum;

  @ApiProperty()
  timestamp: Date;

  @ApiPropertyOptional({ type: [AttachmentDto] })
  attachments?: AttachmentDto[];

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class PaginationDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

export class ConversationListResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  conversations: ConversationResponseDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;

  @ApiProperty({ type: ConversationFilterDto })
  filters: ConversationFilterDto;
}