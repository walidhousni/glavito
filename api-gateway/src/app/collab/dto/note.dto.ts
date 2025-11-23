import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class NoteDto {
  @IsString()
  @IsNotEmpty()
  ticketId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}

export class UpdateNoteDto {
  @IsString()
  @IsNotEmpty()
  noteId: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

