import { Injectable, Logger } from '@nestjs/common';
import type { EmailTheme } from '@glavito/shared-types';

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
    concat: (...args: unknown[]) => String(args.slice(0, -1).map((x) => String(x ?? '')).join('')),
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

  wrapEmailHtml(opts: { html: string; theme: EmailTheme; logoUrl?: string; brandName?: string }): string {
    const theme = opts.theme;
    const logoUrl = opts.logoUrl || '';
    const brandName = opts.brandName || 'Brand';
    const cssReset = `
      body { margin:0; padding:0; background:${theme.bodyBackground}; }
      img { border:0; outline:none; text-decoration:none; display:block; max-width:100%; height:auto; }
      table { border-collapse:collapse; border-spacing:0; mso-table-lspace:0pt; mso-table-rspace:0pt; }
      a { color:${theme.linkColor}; text-decoration:none; }
      .container { width:100%; background:${theme.bodyBackground}; padding:24px 0; }
      .inner { width:100%; max-width:600px; margin:0 auto; background:${theme.contentBackground}; border-radius:8px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,0.04); }
      .header { background:${theme.headerBackground}; padding:16px; text-align:center; }
      .brand { display:inline-flex; align-items:center; gap:8px; color:${theme.textColor}; font-family:Arial, Helvetica, sans-serif; font-size:16px; font-weight:600; }
      .content { padding:16px; color:${theme.textColor}; font-family:Arial, Helvetica, sans-serif; line-height:1.5; }
      .btn { display:inline-block; padding:12px 18px; background:${theme.buttonBackground}; color:${theme.buttonTextColor}; border-radius:6px; }
      .footer { color:#6b7280; padding:16px; text-align:center; font-size:12px; font-family:Arial, Helvetica, sans-serif; }
    `;
    const logoImg = logoUrl ? `<img src="${logoUrl}" alt="${brandName}" style="height:28px;display:inline-block"/>` : '';
    return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>${cssReset}</style>
  </head>
  <body>
    <div class="container">
      <div class="inner">
        <div class="header">
          <span class="brand">${logoImg}${brandName}</span>
        </div>
        <div class="content">${opts.html}</div>
      </div>
      <div class="footer">${theme.footerText}</div>
    </div>
  </body>
 </html>`;
  }
}


