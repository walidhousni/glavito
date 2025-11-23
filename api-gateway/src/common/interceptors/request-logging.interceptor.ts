import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { metrics } from '@opentelemetry/api';
import { ModuleRef } from '@nestjs/core';
import { UsageTrackingService } from '../../app/usage/usage-tracking.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);
  private readonly meter = metrics.getMeter('glavito-api-gateway', '1.0.0');
  private readonly requestCounter = this.meter.createCounter('http_requests_total', {
    description: 'Total number of HTTP requests',
  });
  private readonly durationHist = this.meter.createHistogram('http_request_duration_seconds', {
    description: 'Duration of HTTP requests in seconds',
    unit: 's',
  });

  private usageTrackingService?: UsageTrackingService;
  constructor(private readonly moduleRef: ModuleRef) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    // Generate request ID if not present
    const requestId = request.headers['x-request-id'] as string || uuidv4();
    request.headers['x-request-id'] = requestId;
    response.setHeader('X-Request-ID', requestId);

    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = request;
    const userAgent = headers['user-agent'];
    const userId = (request as unknown as { user?: { id?: string } }).user?.id || 'anonymous';
    const tenantId = (request as unknown as { user?: { tenantId?: string } }).user?.tenantId;

    // Log request start
    this.logger.log({
      message: 'Request started',
      requestId,
      method,
      url: originalUrl,
      ip,
      userAgent,
      userId,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          this.logger.log({
            message: 'Request completed successfully',
            requestId,
            method,
            url: originalUrl,
            statusCode,
            duration: `${duration}ms`,
            userId,
            timestamp: new Date().toISOString(),
            ...(process.env.NODE_ENV === 'development' && { response: data }),
          });

          try {
            const labels = { method, route: originalUrl, status_code: String(statusCode) } as Record<string, string>;
            this.requestCounter.add(1, labels);
            this.durationHist.record(duration / 1000, labels);
          } catch {
            // ignore metrics errors
          }

          // Track API usage for billing if tenantId is available
          if (tenantId) {
            const usageService = this.usageTrackingService || (() => {
              try {
                if (this.moduleRef) {
                  this.usageTrackingService = this.moduleRef.get(UsageTrackingService, { strict: false });
                }
              } catch (resolveErr) {
                this.logger.warn('UsageTrackingService not available', resolveErr);
              }
              return this.usageTrackingService;
            })();

            if (usageService) {
              usageService
                .trackApiUsage({
                  tenantId,
                  userId: userId !== 'anonymous' ? userId : undefined,
                  endpoint: originalUrl,
                  method,
                  statusCode,
                  duration,
                  userAgent,
                  ipAddress: ip,
                  requestId,
                  metadata: { headers: Object.keys(headers) },
                })
                .catch((error) => {
                  this.logger.warn('Failed to track API usage', error);
                });
            }
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error({
            message: 'Request failed',
            requestId,
            method,
            url: originalUrl,
            statusCode,
            duration: `${duration}ms`,
            userId,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          });

          try {
            const labels = { method, route: originalUrl, status_code: String(statusCode) } as Record<string, string>;
            this.requestCounter.add(1, labels);
            this.durationHist.record(duration / 1000, labels);
          } catch {
            // ignore metrics errors
          }

          // Track API usage for billing if tenantId is available (even for errors)
          if (tenantId) {
            const usageService = this.usageTrackingService || (() => {
              try {
                if (this.moduleRef) {
                  this.usageTrackingService = this.moduleRef.get(UsageTrackingService, { strict: false });
                }
              } catch (resolveErr) {
                this.logger.warn('UsageTrackingService not available', resolveErr);
              }
              return this.usageTrackingService;
            })();

            if (usageService) {
              usageService
                .trackApiUsage({
                  tenantId,
                  userId: userId !== 'anonymous' ? userId : undefined,
                  endpoint: originalUrl,
                  method,
                  statusCode,
                  duration,
                  userAgent,
                  ipAddress: ip,
                  requestId,
                  metadata: { headers: Object.keys(headers), error: error.message },
                })
                .catch((trackingError) => {
                  this.logger.warn('Failed to track API usage for error', trackingError);
                });
            }
          }
        },
      })
    );
  }
}