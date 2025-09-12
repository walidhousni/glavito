/**
 * Customer Portal Types
 * Shared types for customer portal customization and management
 */

// Base Portal Types
export interface CustomerPortal {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  subdomain: string;
  customDomain?: string;
  isActive: boolean;
  isPublished: boolean;
  branding: PortalBranding;
  features: PortalFeatures;
  customization: PortalCustomization;
  seoSettings: PortalSEOSettings;
  integrationCode?: string;
  publishedAt?: Date;
  lastPublishedAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Branding Configuration
export interface PortalBranding {
  logo?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  favicon?: {
    url: string;
    type?: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  typography: {
    fontFamily: {
      primary: string;
      secondary?: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
}

// Feature Configuration
export interface PortalFeatures {
  ticketSubmission: {
    enabled: boolean;
    requireAuth: boolean;
    allowAttachments: boolean;
    maxAttachmentSize: number; // MB
    allowedFileTypes: string[];
    customFields: PortalCustomField[];
    autoAssignment: boolean;
    emailNotifications: boolean;
  };
  knowledgeBase: {
    enabled: boolean;
    searchEnabled: boolean;
    categoriesEnabled: boolean;
    ratingsEnabled: boolean;
    commentsEnabled: boolean;
    suggestionsEnabled: boolean;
  };
  liveChat: {
    enabled: boolean;
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    theme: 'light' | 'dark' | 'auto';
    welcomeMessage: string;
    offlineMessage: string;
    businessHoursOnly: boolean;
  };
  ticketStatus: {
    enabled: boolean;
    allowGuestAccess: boolean;
    showProgress: boolean;
    showHistory: boolean;
    emailUpdates: boolean;
  };
  userAccount: {
    enabled: boolean;
    registrationEnabled: boolean;
    socialLogin: {
      google: boolean;
      microsoft: boolean;
      github: boolean;
    };
    profileFields: PortalCustomField[];
  };
  feedback: {
    enabled: boolean;
    showOnAllPages: boolean;
    collectRatings: boolean;
    collectComments: boolean;
    emailNotifications: boolean;
  };
}

// Custom Field Definition
export interface PortalCustomField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'date' | 'email' | 'phone' | 'url' | 'number';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  defaultValue?: any;
  sortOrder: number;
  isActive: boolean;
}

// Portal Customization
export interface PortalCustomization {
  layout: {
    headerStyle: 'minimal' | 'standard' | 'prominent';
    navigationStyle: 'horizontal' | 'vertical' | 'sidebar';
    footerStyle: 'minimal' | 'standard' | 'detailed';
    containerWidth: 'narrow' | 'standard' | 'wide' | 'full';
  };
  homepage: {
    heroSection: {
      enabled: boolean;
      title: string;
      subtitle: string;
      backgroundImage?: string;
      ctaButton?: {
        text: string;
        link: string;
        style: 'primary' | 'secondary' | 'outline';
      };
    };
    featuredSections: {
      quickActions: boolean;
      popularArticles: boolean;
      recentTickets: boolean;
      announcements: boolean;
    };
  };
  navigation: {
    items: PortalNavigationItem[];
    showSearch: boolean;
    showLanguageSelector: boolean;
    showUserMenu: boolean;
  };
  footer: {
    showCompanyInfo: boolean;
    showSocialLinks: boolean;
    showLegalLinks: boolean;
    customLinks: PortalNavigationItem[];
    copyrightText: string;
  };
  customCss?: string;
  customJs?: string;
}

// Navigation Item
export interface PortalNavigationItem {
  id: string;
  label: string;
  url: string;
  type: 'internal' | 'external' | 'page';
  target?: '_blank' | '_self';
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  children?: PortalNavigationItem[];
}

// SEO Settings
export interface PortalSEOSettings {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  twitterCard: 'summary' | 'summary_large_image';
  canonicalUrl?: string;
  robots: {
    index: boolean;
    follow: boolean;
  };
  structuredData: {
    organization: boolean;
    website: boolean;
    breadcrumbs: boolean;
  };
  analytics: {
    googleAnalytics?: string;
    googleTagManager?: string;
    facebookPixel?: string;
    customScripts: string[];
  };
}

// Portal Page
export interface CustomerPortalPage {
  id: string;
  portalId: string;
  name: string;
  slug: string;
  title: string;
  content: string;
  pageType: 'home' | 'contact' | 'faq' | 'ticket_submit' | 'knowledge_base' | 'custom';
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  customCss?: string;
  customJs?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Portal Theme
export interface CustomerPortalTheme {
  id: string;
  portalId: string;
  name: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  colors: Record<string, string>;
  typography: Record<string, any>;
  layout: Record<string, any>;
  components: Record<string, any>;
  customCss?: string;
  previewImage?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Portal Analytics
export interface CustomerPortalAnalytics {
  id: string;
  portalId: string;
  date: Date;
  pageViews: number;
  uniqueVisitors: number;
  ticketsSubmitted: number;
  faqViews: number;
  searchQueries: number;
  avgSessionDuration?: number;
  bounceRate?: number;
  topPages: { page: string; views: number }[];
  topSearches: { query: string; count: number }[];
  referrers: { source: string; visits: number }[];
  devices: Record<string, number>;
  browsers: Record<string, number>;
  countries: Record<string, number>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Custom Domain
export interface CustomDomain {
  id: string;
  tenantId: string;
  portalId: string;
  domain: string;
  status: 'pending' | 'verifying' | 'active' | 'failed';
  verificationToken?: string;
  dnsRecords: DNSRecord[];
  sslStatus: 'pending' | 'active' | 'failed';
  sslCertificate?: SSLCertificate;
  lastCheckedAt?: Date;
  verifiedAt?: Date;
  errorMessage?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// DNS Record
export interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX';
  name: string;
  value: string;
  ttl?: number;
  priority?: number;
}

// SSL Certificate
export interface SSLCertificate {
  issuer: string;
  subject: string;
  validFrom: Date;
  validTo: Date;
  fingerprint: string;
  serialNumber: string;
}

// Portal Widget
export interface PortalWidget {
  id: string;
  portalId: string;
  name: string;
  type: 'contact_form' | 'faq_search' | 'ticket_status' | 'live_chat' | 'feedback' | 'announcement';
  configuration: Record<string, any>;
  position: {
    page: string | 'all';
    location: 'header' | 'sidebar' | 'content' | 'footer';
    order: number;
  };
  isActive: boolean;
  sortOrder: number;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response DTOs
export interface CreatePortalRequest {
  name: string;
  description?: string;
  subdomain: string;
  branding?: Partial<PortalBranding>;
  features?: Partial<PortalFeatures>;
  customization?: Partial<PortalCustomization>;
  seoSettings?: Partial<PortalSEOSettings>;
}

export interface UpdatePortalRequest {
  name?: string;
  description?: string;
  subdomain?: string;
  customDomain?: string;
  isActive?: boolean;
  branding?: Partial<PortalBranding>;
  features?: Partial<PortalFeatures>;
  customization?: Partial<PortalCustomization>;
  seoSettings?: Partial<PortalSEOSettings>;
}

export interface PublishPortalRequest {
  generateIntegrationCode?: boolean;
  notifyUsers?: boolean;
  backupCurrent?: boolean;
}

export interface CreateCustomDomainRequest {
  domain: string;
  autoVerify?: boolean;
}

export interface CreatePortalPageRequest {
  name: string;
  slug: string;
  title: string;
  content: string;
  pageType: CustomerPortalPage['pageType'];
  seoTitle?: string;
  seoDescription?: string;
  customCss?: string;
  customJs?: string;
}

export interface UpdatePortalPageRequest {
  name?: string;
  slug?: string;
  title?: string;
  content?: string;
  isActive?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  customCss?: string;
  customJs?: string;
}

export interface CreatePortalThemeRequest {
  name: string;
  description?: string;
  colors: Record<string, string>;
  typography?: Record<string, any>;
  layout?: Record<string, any>;
  components?: Record<string, any>;
  customCss?: string;
}

export interface CreatePortalWidgetRequest {
  name: string;
  type: PortalWidget['type'];
  configuration: Record<string, any>;
  position: PortalWidget['position'];
}

// Portal Preview
export interface PortalPreview {
  url: string;
  html: string;
  css: string;
  js: string;
  assets: {
    images: string[];
    fonts: string[];
    icons: string[];
  };
}

// Portal Template
export interface PortalTemplate {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'ecommerce' | 'saas' | 'nonprofit' | 'education' | 'healthcare';
  previewImage: string;
  branding: PortalBranding;
  features: PortalFeatures;
  customization: PortalCustomization;
  pages: Omit<CustomerPortalPage, 'id' | 'portalId' | 'createdAt' | 'updatedAt'>[];
  isSystem: boolean;
  isPremium: boolean;
  metadata: Record<string, any>;
}

// Portal Metrics
export interface PortalMetrics {
  overview: {
    totalViews: number;
    uniqueVisitors: number;
    ticketsSubmitted: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
  trends: {
    period: string;
    views: number;
    visitors: number;
    tickets: number;
  }[];
  topPages: { page: string; views: number; percentage: number }[];
  topSearches: { query: string; count: number; percentage: number }[];
  devices: { device: string; percentage: number }[];
  browsers: { browser: string; percentage: number }[];
  countries: { country: string; percentage: number }[];
  referrers: { source: string; visits: number; percentage: number }[];
}

// Portal Export
export interface PortalExport {
  portal: CustomerPortal;
  pages: CustomerPortalPage[];
  themes: CustomerPortalTheme[];
  widgets: PortalWidget[];
  customDomains: CustomDomain[];
  exportedAt: Date;
  version: string;
}

// Portal Import
export interface PortalImportRequest {
  data: PortalExport;
  options: {
    overwriteExisting: boolean;
    importPages: boolean;
    importThemes: boolean;
    importWidgets: boolean;
    importDomains: boolean;
  };
}

// Validation Schemas (for use with class-validator)
export interface PortalValidationRules {
  subdomain: {
    minLength: number;
    maxLength: number;
    pattern: RegExp;
    reserved: string[];
  };
  customDomain: {
    pattern: RegExp;
    maxLength: number;
  };
  colors: {
    pattern: RegExp; // Hex color pattern
  };
  fileUpload: {
    maxSize: number; // bytes
    allowedTypes: string[];
  };
  content: {
    maxLength: number;
  };
}

// Error Types
export interface PortalError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface PortalValidationError extends PortalError {
  code: 'VALIDATION_ERROR';
  field: string;
  value?: any;
}

export interface PortalDomainError extends PortalError {
  code: 'DOMAIN_ERROR';
  domain: string;
  dnsRecords?: DNSRecord[];
}

export interface PortalPublishError extends PortalError {
  code: 'PUBLISH_ERROR';
  step: 'validation' | 'generation' | 'deployment' | 'notification';
}