export interface EmailSendPersonalization {
  toEmail: string;
  toName?: string;
  variables?: Record<string, unknown>;
}

export interface EmailSendRequest {
  tenantId: string;
  subject: string;
  html: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
  replyToEmail?: string;
  headers?: Record<string, string>;
  personalizations: EmailSendPersonalization[];
  campaignId?: string;
  journeyId?: string;
  stepId?: string;
  templateId?: string;
  tracking?: {
    open?: boolean;
    click?: boolean;
  };
}

export interface EmailSendResult {
  providerMessageId?: string;
  messageIds: string[];
}

export interface BulkSendResult {
  providerBatchId?: string;
  messageIds: string[];
}

export interface NormalizedEmailEvent {
  messageId?: string;
  providerMessageId?: string;
  tenantId?: string;
  type:
    | 'delivered'
    | 'open'
    | 'click'
    | 'bounce'
    | 'complaint'
    | 'dropped'
    | 'spam'
    | 'deferred'
    | 'failed';
  timestamp?: number;
  url?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface TenantEmailProviderResolvedConfig {
  provider: 'SMTP' | 'SES' | 'SENDGRID' | 'ALIYUN_DM';
  fromEmail: string;
  fromName?: string;
  replyToEmail?: string;
  credentials: Record<string, unknown>;
  ratePerSecond?: number;
  trackingDomain?: string;
}


