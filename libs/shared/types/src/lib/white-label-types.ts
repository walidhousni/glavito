export interface TenantWhiteLabelSettings {
  tier: 'basic' | 'advanced' | 'enterprise';
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    faviconUrl?: string;
    fontFamily?: string;
    customCss?: string;
  };
  domains?: {
    primary?: string;
    aliases?: string[];
  };
  features?: {
    enabled: string[];
    disabled: string[];
  };
}

export interface BrandAssetDTO {
  id: string;
  tenantId: string;
  type: 'logo' | 'favicon' | 'email_header' | 'mobile_icon' | 'font' | string;
  originalUrl: string;
  variants: Array<{ size: string; format: string; url: string; fileSize: number }>;
  metadata: Record<string, unknown>;
  version: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateBrandAssetRequest {
  type: BrandAssetDTO['type'];
  originalUrl: string;
  variants?: BrandAssetDTO['variants'];
  metadata?: Record<string, unknown>;
}

export interface WhiteLabelTemplateDTO {
  id: string;
  tenantId: string;
  type: 'email' | 'portal_page' | 'api_doc' | 'mobile_screen' | 'report' | string;
  name: string;
  subject?: string;
  content: string;
  variables: Array<{ key: string; type?: string; required?: boolean; description?: string }>;
  isActive: boolean;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UpsertWhiteLabelTemplateRequest {
  type: WhiteLabelTemplateDTO['type'];
  name: string;
  content: string;
  variables?: WhiteLabelTemplateDTO['variables'];
  isActive?: boolean;
}

export interface FeatureToggleDTO {
  id: string;
  tenantId: string;
  featureKey: string;
  isEnabled: boolean;
  configuration: Record<string, unknown>;
  restrictions?: Array<{ key: string; value: unknown }> | Record<string, unknown> | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UpsertFeatureToggleRequest {
  featureKey: string;
  isEnabled?: boolean;
  configuration?: Record<string, unknown>;
  restrictions?: FeatureToggleDTO['restrictions'];
}

export interface MobileAppConfigDTO {
  id: string;
  tenantId: string;
  appName: string;
  bundleId: string;
  version: string;
  buildNumber: number;
  icons: Array<{ size: string; url: string }>;
  splashScreens: Array<{ size: string; url: string }>;
  colorScheme: { primary?: string; secondary?: string; accent?: string } & Record<string, unknown>;
  features: string[];
  pushConfig?: Record<string, unknown>;
  deepLinkConfig?: Record<string, unknown>;
  storeMetadata?: Record<string, unknown>;
  buildStatus: 'pending' | 'building' | 'ready' | 'failed';
  lastBuildAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UpsertMobileAppConfigRequest extends Partial<MobileAppConfigDTO> {
  appName: string;
  bundleId: string;
}
