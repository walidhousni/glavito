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
    // svgr option is deprecated/removed in recent Nx versions
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  skipMiddlewareUrlNormalize: true,
  skipTrailingSlashRedirect: true,
  output: 'standalone',
  distDir: '.next',
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons'],
    turbo: {
      resolveExtensions: ['.tsx', '.ts', '.jsx', '.js'],
    },
  },
  
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
  trailingSlash: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.icons8.com',
      },
    ],
  },
  webpack: (config, { dev, isServer }) => {
    config.plugins = config.plugins || [];
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    
    // Optimize webpack for dev speed
    if (dev) {
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 300,
      };
    }
    
    // Reduce bundle size
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    
    return config;
  },
};

// Ensure plugin order: apply next-intl first, then Nx wrapper
module.exports = withNx(withNextIntl(nextConfig));
