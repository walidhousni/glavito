import { IsEmail, IsString, IsIn, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Email address to send invitation to',
    example: 'newuser@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Role to assign to the invited user',
    example: 'agent',
    enum: ['agent', 'admin'],
  })
  @IsIn(['agent', 'admin'])
  role: 'agent' | 'admin';
}

export class AcceptInvitationDto {
  @ApiProperty({
    description: 'First name of the user accepting the invitation',
    example: 'Jane',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    description: 'Last name of the user accepting the invitation',
    example: 'Smith',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    description: 'Password for the new account (optional - will be generated if not provided)',
    example: 'SecurePass123',
    minLength: 8,
    maxLength: 128,
    required: false,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}