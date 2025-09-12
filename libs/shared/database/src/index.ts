// Export new Prisma service and module
export * from './lib/prisma.service.js';
export * from './lib/prisma.module.js';

// Backward compatibility exports
export { PrismaService as DatabaseService } from './lib/prisma.service.js';
export { PrismaModule as DatabaseModule } from './lib/prisma.module.js';

// Re-export from database.ts for any additional exports
export * from './lib/database.js';