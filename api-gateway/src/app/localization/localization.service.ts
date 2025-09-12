import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { DatabaseService } from '@glavito/shared-database';

const SUPPORTED = ['en', 'fr', 'ar'] as const;
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'MAD', 'AED', 'SAR', 'CAD'] as const;
export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number];
export type LocaleCode = typeof SUPPORTED[number];

@Injectable()
export class LocalizationService {
  constructor(private readonly db: DatabaseService) {}

  getSupported(): LocaleCode[] {
    return SUPPORTED.slice() as LocaleCode[];
  }

  getSupportedCurrencies(): CurrencyCode[] {
    return SUPPORTED_CURRENCIES.slice() as CurrencyCode[];
  }

  negotiate(acceptLanguage?: string, fallback: LocaleCode = 'en'): LocaleCode {
    if (!acceptLanguage) return fallback;
    const parts = acceptLanguage.split(',').map((p) => p.trim().split(';')[0]);
    for (const p of parts) {
      const base = p.toLowerCase().split('-')[0];
      if ((SUPPORTED as readonly string[]).includes(base)) return base as LocaleCode;
    }
    return fallback;
  }

  async getTenantLocale(tenantId: string): Promise<LocaleCode> {
    const tenant = await this.db.tenant.findUnique({ where: { id: tenantId } });
    type Settings = { localization?: { locale?: string }; language?: string } | undefined;
    const settings = (tenant as unknown as { settings?: Settings } | null)?.settings || {};
    const locale = settings.localization?.locale || settings.language || 'en';
    return (SUPPORTED as readonly string[]).includes(locale) ? (locale as LocaleCode) : 'en';
  }

  async setTenantLocale(tenantId: string, locale: LocaleCode) {
    const tenant = await this.db.tenant.findUnique({ where: { id: tenantId } });
    type Settings = { localization?: { locale?: string } } | undefined;
    const current = (tenant as unknown as { settings?: Settings } | null)?.settings || {};
    const next: NonNullable<Settings> = { ...current, localization: { ...(current?.localization || {}), locale } };
    const nextJson: Prisma.InputJsonValue = next as unknown as Prisma.InputJsonValue;
    await this.db.tenant.update({ where: { id: tenantId }, data: { settings: nextJson } });
    return { locale } as const;
  }

  async getTenantCurrency(tenantId: string): Promise<CurrencyCode> {
    // Prefer billing configuration currency when available
    const billing = await this.db.billingConfiguration.findUnique({ where: { tenantId } }).catch(() => null as any);
    const raw = (billing?.currency as string | undefined) || 'USD';
    const code = (raw || 'USD').toUpperCase();
    return (SUPPORTED_CURRENCIES as readonly string[]).includes(code) ? (code as CurrencyCode) : 'USD';
  }

  async setTenantCurrency(tenantId: string, currency: CurrencyCode) {
    const code = currency.toUpperCase() as CurrencyCode;
    // Upsert billing configuration
    await this.db.billingConfiguration.upsert({
      where: { tenantId },
      create: { tenantId, currency: code },
      update: { currency: code },
    });
    return { currency: code } as const;
  }
}


