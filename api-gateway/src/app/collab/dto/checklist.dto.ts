import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class SubtaskDto {
  @IsString()
  @IsNotEmpty()
  ticketId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

export class UpdateSubtaskDto {
  @IsString()
  @IsNotEmpty()
  subtaskId: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  isDone?: boolean;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

