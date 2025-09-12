import { Injectable, Logger } from '@nestjs/common';

type TemplateHelpers = Record<string, (...args: unknown[]) => unknown>;

@Injectable()
export class TemplateEngineService {
  private readonly logger = new Logger(TemplateEngineService.name);
  private hbs: any | null = null;
  private readonly helpers: TemplateHelpers = {
    uppercase: (v: unknown) => String(v ?? '').toUpperCase(),
    lowercase: (v: unknown) => String(v ?? '').toLowerCase(),
    json: (v: unknown) => {
      try { return JSON.stringify(v, null, 2); } catch { return String(v); }
    },
    eq: (a: unknown, b: unknown) => a === b,
    not: (v: unknown) => !v,
    or: (a: unknown, b: unknown) => Boolean(a) || Boolean(b),
    and: (a: unknown, b: unknown) => Boolean(a) && Boolean(b),
    date: (v: unknown) => {
      try {
        const d = new Date(String(v));
        if (isNaN(d.getTime())) return String(v);
        return d.toISOString().slice(0, 10);
      } catch { return String(v); }
    },
    currency: (amount: unknown, currency = 'USD') => {
      const n = Number(amount);
      if (!isFinite(n)) return String(amount);
      try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: String(currency) }).format(n); } catch { return String(amount); }
    },
  };

  private ensureHandlebarsLoaded(): void {
    if (this.hbs) return;
    try {
      // Dynamically import to avoid hard dependency at build time
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const handlebars = require('handlebars');
      Object.entries(this.helpers).forEach(([name, fn]) => {
        try { handlebars.registerHelper(name, fn); } catch { /* ignore */ }
      });
      this.hbs = handlebars;
    } catch (err) {
      this.logger.debug(`handlebars not available, using fallback engine: ${(err as Error)?.message}`);
      this.hbs = null;
    }
  }

  render(content: string, variables: Record<string, unknown>): { content: string; engine: 'handlebars' | 'fallback' } {
    this.ensureHandlebarsLoaded();
    if (this.hbs) {
      try {
        const template = this.hbs.compile(content, { noEscape: false });
        const result = template(variables || {});
        return { content: result, engine: 'handlebars' };
      } catch (err) {
        this.logger.warn(`handlebars render failed, falling back: ${(err as Error)?.message}`);
      }
    }
    // Fallback: simple {{key}} replacement, not supporting loops/conditions
    let out = String(content || '');
    Object.entries(variables || {}).forEach(([k, v]) => {
      const re = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
      out = out.replace(re, String(v ?? ''));
    });
    return { content: out, engine: 'fallback' };
  }
}


