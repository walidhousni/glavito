import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface Response<T> {
  data: T;
  meta?: {  
    timestamp: string;
    requestId: string;
    path: string;
    method: string;
    version: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    const tenantHost = request.get('x-tenant-host') || request.get('X-Tenant-Host') || '';
    const brandName = request.get('x-brand-name') || '';
    const locale = request.get('x-locale') || request.get('Accept-Language') || '';
    if (tenantHost) response.setHeader('X-Partner-Domain', tenantHost);
    if (brandName) response.setHeader('X-Partner-Brand', brandName);
    if (locale) response.setHeader('Content-Language', (locale as string).split(',')[0]);
    
    return next.handle().pipe(
      map((data) => {
        // Handle paginated responses
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            data: data.data,
            meta: {
              timestamp: new Date().toISOString(),
              requestId: response.getHeader('X-Request-ID') as string,
              path: request.originalUrl,
              method: request.method,
              version: '1.0.0',
            },
            pagination: data.meta,
          };
        }

        // Handle array responses
        if (Array.isArray(data)) {
          return {
            data,
            meta: {
              timestamp: new Date().toISOString(),
              requestId: response.getHeader('X-Request-ID') as string,
              path: request.originalUrl,
              method: request.method,
              version: '1.0.0',
            },
            pagination: {
              page: 1,
              limit: data.length,
              total: data.length,
              totalPages: 1,
            },
          };
        }

        // Handle standard responses
        return {
          data,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: response.getHeader('X-Request-ID') as string,
            path: request.originalUrl,
            method: request.method,
            version: '1.0.0',
          },
        };
      })
    );
  }
}