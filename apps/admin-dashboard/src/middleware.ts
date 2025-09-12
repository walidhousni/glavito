import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';

const locales = ['en', 'fr', 'ar'] as const;

const intl = createMiddleware({
  locales: locales as unknown as string[],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export default function middleware(req: NextRequest) {
  const res = intl(req);

  // Set headers for downstream API calls
  const pathname = req.nextUrl.pathname;
  const first = pathname.split('/').filter(Boolean)[0] || 'en';
  const locale = (locales as readonly string[]).includes(first) ? first : 'en';
  res.headers.set('x-locale', locale);

  // Currency from cookie or default by locale
  const cookieCurrency = req.cookies.get('currency')?.value?.toUpperCase();
  const defaultByLocale: Record<string, string> = { ar: 'AED', fr: 'EUR', en: 'USD' };
  const currency = (cookieCurrency && ['USD','EUR','GBP','MAD','AED','SAR','CAD'].includes(cookieCurrency))
    ? cookieCurrency
    : (defaultByLocale[locale] || 'USD');
  res.headers.set('x-currency', currency);

  const hostname = req.headers.get('host') || '';
  res.headers.set('x-tenant-host', hostname);

  return res;
}

export const config = {
  matcher: [
    '/',
    '/(ar|en|fr)/:path*',
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};