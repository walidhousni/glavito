import { IsString, IsNotEmpty } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  room: string; // Format: 'ticket:<id>', 'team:<id>', 'user:<id>'
}

