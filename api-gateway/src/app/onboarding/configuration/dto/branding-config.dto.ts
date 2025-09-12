import { ApiProperty } from '@nestjs/swagger';

export class BrandingConfigDto {
  @ApiProperty({ description: 'Primary brand color', required: false })
  primaryColor?: string;

  @ApiProperty({ description: 'Secondary brand color', required: false })
  secondaryColor?: string;

  @ApiProperty({ description: 'Accent color', required: false })
  accentColor?: string;

  @ApiProperty({ description: 'Brand font family', required: false })
  fontFamily?: string;

  @ApiProperty({ description: 'Logo URL', required: false })
  logoUrl?: string;

  @ApiProperty({ description: 'Favicon URL', required: false })
  faviconUrl?: string;

  @ApiProperty({ description: 'Brand guidelines', required: false })
  brandGuidelines?: string;

  @ApiProperty({ description: 'Custom CSS', required: false })
  customCss?: string;
}