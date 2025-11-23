import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n.config';
import { cookies, headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: 'en' | 'ar' | 'fr' }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  if (!routing.locales.includes(locale)) {
    notFound();
  }

  const messages = await getMessages();
  const hdrs = await headers();
  const cookieStore = await cookies();
  const currency = hdrs.get('x-currency') || cookieStore.get('currency')?.value || 'USD';

  return (
    <NextIntlClientProvider messages={messages}>
      <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale} data-currency={currency}>
        {children}
      </div>
    </NextIntlClientProvider>
  );
}