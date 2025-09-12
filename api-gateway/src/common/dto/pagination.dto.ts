import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Search query string',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
  })
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class PaginationMetaDto {
  @ApiProperty({ description: 'Current page number', example: 1 })
  page = 1;

  @ApiProperty({ description: 'Items per page', example: 10 })
  limit = 10;

  @ApiProperty({ description: 'Total number of items', example: 100 })
  total = 0;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  totalPages = 0;

  @ApiProperty({ description: 'Whether there is a next page', example: true })
  hasNextPage = false;

  @ApiProperty({ description: 'Whether there is a previous page', example: false })
  hasPreviousPage = false;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Array of items' })
  data: T[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  constructor(data: T[] = [], meta: PaginationMetaDto = new PaginationMetaDto()) {
    this.data = data;
    this.meta = meta;
  }
}

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiProperty({ description: 'Response metadata' })
  meta: {
    timestamp: string;
    requestId: string;
    path: string;
    method: string;
    version: string;
  };

  @ApiPropertyOptional({ description: 'Pagination information' })
  pagination?: PaginationMetaDto;

  constructor(data: T, meta?: Partial<ApiResponseDto<T>['meta']>, pagination?: PaginationMetaDto) {
    this.data = data;
    this.meta = {
      timestamp: new Date().toISOString(),
      requestId: '',
      path: '',
      method: '',
      version: '1.0.0',
      ...meta,
    };
    if (pagination) this.pagination = pagination;
  }
}