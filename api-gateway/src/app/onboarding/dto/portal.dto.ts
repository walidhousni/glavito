/**
 * Portal DTOs with Validation
 * Data Transfer Objects with comprehensive validation for portal management
 */

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsUrl,
  IsEmail,
  IsEnum,
  IsNumber,
  IsHexColor,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Length,
  Min,
  Max,
  Matches,
  IsNotEmpty,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Base validation classes
export class ColorDto {
  @ApiProperty({ description: 'Hex color code', example: '#3B82F6' })
  @IsHexColor()
  @IsNotEmpty()
  primary: string;

  @ApiProperty({ description: 'Secondary color', example: '#64748B' })
  @IsHexColor()
  @IsNotEmpty()
  secondary: string;

  @ApiProperty({ description: 'Accent color', example: '#F59E0B' })
  @IsHexColor()
  @IsNotEmpty()
  accent: string;

  @ApiProperty({ description: 'Background color', example: '#FFFFFF' })
  @IsHexColor()
  @IsNotEmpty()
  background: string;

  @ApiProperty({ description: 'Surface color', example: '#F8FAFC' })
  @IsHexColor()
  @IsNotEmpty()
  surface: string;

  @ApiPropertyOptional({ description: 'Border color', example: '#E2E8F0' })
  @IsHexColor()
  @IsOptional()
  border?: string;

  @ApiPropertyOptional({ description: 'Success color', example: '#10B981' })
  @IsHexColor()
  @IsOptional()
  success?: string;

  @ApiPropertyOptional({ description: 'Warning color', example: '#F59E0B' })
  @IsHexColor()
  @IsOptional()
  warning?: string;

  @ApiPropertyOptional({ description: 'Error color', example: '#EF4444' })
  @IsHexColor()
  @IsOptional()
  error?: string;
}

export class TextColorDto {
  @ApiProperty({ description: 'Primary text color', example: '#1E293B' })
  @IsHexColor()
  @IsNotEmpty()
  primary: string;

  @ApiProperty({ description: 'Secondary text color', example: '#475569' })
  @IsHexColor()
  @IsNotEmpty()
  secondary: string;

  @ApiProperty({ description: 'Muted text color', example: '#94A3B8' })
  @IsHexColor()
  @IsNotEmpty()
  muted: string;
}

export class FontFamilyDto {
  @ApiProperty({ description: 'Primary font family', example: 'Inter, system-ui, sans-serif' })
  @IsString()
  @IsNotEmpty()
  primary: string;

  @ApiPropertyOptional({ description: 'Secondary font family', example: 'Georgia, serif' })
  @IsString()
  @IsOptional()
  secondary?: string;
}

export class FontSizeDto {
  @ApiProperty({ description: 'Extra small font size', example: '0.75rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  xs: string;

  @ApiProperty({ description: 'Small font size', example: '0.875rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  sm: string;

  @ApiProperty({ description: 'Base font size', example: '1rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  base: string;

  @ApiProperty({ description: 'Large font size', example: '1.125rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  lg: string;

  @ApiProperty({ description: 'Extra large font size', example: '1.25rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  xl: string;

  @ApiProperty({ description: '2X large font size', example: '1.5rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  '2xl': string;

  @ApiProperty({ description: '3X large font size', example: '1.875rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  '3xl': string;
}

export class FontWeightDto {
  @ApiProperty({ description: 'Normal font weight', example: 400 })
  @IsNumber()
  @Min(100)
  @Max(900)
  normal: number;

  @ApiProperty({ description: 'Medium font weight', example: 500 })
  @IsNumber()
  @Min(100)
  @Max(900)
  medium: number;

  @ApiProperty({ description: 'Semibold font weight', example: 600 })
  @IsNumber()
  @Min(100)
  @Max(900)
  semibold: number;

  @ApiProperty({ description: 'Bold font weight', example: 700 })
  @IsNumber()
  @Min(100)
  @Max(900)
  bold: number;
}

export class LineHeightDto {
  @ApiProperty({ description: 'Tight line height', example: 1.25 })
  @IsNumber()
  @Min(0.5)
  @Max(3)
  tight: number;

  @ApiProperty({ description: 'Normal line height', example: 1.5 })
  @IsNumber()
  @Min(0.5)
  @Max(3)
  normal: number;

  @ApiProperty({ description: 'Relaxed line height', example: 1.75 })
  @IsNumber()
  @Min(0.5)
  @Max(3)
  relaxed: number;
}

export class TypographyDto {
  @ApiProperty({ type: FontFamilyDto })
  @ValidateNested()
  @Type(() => FontFamilyDto)
  fontFamily: FontFamilyDto;

  @ApiProperty({ type: FontSizeDto })
  @ValidateNested()
  @Type(() => FontSizeDto)
  fontSize: FontSizeDto;

  @ApiProperty({ type: FontWeightDto })
  @ValidateNested()
  @Type(() => FontWeightDto)
  fontWeight: FontWeightDto;

  @ApiProperty({ type: LineHeightDto })
  @ValidateNested()
  @Type(() => LineHeightDto)
  lineHeight: LineHeightDto;
}

export class SpacingDto {
  @ApiProperty({ description: 'Extra small spacing', example: '0.5rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  xs: string;

  @ApiProperty({ description: 'Small spacing', example: '1rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  sm: string;

  @ApiProperty({ description: 'Medium spacing', example: '1.5rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  md: string;

  @ApiProperty({ description: 'Large spacing', example: '2rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  lg: string;

  @ApiProperty({ description: 'Extra large spacing', example: '3rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  xl: string;

  @ApiProperty({ description: '2X large spacing', example: '4rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  '2xl': string;
}

export class BorderRadiusDto {
  @ApiProperty({ description: 'Small border radius', example: '0.25rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  sm: string;

  @ApiProperty({ description: 'Medium border radius', example: '0.375rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  md: string;

  @ApiProperty({ description: 'Large border radius', example: '0.5rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  lg: string;

  @ApiProperty({ description: 'Extra large border radius', example: '0.75rem' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$/)
  xl: string;

  @ApiProperty({ description: 'Full border radius', example: '9999px' })
  @IsString()
  @Matches(/^\d+(\.\d+)?(rem|px|em)$|^9999px$/)
  full: string;
}

export class LogoDto {
  @ApiProperty({ description: 'Logo URL' })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: 'Logo width', example: 200 })
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ description: 'Logo height', example: 60 })
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ description: 'Logo alt text', example: 'Company Logo' })
  @IsString()
  @Length(1, 100)
  @IsOptional()
  alt?: string;
}

export class FaviconDto {
  @ApiProperty({ description: 'Favicon URL' })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: 'Favicon type', example: 'image/x-icon' })
  @IsString()
  @IsOptional()
  type?: string;
}

export class PortalBrandingDto {
  @ApiPropertyOptional({ type: LogoDto })
  @ValidateNested()
  @Type(() => LogoDto)
  @IsOptional()
  logo?: LogoDto;

  @ApiPropertyOptional({ type: FaviconDto })
  @ValidateNested()
  @Type(() => FaviconDto)
  @IsOptional()
  favicon?: FaviconDto;

  @ApiProperty({ type: ColorDto })
  @ValidateNested()
  @Type(() => ColorDto)
  colors: ColorDto & { text: TextColorDto };

  @ApiProperty({ type: TypographyDto })
  @ValidateNested()
  @Type(() => TypographyDto)
  typography: TypographyDto;

  @ApiProperty({ type: SpacingDto })
  @ValidateNested()
  @Type(() => SpacingDto)
  spacing: SpacingDto;

  @ApiProperty({ type: BorderRadiusDto })
  @ValidateNested()
  @Type(() => BorderRadiusDto)
  borderRadius: BorderRadiusDto;
}

// Custom Field DTO
export class PortalCustomFieldDto {
  @ApiProperty({ description: 'Field ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Field name' })
  @IsString()
  @Length(1, 50)
  name: string;

  @ApiProperty({ description: 'Field label' })
  @IsString()
  @Length(1, 100)
  label: string;

  @ApiProperty({ 
    description: 'Field type',
    enum: ['text', 'textarea', 'select', 'multiselect', 'checkbox', 'radio', 'date', 'email', 'phone', 'url', 'number']
  })
  @IsEnum(['text', 'textarea', 'select', 'multiselect', 'checkbox', 'radio', 'date', 'email', 'phone', 'url', 'number'])
  type: string;

  @ApiProperty({ description: 'Is field required' })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ description: 'Field placeholder' })
  @IsString()
  @Length(0, 200)
  @IsOptional()
  placeholder?: string;

  @ApiPropertyOptional({ description: 'Help text' })
  @IsString()
  @Length(0, 500)
  @IsOptional()
  helpText?: string;

  @ApiPropertyOptional({ description: 'Field options for select/radio fields' })
  @IsArray()
  @ValidateNested({ each: true })
  @IsOptional()
  options?: { value: string; label: string }[];

  @ApiPropertyOptional({ description: 'Field validation rules' })
  @IsObject()
  @IsOptional()
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };

  @ApiPropertyOptional({ description: 'Default value' })
  @IsOptional()
  defaultValue?: any;

  @ApiProperty({ description: 'Sort order' })
  @IsNumber()
  @Min(0)
  sortOrder: number;

  @ApiProperty({ description: 'Is field active' })
  @IsBoolean()
  isActive: boolean;
}

// Feature Configuration DTOs
export class TicketSubmissionDto {
  @ApiProperty({ description: 'Enable ticket submission' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Require authentication' })
  @IsBoolean()
  requireAuth: boolean;

  @ApiProperty({ description: 'Allow file attachments' })
  @IsBoolean()
  allowAttachments: boolean;

  @ApiProperty({ description: 'Maximum attachment size in MB' })
  @IsNumber()
  @Min(1)
  @Max(100)
  maxAttachmentSize: number;

  @ApiProperty({ description: 'Allowed file types' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  allowedFileTypes: string[];

  @ApiProperty({ description: 'Custom fields', type: [PortalCustomFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PortalCustomFieldDto)
  customFields: PortalCustomFieldDto[];

  @ApiProperty({ description: 'Enable auto assignment' })
  @IsBoolean()
  autoAssignment: boolean;

  @ApiProperty({ description: 'Send email notifications' })
  @IsBoolean()
  emailNotifications: boolean;
}

export class KnowledgeBaseDto {
  @ApiProperty({ description: 'Enable knowledge base' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Enable search functionality' })
  @IsBoolean()
  searchEnabled: boolean;

  @ApiProperty({ description: 'Enable categories' })
  @IsBoolean()
  categoriesEnabled: boolean;

  @ApiProperty({ description: 'Enable article ratings' })
  @IsBoolean()
  ratingsEnabled: boolean;

  @ApiProperty({ description: 'Enable comments' })
  @IsBoolean()
  commentsEnabled: boolean;

  @ApiProperty({ description: 'Enable AI suggestions' })
  @IsBoolean()
  suggestionsEnabled: boolean;
}

export class LiveChatDto {
  @ApiProperty({ description: 'Enable live chat' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ 
    description: 'Chat widget position',
    enum: ['bottom-right', 'bottom-left', 'top-right', 'top-left']
  })
  @IsEnum(['bottom-right', 'bottom-left', 'top-right', 'top-left'])
  position: string;

  @ApiProperty({ 
    description: 'Chat theme',
    enum: ['light', 'dark', 'auto']
  })
  @IsEnum(['light', 'dark', 'auto'])
  theme: string;

  @ApiProperty({ description: 'Welcome message' })
  @IsString()
  @Length(1, 500)
  welcomeMessage: string;

  @ApiProperty({ description: 'Offline message' })
  @IsString()
  @Length(1, 500)
  offlineMessage: string;

  @ApiProperty({ description: 'Only show during business hours' })
  @IsBoolean()
  businessHoursOnly: boolean;
}

export class PortalFeaturesDto {
  @ApiProperty({ type: TicketSubmissionDto })
  @ValidateNested()
  @Type(() => TicketSubmissionDto)
  ticketSubmission: TicketSubmissionDto;

  @ApiProperty({ type: KnowledgeBaseDto })
  @ValidateNested()
  @Type(() => KnowledgeBaseDto)
  knowledgeBase: KnowledgeBaseDto;

  @ApiProperty({ type: LiveChatDto })
  @ValidateNested()
  @Type(() => LiveChatDto)
  liveChat: LiveChatDto;

  // Additional feature configurations
  [key: string]: any;
}

// SEO Settings DTO
export class PortalSEODto {
  @ApiProperty({ description: 'Page title' })
  @IsString()
  @Length(1, 60)
  title: string;

  @ApiProperty({ description: 'Meta description' })
  @IsString()
  @Length(1, 160)
  description: string;

  @ApiProperty({ description: 'Keywords' })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  keywords: string[];

  @ApiPropertyOptional({ description: 'Open Graph image URL' })
  @IsUrl()
  @IsOptional()
  ogImage?: string;

  @ApiProperty({ 
    description: 'Twitter card type',
    enum: ['summary', 'summary_large_image']
  })
  @IsEnum(['summary', 'summary_large_image'])
  twitterCard: string;

  @ApiPropertyOptional({ description: 'Canonical URL' })
  @IsUrl()
  @IsOptional()
  canonicalUrl?: string;

  @ApiProperty({ description: 'Robots configuration' })
  @IsObject()
  robots: {
    index: boolean;
    follow: boolean;
  };
}

// Main Portal DTOs
export class CreatePortalDto {
  @ApiProperty({ description: 'Portal name' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ description: 'Portal description' })
  @IsString()
  @Length(0, 500)
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Subdomain' })
  @IsString()
  @Length(3, 63)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
  subdomain: string;

  @ApiPropertyOptional({ type: PortalBrandingDto })
  @ValidateNested()
  @Type(() => PortalBrandingDto)
  @IsOptional()
  branding?: PortalBrandingDto;

  @ApiPropertyOptional({ type: PortalFeaturesDto })
  @ValidateNested()
  @Type(() => PortalFeaturesDto)
  @IsOptional()
  features?: PortalFeaturesDto;

  @ApiPropertyOptional({ type: PortalSEODto })
  @ValidateNested()
  @Type(() => PortalSEODto)
  @IsOptional()
  seoSettings?: PortalSEODto;
}

export class UpdatePortalDto {
  @ApiPropertyOptional({ description: 'Portal name' })
  @IsString()
  @Length(1, 100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Portal description' })
  @IsString()
  @Length(0, 500)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Subdomain' })
  @IsString()
  @Length(3, 63)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
  @IsOptional()
  subdomain?: string;

  @ApiPropertyOptional({ description: 'Custom domain' })
  @IsString()
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/)
  @IsOptional()
  customDomain?: string;

  @ApiPropertyOptional({ description: 'Is portal active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ type: PortalBrandingDto })
  @ValidateNested()
  @Type(() => PortalBrandingDto)
  @IsOptional()
  branding?: Partial<PortalBrandingDto>;

  @ApiPropertyOptional({ type: PortalFeaturesDto })
  @ValidateNested()
  @Type(() => PortalFeaturesDto)
  @IsOptional()
  features?: Partial<PortalFeaturesDto>;

  @ApiPropertyOptional({ type: PortalSEODto })
  @ValidateNested()
  @Type(() => PortalSEODto)
  @IsOptional()
  seoSettings?: Partial<PortalSEODto>;
}

export class PublishPortalDto {
  @ApiPropertyOptional({ description: 'Generate integration code' })
  @IsBoolean()
  @IsOptional()
  generateIntegrationCode?: boolean;

  @ApiPropertyOptional({ description: 'Notify users about publication' })
  @IsBoolean()
  @IsOptional()
  notifyUsers?: boolean;

  @ApiPropertyOptional({ description: 'Backup current version' })
  @IsBoolean()
  @IsOptional()
  backupCurrent?: boolean;
}

export class CreateCustomDomainDto {
  @ApiProperty({ description: 'Custom domain' })
  @IsString()
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/)
  domain: string;

  @ApiPropertyOptional({ description: 'Auto verify domain' })
  @IsBoolean()
  @IsOptional()
  autoVerify?: boolean;
}

export class CreatePortalPageDto {
  @ApiProperty({ description: 'Page name' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ description: 'Page slug' })
  @IsString()
  @Length(1, 100)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
  slug: string;

  @ApiProperty({ description: 'Page title' })
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiProperty({ description: 'Page content' })
  @IsString()
  @Length(1, 50000)
  content: string;

  @ApiProperty({ 
    description: 'Page type',
    enum: ['home', 'contact', 'faq', 'ticket_submit', 'knowledge_base', 'custom']
  })
  @IsEnum(['home', 'contact', 'faq', 'ticket_submit', 'knowledge_base', 'custom'])
  pageType: string;

  @ApiPropertyOptional({ description: 'SEO title' })
  @IsString()
  @Length(0, 60)
  @IsOptional()
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO description' })
  @IsString()
  @Length(0, 160)
  @IsOptional()
  seoDescription?: string;

  @ApiPropertyOptional({ description: 'Custom CSS' })
  @IsString()
  @Length(0, 10000)
  @IsOptional()
  customCss?: string;

  @ApiPropertyOptional({ description: 'Custom JavaScript' })
  @IsString()
  @Length(0, 10000)
  @IsOptional()
  customJs?: string;
}

export class UpdatePortalPageDto {
  @ApiPropertyOptional({ description: 'Page name' })
  @IsString()
  @Length(1, 100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Page slug' })
  @IsString()
  @Length(1, 100)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ description: 'Page title' })
  @IsString()
  @Length(1, 200)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Page content' })
  @IsString()
  @Length(1, 50000)
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Is page active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'SEO title' })
  @IsString()
  @Length(0, 60)
  @IsOptional()
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO description' })
  @IsString()
  @Length(0, 160)
  @IsOptional()
  seoDescription?: string;

  @ApiPropertyOptional({ description: 'Custom CSS' })
  @IsString()
  @Length(0, 10000)
  @IsOptional()
  customCss?: string;

  @ApiPropertyOptional({ description: 'Custom JavaScript' })
  @IsString()
  @Length(0, 10000)
  @IsOptional()
  customJs?: string;
}

export class CreatePortalThemeDto {
  @ApiProperty({ description: 'Theme name' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ description: 'Theme description' })
  @IsString()
  @Length(0, 500)
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Theme colors' })
  @IsObject()
  colors: Record<string, string>;

  @ApiPropertyOptional({ description: 'Typography settings' })
  @IsObject()
  @IsOptional()
  typography?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Layout settings' })
  @IsObject()
  @IsOptional()
  layout?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Component settings' })
  @IsObject()
  @IsOptional()
  components?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Custom CSS' })
  @IsString()
  @Length(0, 20000)
  @IsOptional()
  customCss?: string;
}

export class ValidateSubdomainDto {
  @ApiProperty({ description: 'Subdomain to validate' })
  @IsString()
  @Length(3, 63)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
  subdomain: string;
}

export class ValidateDomainDto {
  @ApiProperty({ description: 'Domain to validate' })
  @IsString()
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/)
  domain: string;
}