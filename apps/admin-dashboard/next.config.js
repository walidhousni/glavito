//@ts-check

const path = require('path');
const { withNx } = require('@nx/next/plugins/with-nx');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./next-intl.config.js');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {
    svgr: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  output: 'standalone',
  distDir: '.next',
  // Remove esmExternals override to avoid module interop issues with React 19 / Next 15
  // experimental: {
  //   esmExternals: false,
  // },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'Permissions-Policy', value: 'interest-cohort=()' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' }
      ],
    },
  ],
  outputFileTracing: true,
  trailingSlash: false,
  reactStrictMode: true,
  devIndicators: { buildActivity: true },
  webpack: (config) => {
    config.plugins = config.plugins || [];
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
};

// Ensure plugin order: apply next-intl first, then Nx wrapper
module.exports = withNx(withNextIntl(nextConfig));
