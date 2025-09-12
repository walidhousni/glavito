import { IsOptional, IsString, IsNumber, IsArray, IsBoolean, IsDateString } from 'class-validator';

export class SearchRequestDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsBoolean()
  semantic?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entities?: string[];

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  dateField?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  leadStatus?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dealStage?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dealPipeline?: string[];

  @IsOptional()
  @IsNumber()
  minValue?: number;

  @IsOptional()
  @IsNumber()
  maxValue?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  minScore?: number;

  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedTo?: string[];

  @IsOptional()
  @IsBoolean()
  unassigned?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customFields?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class SaveSearchRequestDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsBoolean()
  semantic?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  entities?: string[];

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  dateField?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  leadStatus?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dealStage?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dealPipeline?: string[];

  @IsOptional()
  @IsNumber()
  minValue?: number;

  @IsOptional()
  @IsNumber()
  maxValue?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  minScore?: number;

  @IsOptional()
  @IsNumber()
  maxScore?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedTo?: string[];

  @IsOptional()
  @IsBoolean()
  unassigned?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customFields?: Record<string, any>;
}


