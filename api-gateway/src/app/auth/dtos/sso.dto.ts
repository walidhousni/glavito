import { IsString, IsIn, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SSOInitiateDto {
  @ApiProperty({
    description: 'SSO provider to use',
    example: 'google',
    enum: ['google', 'microsoft', 'github'],
  })
  @IsIn(['google', 'microsoft', 'github'])
  provider: 'google' | 'microsoft' | 'github';

  @ApiProperty({
    description: 'Redirect URL for OAuth callback',
    example: 'https://app.example.com/auth/callback',
  })
  @IsUrl()
  redirectUrl: string;
}

export class SSOCallbackDto {
  @ApiProperty({
    description: 'SSO provider',
    example: 'google',
    enum: ['google', 'microsoft', 'github'],
  })
  @IsIn(['google', 'microsoft', 'github'])
  provider: 'google' | 'microsoft' | 'github';

  @ApiProperty({
    description: 'Authorization code from OAuth provider',
    example: '4/0AX4XfWgXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'State parameter for CSRF protection',
    example: 'abc123def456',
  })
  @IsString()
  state: string;

  @ApiProperty({
    description: 'Tenant ID (optional)',
    example: 'clg1234567890',
    required: false,
  })
  @IsString()
  tenantId?: string;
}