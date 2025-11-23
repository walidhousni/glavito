export interface TenantWhiteLabelSettings {
  tier: 'basic' | 'advanced' | 'enterprise';
  // Company brand and profile
  company?: {
    name?: string;
    website?: string;
    industry?: string;
    size?: string;
    contact?: { email?: string; phone?: string };
    address?: { street?: string; city?: string; state?: string; postalCode?: string; country?: string };
    businessHours?: {
      enabled?: boolean;
      timezone?: string;
      days?: Array<{
        day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
        enabled: boolean;
        openTime?: string; // Format: "HH:mm" (e.g., "09:00")
        closeTime?: string; // Format: "HH:mm" (e.g., "17:00")
      }>;
    };
  };
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    faviconUrl?: string;
    fontFamily?: string;
    customCss?: string;
  };
  // Localization and formatting preferences
  localization?: {
    language?: string;
    timezone?: string;
    currency?: string;
    dateFormat?: string;
    timeFormat?: string;
  };
  domains?: {
    primary?: string;
    aliases?: string[];
  };
  features?: {
    enabled: string[];
    disabled: string[];
  };
  // Optional computed or cached assets map for quick access
  assets?: {
    logoUrl?: string;
    faviconUrl?: string;
  };
  // Optional email-specific theming overrides
  emailTheme?: EmailTheme;
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

// Computed theme returned by API for consistent branding across UIs and emails
export interface WhiteLabelTheme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
    onPrimary: string;
  };
  typography?: {
    fontFamily?: string;
  };
  assets: {
    logoUrl?: string;
    faviconUrl?: string;
  };
  email: EmailTheme;
}

export interface EmailTheme {
  headerBackground: string;
  bodyBackground: string;
  contentBackground: string;
  textColor: string;
  linkColor: string;
  buttonBackground: string;
  buttonTextColor: string;
  footerText: string;
}
