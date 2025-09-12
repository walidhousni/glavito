import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '@glavito/shared-redis';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  private readonly defaultTtlSeconds: number;
  private readonly enabled: boolean;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.defaultTtlSeconds = parseInt(this.config.get('CACHE_TTL_SECONDS') || '30', 10);
    this.enabled = (this.config.get('CACHE_ENABLED') || 'true') === 'true';
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    if (!this.enabled) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { headers?: Record<string, string>, method?: string, url?: string, user?: any }>();

    // Cache GET-only, skip auth-sensitive endpoints
    if ((req.method || '').toUpperCase() !== 'GET') {
      return next.handle();
    }

    const tenantHost = (req.headers?.['x-tenant-host'] || req.headers?.['X-Tenant-Host'] || '').toString();
    const authHeader = (req.headers?.['authorization'] || req.headers?.['Authorization'] || '').toString();
    // Allow-listed cacheable paths (safe, tenant-scoped, query-only)
    const url = (req.url || '').toString();
    const isAllowListed = (
      url.includes('/tickets/search/suggest') ||
      url.includes('/search/federated') ||
      url.includes('/knowledge/search') ||
      /\/conversations(\/.*)?(\?|$)/.test(url)
    );
    // Avoid caching per-user secured responses by default if bearer token is present, unless allow-listed
    if (authHeader.startsWith('Bearer ') && !isAllowListed) {
      return next.handle();
    }

    const cacheKey = `http:${tenantHost}:${req.url}`;
    try {
      const cached = await this.redis.cacheGet(cacheKey);
      if (cached !== null && cached !== undefined) {
        return of(cached);
      }
    } catch (err) {
      this.logger.debug(`Cache read miss/error for key ${cacheKey}: ${String(err)}`);
    }

    return next.handle().pipe(
      tap(async (response) => {
        try {
          await this.redis.cacheSet(cacheKey, response, this.defaultTtlSeconds);
        } catch (err) {
          this.logger.debug(`Cache write error for key ${cacheKey}: ${String(err)}`);
        }
      })
    );
  }
}


