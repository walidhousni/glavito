import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum ReactionTarget {
  NOTE = 'note',
  MESSAGE = 'message',
}

export class ReactionDto {
  @IsEnum(ReactionTarget)
  targetType: ReactionTarget;

  @IsString()
  @IsNotEmpty()
  targetId: string;

  @IsString()
  @IsNotEmpty()
  emoji: string;
}

