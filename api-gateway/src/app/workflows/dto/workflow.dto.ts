import { IsString, IsOptional, IsArray, IsObject, IsEnum, IsBoolean, IsNumber, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class WorkflowTriggerDto {
  @ApiProperty()
  @IsString()
  id!: string

  @ApiProperty()
  @IsString()
  type!: string

  @ApiProperty()
  @IsString()
  name!: string

  @ApiProperty()
  @IsObject()
  configuration!: Record<string, any>

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  conditions?: any[]

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean
}

export class WorkflowActionDto {
  @ApiProperty()
  @IsString()
  id!: string

  @ApiProperty()
  @IsString()
  type!: string

  @ApiProperty()
  @IsString()
  name!: string

  @ApiProperty()
  @IsObject()
  configuration!: Record<string, any>

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  onError?: {
    action: 'continue' | 'stop' | 'retry'
    retryCount?: number
    retryDelay?: number
  }

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  enabled?: boolean
}

export class WorkflowNodeDto {
  @ApiProperty()
  @IsString()
  id!: string

  @ApiProperty()
  @IsString()
  type!: string

  @ApiProperty()
  @IsString()
  name!: string

  @ApiProperty()
  @IsObject()
  position!: { x: number; y: number }

  @ApiProperty()
  @IsObject()
  configuration!: Record<string, any>

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  inputs?: any[]

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  outputs?: any[]

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  onError?: any

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  retryPolicy?: any
}

export class WorkflowConnectionDto {
  @ApiProperty()
  @IsString()
  id!: string

  @ApiProperty()
  @IsString()
  sourceNodeId!: string

  @ApiProperty()
  @IsString()
  sourceOutput!: string

  @ApiProperty()
  @IsString()
  targetNodeId!: string

  @ApiProperty()
  @IsString()
  targetInput!: string

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  condition?: any
}

export class WorkflowSettingsDto {
  @ApiProperty()
  @IsNumber()
  timeout!: number

  @ApiProperty()
  @IsNumber()
  maxRetries!: number

  @ApiProperty()
  @IsString()
  errorHandling!: string

  @ApiProperty()
  @IsString()
  logging!: string

  @ApiProperty()
  @IsString()
  executionMode!: string

  @ApiProperty()
  @IsString()
  priority!: string

  @ApiProperty()
  @IsArray()
  permissions!: any[]

  @ApiProperty()
  @IsArray()
  allowedIntegrations!: string[]
}

export class WorkflowVariableDto {
  @ApiProperty()
  @IsString()
  name!: string

  @ApiProperty()
  @IsString()
  type!: string

  @ApiPropertyOptional()
  defaultValue?: any

  @ApiProperty()
  @IsBoolean()
  required!: boolean

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string
}

export class CreateWorkflowDto {
  @ApiProperty()
  @IsString()
  name!: string

  @ApiProperty()
  @IsString()
  description!: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  type?: string

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  priority?: number

  @ApiPropertyOptional({ type: [WorkflowTriggerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTriggerDto)
  @IsOptional()
  triggers?: WorkflowTriggerDto[]

  // Support both old and new structures
  @ApiPropertyOptional({ type: [WorkflowNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  @IsOptional()
  nodes?: WorkflowNodeDto[]

  @ApiPropertyOptional({ type: [WorkflowConnectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowConnectionDto)
  @IsOptional()
  connections?: WorkflowConnectionDto[]

  // Legacy fields for backward compatibility
  @ApiPropertyOptional({ type: Array })
  @IsArray()
  @IsOptional()
  conditions?: any[]

  @ApiPropertyOptional({ type: [WorkflowActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowActionDto)
  @IsOptional()
  actions?: WorkflowActionDto[]

  @ApiPropertyOptional({ type: WorkflowSettingsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => WorkflowSettingsDto)
  @IsOptional()
  settings?: WorkflowSettingsDto

  @ApiPropertyOptional({ type: [WorkflowVariableDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowVariableDto)
  @IsOptional()
  variables?: WorkflowVariableDto[]

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

export class UpdateWorkflowDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  type?: string

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  priority?: number

  @ApiPropertyOptional({ type: [WorkflowTriggerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTriggerDto)
  @IsOptional()
  triggers?: WorkflowTriggerDto[]

  @ApiPropertyOptional({ type: [WorkflowNodeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowNodeDto)
  @IsOptional()
  nodes?: WorkflowNodeDto[]

  @ApiPropertyOptional({ type: [WorkflowConnectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowConnectionDto)
  @IsOptional()
  connections?: WorkflowConnectionDto[]

  // Legacy fields for backward compatibility
  @ApiPropertyOptional({ type: Array })
  @IsArray()
  @IsOptional()
  conditions?: any[]

  @ApiPropertyOptional({ type: [WorkflowActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowActionDto)
  @IsOptional()
  actions?: WorkflowActionDto[]

  @ApiPropertyOptional({ type: WorkflowSettingsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => WorkflowSettingsDto)
  @IsOptional()
  settings?: WorkflowSettingsDto

  @ApiPropertyOptional({ type: [WorkflowVariableDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowVariableDto)
  @IsOptional()
  variables?: WorkflowVariableDto[]

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

export class ExecuteWorkflowDto {
  @ApiProperty()
  @IsObject()
  input!: Record<string, any>

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  context?: Record<string, any>
}

export class WorkflowFiltersDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  tags?: string[]

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  createdBy?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortBy?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc'

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  page?: number

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  limit?: number
}

export class CreateIntegrationDto {
  @ApiProperty()
  @IsString()
  name!: string

  @ApiProperty()
  @IsString()
  type!: string

  @ApiProperty()
  @IsObject()
  configuration!: Record<string, any>

  @ApiProperty()
  @IsObject()
  credentials!: Record<string, any>

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string
}

export class BulkWorkflowActionDto {
  @ApiProperty()
  @IsArray()
  workflowIds!: string[]

  @ApiProperty()
  @IsString()
  action!: 'activate' | 'deactivate' | 'delete' | 'duplicate'

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  parameters?: Record<string, any>
}

export class WorkflowExecutionFiltersDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  triggeredBy?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  triggerType?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  startDate?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  endDate?: string

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  page?: number

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  limit?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortBy?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc'
}

export class WorkflowStatsDto {
  @ApiProperty()
  totalWorkflows!: number

  @ApiProperty()
  activeWorkflows!: number

  @ApiProperty()
  totalExecutions!: number

  @ApiProperty()
  successfulExecutions!: number

  @ApiProperty()
  failedExecutions!: number

  @ApiProperty()
  averageExecutionTime!: number

  @ApiProperty()
  executionsToday!: number

  @ApiProperty()
  executionsThisWeek!: number

  @ApiProperty()
  executionsThisMonth!: number

  @ApiProperty()
  topWorkflows!: Array<{
    id: string
    name: string
    executionCount: number
    successRate: number
  }>

  @ApiProperty()
  recentExecutions!: Array<{
    id: string
    workflowName: string
    status: string
    startedAt: Date
    duration?: number
  }>
}