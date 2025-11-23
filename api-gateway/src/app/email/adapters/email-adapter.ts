import type {
  BulkSendResult,
  EmailSendRequest,
  EmailSendResult,
  NormalizedEmailEvent,
  TenantEmailProviderResolvedConfig,
} from '../types';

export interface EmailAdapter {
  configure(config: TenantEmailProviderResolvedConfig): void;
  send(request: EmailSendRequest): Promise<EmailSendResult>;
  sendBulk(requests: EmailSendRequest[]): Promise<BulkSendResult>;
  parseWebhook(payload: unknown, headers: Record<string, string>): NormalizedEmailEvent[];
}

export const NOT_IMPLEMENTED = 'Email adapter method not implemented';


