import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

function xorEncrypt(plaintext: string, key: string): string {
  const out = plaintext
    .split('')
    .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
    .join('');
  return Buffer.from(out).toString('base64');
}

function xorDecrypt(ciphertextB64: string, key: string): string {
  const buf = Buffer.from(ciphertextB64, 'base64').toString('utf-8');
  const out = buf
    .split('')
    .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
    .join('');
  return out;
}

function maybeEncryptCredentials(json: unknown): string | Record<string, unknown> {
  const key = process.env.DATA_ENCRYPTION_KEY || '';
  if (!key) return (json || {}) as Record<string, unknown>;
  try {
    const plaintext = JSON.stringify(json || {});
    return `enc:${xorEncrypt(plaintext, key)}`;
  } catch {
    return (json || {}) as Record<string, unknown>;
  }
}

function maybeDecryptCredentials(value: unknown): Record<string, unknown> {
  const key = process.env.DATA_ENCRYPTION_KEY || '';
  if (!key) {
    if (typeof value === 'object' && value) return value as Record<string, unknown>;
    try {
      return JSON.parse(String(value || '{}')) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  const s = String(value || '');
  if (!s.startsWith('enc:')) {
    try {
      return typeof value === 'string' ? (JSON.parse(value) as Record<string, unknown>) : ((value || {}) as Record<string, unknown>);
    } catch {
      return (value || {}) as Record<string, unknown>;
    }
  }
  try {
    const dec = xorDecrypt(s.slice(4), key);
    return JSON.parse(dec) as Record<string, unknown>;
  } catch {
    return {};
  }
}

@Injectable()
export class TenantEmailProvidersService {
  constructor(private readonly database: DatabaseService) {}

  async list(tenantId: string) {
    const rows = await this.database.tenantEmailProviderConfig.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: any) => ({
      id: r.id,
      provider: r.provider,
      isPrimary: r.isPrimary,
      fromName: r.fromName,
      fromEmail: r.fromEmail,
      replyToEmail: r.replyToEmail,
      dkimDomain: r.dkimDomain,
      trackingDomain: r.trackingDomain,
      ratePerSecond: r.ratePerSecond,
      credentials: maybeDecryptCredentials(r.credentials),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async create(tenantId: string, body: {
    provider: 'SMTP' | 'SES' | 'SENDGRID' | 'ALIYUN_DM';
    isPrimary?: boolean;
    fromName: string;
    fromEmail: string;
    replyToEmail?: string;
    dkimDomain?: string;
    trackingDomain?: string;
    ratePerSecond?: number;
    credentials: Record<string, unknown>;
  }) {
    if (!body?.provider || !body?.fromEmail || !body?.fromName) {
      throw new BadRequestException('Missing required fields');
    }
    const created = await this.database.tenantEmailProviderConfig.create({
      data: {
        tenantId,
        provider: body.provider as any,
        isPrimary: Boolean(body.isPrimary ?? true),
        fromName: body.fromName,
        fromEmail: body.fromEmail,
        replyToEmail: body.replyToEmail,
        dkimDomain: body.dkimDomain,
        trackingDomain: body.trackingDomain,
        ratePerSecond: Number(body.ratePerSecond || 5),
        credentials: maybeEncryptCredentials(body.credentials) as any,
      },
    });
    // If set primary, demote others
    if (created.isPrimary) {
      await this.database.tenantEmailProviderConfig.updateMany({
        where: { tenantId, NOT: { id: created.id } },
        data: { isPrimary: false },
      });
    }
    return { id: created.id };
  }

  async update(tenantId: string, id: string, body: Partial<{
    isPrimary: boolean;
    fromName: string;
    fromEmail: string;
    replyToEmail?: string;
    dkimDomain?: string;
    trackingDomain?: string;
    ratePerSecond?: number;
    credentials: Record<string, unknown> | string;
  }>) {
    const row = await this.database.tenantEmailProviderConfig.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Provider config not found');
    const data: Record<string, unknown> = {
      ...(body.fromName !== undefined ? { fromName: body.fromName } : {}),
      ...(body.fromEmail !== undefined ? { fromEmail: body.fromEmail } : {}),
      ...(body.replyToEmail !== undefined ? { replyToEmail: body.replyToEmail } : {}),
      ...(body.dkimDomain !== undefined ? { dkimDomain: body.dkimDomain } : {}),
      ...(body.trackingDomain !== undefined ? { trackingDomain: body.trackingDomain } : {}),
      ...(body.ratePerSecond !== undefined ? { ratePerSecond: Number(body.ratePerSecond) } : {}),
      ...(body.credentials !== undefined ? { credentials: maybeEncryptCredentials(body.credentials) as any } : {}),
      ...(body.isPrimary !== undefined ? { isPrimary: Boolean(body.isPrimary) } : {}),
    };
    const updated = await this.database.tenantEmailProviderConfig.update({ where: { id }, data });
    if ((updated as any).isPrimary) {
      await this.database.tenantEmailProviderConfig.updateMany({
        where: { tenantId, NOT: { id: updated.id } },
        data: { isPrimary: false },
      });
    }
    return { success: true };
  }

  async remove(tenantId: string, id: string) {
    const row = await this.database.tenantEmailProviderConfig.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Provider config not found');
    await this.database.tenantEmailProviderConfig.delete({ where: { id } });
    return { success: true };
  }

  async verifyDomain(_tenantId: string, _id: string) {
    // Placeholder: provider-specific verification to be implemented per adapter
    return { status: 'pending', instructions: 'Add SPF/DKIM records as instructed by your provider.' };
  }
}


