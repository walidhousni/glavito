// Re-export the new Prisma service and module for backward compatibility
export * from './prisma.service.js';
export * from './prisma.module.js';

// Backward compatibility exports
import { PrismaService } from './prisma.service.js';
import { PrismaModule } from './prisma.module.js';

// Alias for backward compatibility
export { PrismaService as DatabaseService };
export { PrismaModule as DatabaseModule };
