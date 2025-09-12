import { routing } from '@/i18n.config';

// Re-export from the new i18n.config.ts location
export { routing, Link, redirect, usePathname, useRouter } from '@/i18n.config';
export type { Locale } from '@/i18n.config';

// For backward compatibility
export const locales = routing.locales;