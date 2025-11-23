import type {
  BulkSendResult,
  EmailSendRequest,
  EmailSendResult,
  NormalizedEmailEvent,
  TenantEmailProviderResolvedConfig,
} from '../types';
import type { EmailAdapter } from './email-adapter';
import { NOT_IMPLEMENTED } from './email-adapter';

export class SendgridEmailAdapter implements EmailAdapter {
  configure(_config: TenantEmailProviderResolvedConfig): void {
    // no-op for now
  }
  async send(_request: EmailSendRequest): Promise<EmailSendResult> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async sendBulk(_requests: EmailSendRequest[]): Promise<BulkSendResult> {
    throw new Error(NOT_IMPLEMENTED);
  }

  parseWebhook(_payload: unknown, _headers: Record<string, string>): NormalizedEmailEvent[] {
    throw new Error(NOT_IMPLEMENTED);
  }
}


