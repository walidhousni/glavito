const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
  },
  resolve: {
    alias: {
      '@glavito/shared-database': join(__dirname, '../libs/shared/database/src/index.ts'),
      '@glavito/shared-auth': join(__dirname, '../libs/shared/auth/src/index.ts'),
      // Map shared libs to their TS sources so webpack can resolve them during build
      '@glavito/shared-conversation': join(__dirname, '../libs/shared/conversation/src/index.ts'),
      '@glavito/shared-workflow': join(__dirname, '../libs/shared/workflow/src/index.ts'),
      '@glavito/shared-kafka': join(__dirname, '../libs/shared/kafka/src/index.ts'),
      '@glavito/shared-analytics': join(__dirname, '../libs/shared/analytics/src/index.ts'),
      '@glavito/shared-types': join(__dirname, '../libs/shared/types/src/index.ts'),
      '@glavito/shared-ai': join(__dirname, '../libs/shared/ai/src/index.ts'),
      '@glavito/shared-redis': join(__dirname, '../libs/shared/redis/src/index.ts'),
    },
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
    }),
    // Also ship compiled workspace libs into dist/node_modules to satisfy any residual requires
    new CopyWebpackPlugin({
      patterns: [
        {
          from: join(__dirname, '../dist/libs/shared/kafka'),
          to: join(__dirname, 'dist/node_modules/@glavito/shared-kafka'),
        },
        {
          from: join(__dirname, '../dist/libs/shared/conversation'),
          to: join(__dirname, 'dist/node_modules/@glavito/shared-conversation'),
        },
        {
          from: join(__dirname, '../dist/libs/shared/workflow'),
          to: join(__dirname, 'dist/node_modules/@glavito/shared-workflow'),
        },
        {
          from: join(__dirname, '../dist/libs/shared/types'),
          to: join(__dirname, 'dist/node_modules/@glavito/shared-types'),
        },
        {
          from: join(__dirname, '../dist/libs/shared/ai'),
          to: join(__dirname, 'dist/node_modules/@glavito/shared-ai'),
        },
        {
          from: join(__dirname, '../dist/libs/shared/analytics'),
          to: join(__dirname, 'dist/node_modules/@glavito/shared-analytics'),
        },
        {
          from: join(__dirname, '../dist/libs/shared/auth'),
          to: join(__dirname, 'dist/node_modules/@glavito/shared-auth'),
        },
        // database and redis do not have builds in dist; skip copying to avoid errors
      ],
    }),
  ],
};
