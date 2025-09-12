import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n.config';

export default createMiddleware(routing);

export const config = {
  // Skip all paths that should not be internationalized
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // However, match API routes that have a locale prefix
    '/(en|ar|fr)/api/:path*',
  ],
};