import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum PresenceStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline',
}

export class PresenceUpdateDto {
  @IsString()
  @IsNotEmpty()
  room: string;

  @IsEnum(PresenceStatus)
  status: PresenceStatus;
}

