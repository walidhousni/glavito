import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { AliyunDirectMailAdapter } from './adapters/aliyun-dm.adapter';
import { SendgridEmailAdapter } from './adapters/sendgrid.adapter';
import { SesEmailAdapter } from './adapters/ses.adapter';
import { SmtpEmailAdapter } from './adapters/smtp.adapter';
import type { EmailAdapter } from './adapters/email-adapter';
import type { TenantEmailProviderResolvedConfig } from './types';

@Injectable()
export class EmailProviderFactory {
  constructor(private readonly database: DatabaseService) {}

  async getAdapterForTenant(tenantId: string): Promise<EmailAdapter> {
    const resolved = await this.getResolvedConfig(tenantId);
    const adapter =
      resolved.provider === 'SES'
        ? new SesEmailAdapter()
        : resolved.provider === 'SENDGRID'
        ? new SendgridEmailAdapter()
        : resolved.provider === 'ALIYUN_DM'
        ? new AliyunDirectMailAdapter()
        : new SmtpEmailAdapter();
    adapter.configure(resolved);
    return adapter;
  }

  async getResolvedConfig(tenantId: string): Promise<TenantEmailProviderResolvedConfig> {
    const config = await this.database.tenantEmailProviderConfig.findFirst({
      where: { tenantId, isPrimary: true },
    });
    const provider = (config as any)?.provider as string | undefined;
    return {
      provider: (provider as any) || 'SMTP',
      fromEmail: ((config as any)?.fromEmail || '') as string,
      fromName: (config as any)?.fromName || undefined,
      replyToEmail: (config as any)?.replyToEmail || undefined,
      credentials: ((config as any)?.credentials || {}) as Record<string, unknown>,
      trackingDomain: (config as any)?.trackingDomain || undefined,
      ratePerSecond: Number((config as any)?.ratePerSecond || 5),
    };
  }
}


