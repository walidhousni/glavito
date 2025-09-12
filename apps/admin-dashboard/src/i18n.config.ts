import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const locales = ['en', 'ar', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  // A list of all locales that are supported
  locales,

  // Used when no locale is specified in the URL
  defaultLocale: 'en',

  // The locale is not shown in the URL for this locale
  localePrefix: 'always',
});

// Lightweight wrappers around Next.js' navigation APIs that will
// consider the routing configuration
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);