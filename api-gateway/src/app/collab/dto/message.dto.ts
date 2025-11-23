import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class MessageDto {
  @IsString()
  @IsNotEmpty()
  channelId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsOptional()
  mentions?: string[];
}

