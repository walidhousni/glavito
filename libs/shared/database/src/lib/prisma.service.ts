import { PrismaClient } from '@prisma/client';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  [key: string]: any;
  private readonly logger = new Logger(PrismaService.name);
  private readonly meter = metrics.getMeter('glavito-api-gateway', '1.0.0');
  private readonly queryDuration = this.meter.createHistogram('db_prisma_query_duration_seconds', {
    description: 'Prisma query duration in seconds',
    unit: 's',
  });
  private readonly slowThresholdMs = parseInt(process.env.PRISMA_SLOW_QUERY_MS || '200', 10);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        ...(process.env.NODE_ENV !== 'production' ? ([{ emit: 'event', level: 'query' }] as any) : []),
      ],
      errorFormat: 'pretty',
    });

    // Record query durations (all environments) using Prisma middleware
    this.$use(async (params: any, next: (params: any) => Promise<any>) => {
      const start = process.hrtime.bigint();
      const result = await next(params);
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      try {
        this.queryDuration.record(durationMs / 1000, {
          model: (params.model as string) || 'unknown',
          operation: (params.action as string) || 'unknown',
        } as any);
      } catch {
        /* ignore metrics */
      }
      if (durationMs >= this.slowThresholdMs) {
        const msg = `Slow query (${durationMs.toFixed(1)}ms): ${(params.model as string) || 'unknown'}.${(params.action as string) || 'unknown'}`;
        this.logger.warn(msg);
      }
      return result;
    });

    // Transparent field encryption at rest (PII best-effort)
    const encryptIfPII = (model: string, data: Record<string, unknown>) => {
      if (!data) return data;
      const piiFieldsByModel: Record<string, string[]> = {
        User: ['email', 'firstName', 'lastName'],
        Customer: ['email', 'phone', 'firstName', 'lastName', 'company'],
        Lead: ['email', 'phone', 'firstName', 'lastName', 'company'],
      };
      const fields = piiFieldsByModel[model];
      if (!fields) return data;
      const key = process.env.DATA_ENCRYPTION_KEY || '';
      if (!key) return data;
      const enc = (v: string) => Buffer.from(v.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('')).toString('base64');
      for (const f of fields) {
        if (typeof (data as any)[f] === 'string' && (data as any)[f]) {
          (data as any)[f] = `enc:${enc(String((data as any)[f]))}`;
        }
      }
      return data;
    };

    this.$use(async (params: any, next: (params: any) => Promise<any>) => {
      const actions = new Set(['create', 'update', 'upsert']);
      if (params?.model && actions.has(params.action)) {
        if (params.args?.data) {
          params.args.data = encryptIfPII(params.model, params.args.data);
        }
        if (params.args?.create) {
          params.args.create = encryptIfPII(params.model, params.args.create);
        }
        if (params.args?.update) {
          params.args.update = encryptIfPII(params.model, params.args.update);
        }
      }
      return next(params);
    });

    // In non-production, also attach Prisma query event for debug with truncated SQL
    if (process.env.NODE_ENV !== 'production') {
      this.$on('query' as never, (e: any) => {
        const durationMs = e.duration;
        if (durationMs >= this.slowThresholdMs) {
          const sql = (e.query || '').slice(0, 500);
          this.logger.warn(`Slow query (dev) (${durationMs}ms) SQL: ${sql}${e.query && e.query.length > 500 ? '…' : ''}`);
        }
      });
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Successfully disconnected from database');
    } catch (error) {
      this.logger.error('Error disconnecting from database', error);
    }
  }

  /**
   * Execute a transaction with proper typing
   */
  async executeTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return this.$transaction(fn);
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string }> {
    try {
      await this.$queryRaw`SELECT 1`;
      return { status: 'ok', message: 'Database connection is healthy' };
    } catch (error: any) {
      return { status: 'error', message: `Database connection failed: ${error.message}` };
    }
  }

  /**
   * Clean up database for testing
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'test') {
      try {
        await this.$transaction([
          this.auditLog.deleteMany(),
          this.message.deleteMany(),
          this.conversation.deleteMany(),
          this.channel.deleteMany(),
          this.ticket.deleteMany(),
          this.customer.deleteMany(),
          this.user.deleteMany(),
          this.tenant.deleteMany(),
        ]);
      } catch (error) {
        this.logger.warn('Error during database cleanup:', error);
      }
    }
  }
}