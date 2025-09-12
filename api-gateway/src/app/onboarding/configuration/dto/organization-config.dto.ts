import { ApiProperty } from '@nestjs/swagger';

export class OrganizationConfigDto {
  @ApiProperty({ description: 'Organization name' })
  name?: string;

  @ApiProperty({ description: 'Organization description', required: false })
  description?: string;

  @ApiProperty({ description: 'Organization website', required: false })
  website?: string;

  @ApiProperty({ description: 'Organization timezone', required: false })
  timezone?: string;

  @ApiProperty({ description: 'Organization logo URL', required: false })
  logoUrl?: string;

  @ApiProperty({ description: 'Contact email', required: false })
  contactEmail?: string;

  @ApiProperty({ description: 'Contact phone', required: false })
  contactPhone?: string;

  @ApiProperty({ description: 'Industry type', required: false })
  industry?: string;

  @ApiProperty({ description: 'Company size', required: false })
  companySize?: string;
}