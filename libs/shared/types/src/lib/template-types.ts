/**
 * Template Types
 * Types for onboarding template management and configuration
 */

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  category: 'complete' | 'workflow' | 'faq' | 'email' | 'dashboard' | 'survey';
  version: string;
  isPublic: boolean;
  isOfficial: boolean;
  tags: string[];
  configuration: TemplateConfiguration;
  metadata: TemplateMetadata;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  rating: number;
  reviews: TemplateReview[];
}

export interface TemplateConfiguration {
  organizationSetup?: OrganizationTemplate;
  channelIntegration?: ChannelTemplate;
  teamManagement?: TeamTemplate;
  workflowRules?: WorkflowTemplate;
  knowledgeBase?: KnowledgeBaseTemplate;
  customerPortal?: PortalTemplate;
  aiAutomation?: AITemplate;
  analytics?: AnalyticsTemplate;
  customFields?: CustomFieldTemplate[];
}

export interface OrganizationTemplate {
  requiredFields: string[];
  optionalFields: string[];
  defaultValues: Record<string, any>;
  branding: {
    colorScheme: string[];
    logoGuidelines: string;
    fontRecommendations: string[];
  };
  businessHours: {
    timezone: string;
    workingDays: number[];
    workingHours: { start: string; end: string };
    holidays: string[];
  };
}

export interface ChannelTemplate {
  recommendedChannels: string[];
  channelPriority: Record<string, number>;
  integrationSteps: Array<{
    channel: string;
    steps: string[];
    estimatedTime: number;
  }>;
  defaultSettings: Record<string, any>;
}

export interface TeamTemplate {
  roles: Array<{
    name: string;
    permissions: string[];
    description: string;
    isRequired: boolean;
  }>;
  teamStructure: {
    minSize: number;
    maxSize: number;
    recommendedSize: number;
    hierarchy: string[];
  };
  skillRequirements: Array<{
    skill: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    isRequired: boolean;
  }>;
}

export interface WorkflowTemplate {
  rules: Array<{
    name: string;
    description: string;
    conditions: Record<string, any>;
    actions: Record<string, any>;
    priority: number;
    isActive: boolean;
  }>;
  slaRules: Array<{
    name: string;
    conditions: Record<string, any>;
    responseTime: number;
    resolutionTime: number;
    escalationRules: Array<{
      level: number;
      timeThreshold: number;
      assignTo: string;
    }>;
  }>;
  categories: string[];
  priorities: string[];
  statuses: string[];
}

export interface KnowledgeBaseTemplate {
  categories: Array<{
    name: string;
    description: string;
    icon: string;
    order: number;
  }>;
  articles: Array<{
    title: string;
    content: string;
    category: string;
    tags: string[];
    isPublished: boolean;
    order: number;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
    category: string;
    order: number;
  }>;
  searchKeywords: string[];
}

// Import PortalTemplate from portal-types
import type { PortalTemplate } from './portal-types.js';

export interface AITemplate {
  automationRules: Array<{
    name: string;
    trigger: string;
    conditions: Record<string, any>;
    actions: Record<string, any>;
    confidence: number;
  }>;
  chatbotConfig: {
    personality: string;
    responseStyle: 'formal' | 'casual' | 'friendly';
    fallbackMessages: string[];
    escalationTriggers: string[];
  };
  classificationRules: Array<{
    category: string;
    keywords: string[];
    confidence: number;
    actions: string[];
  }>;
}

export interface AnalyticsTemplate {
  dashboards: Array<{
    name: string;
    widgets: Array<{
      type: string;
      title: string;
      config: Record<string, any>;
    }>;
  }>;
  kpis: Array<{
    name: string;
    description: string;
    formula: string;
    target: number;
    unit: string;
  }>;
  reports: Array<{
    name: string;
    type: string;
    schedule: string;
    recipients: string[];
  }>;
}

export interface CustomFieldTemplate {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date';
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface TemplateMetadata {
  industry: string;
  companySize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedSetupTime: number; // minutes
  prerequisites: string[];
  supportedFeatures: string[];
  integrations: string[];
  languages: string[];
  screenshots: string[];
  documentation: string;
  changelog: Array<{
    version: string;
    date: Date;
    changes: string[];
  }>;
}

export interface TemplateReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  pros: string[];
  cons: string[];
  createdAt: Date;
}

export interface TemplateFilter {
  industry?: string;
  category?: string;
  companySize?: string;
  complexity?: string;
  tags?: string[];
  rating?: number;
  isOfficial?: boolean;
  isPublic?: boolean;
}

export interface SmartRecommendation {
  templateId: string;
  confidence: number;
  reasons: string[];
  estimatedBenefit: string;
  customizations: Array<{
    field: string;
    suggestedValue: any;
    reason: string;
  }>;
}

export interface TemplateCategory {
  name: string;
  count: number;
  description: string;
  icon?: string;
}

export interface TemplateIndustry {
  name: string;
  count: number;
  description: string;
  icon?: string;
}

export interface TemplateUsageAnalytics {
  totalTemplates: number;
  totalUsage: number;
  averageRating: number;
  byIndustry: Record<string, number>;
  byCategory: Record<string, number>;
  topTemplates: Array<{
    id: string;
    name: string;
    usageCount: number;
    rating: number;
  }>;
}

export interface TemplateSearchSuggestion {
  text: string;
  type: 'template' | 'tag' | 'industry' | 'category';
  count?: number;
}

export interface TemplateApplyResult {
  templateId: string;
  status: 'success' | 'error';
  message?: string;
  appliedComponents?: string[];
  skippedComponents?: string[];
}

export interface TemplatePreview {
  id: string;
  name: string;
  description: string;
  industry: string;
  category: string;
  rating: number;
  usageCount: number;
  estimatedSetupTime: number;
  tags: string[];
  screenshots: string[];
  features: string[];
}

export interface TemplateCustomization {
  templateId: string;
  customizations: Record<string, any>;
  appliedAt: Date;
  appliedBy: string;
  version: string;
}

export interface TemplateValidation {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    field: string;
    message: string;
    suggestion?: string;
  }>;
}

export interface TemplateExport {
  template: OnboardingTemplate;
  format: 'json' | 'yaml' | 'xml';
  includeReviews: boolean;
  includeUsageStats: boolean;
  exportedAt: Date;
  exportedBy: string;
}