import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class TypingDto {
  @IsString()
  @IsNotEmpty()
  room: string;

  @IsBoolean()
  isTyping: boolean;
}

