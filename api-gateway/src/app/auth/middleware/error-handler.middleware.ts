import { Injectable, Logger, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { EventPublisherService } from '@glavito/shared-kafka';

// Extend Request interface to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  method: string;
  correlationId?: string;
  details?: any;
  stack?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface BusinessError extends Error {
  statusCode?: number;
  errorCode?: string;
  details?: any;
}

export class AuthenticationError extends HttpException {
  constructor(message: string, errorCode?: string) {
    super(message, HttpStatus.UNAUTHORIZED);
    this.name = 'AuthenticationError';
    this.errorCode = errorCode || 'AUTH_ERROR';
  }
  errorCode: string;
}

export class AuthorizationError extends HttpException {
  constructor(message: string, errorCode?: string) {
    super(message, HttpStatus.FORBIDDEN);
    this.name = 'AuthorizationError';
    this.errorCode = errorCode || 'FORBIDDEN';
  }
  errorCode: string;
}

export class ValidationErrorException extends HttpException {
  constructor(message: string, details?: ValidationError[]) {
    super(message, HttpStatus.BAD_REQUEST);
    this.name = 'ValidationError';
    this.details = details || [];
  }
  details: ValidationError[];
}

export class RateLimitError extends HttpException {
  constructor(message: string, retryAfter?: number) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
  retryAfter?: number;
}

export class ResourceNotFoundError extends HttpException {
  constructor(resource: string, identifier?: string) {
    super(`${resource} ${identifier ? `with identifier ${identifier}` : ''} not found`, HttpStatus.NOT_FOUND);
    this.name = 'ResourceNotFoundError';
    this.resource = resource;
    this.identifier = identifier;
  }
  resource: string;
  identifier?: string;
}

export class ConflictError extends HttpException {
  constructor(message: string, resource?: string, identifier?: string) {
    super(message, HttpStatus.CONFLICT);
    this.name = 'ConflictError';
    this.resource = resource;
    this.identifier = identifier;
  }
  resource?: string;
  identifier?: string;
}

@Injectable()
export class ErrorHandlerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ErrorHandlerMiddleware.name);

  constructor(private readonly eventPublisher: EventPublisherService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Add correlation ID to request
    req.correlationId = this.generateCorrelationId();
    
    // Override res.json to add correlation ID
    const originalJson = res.json;
    res.json = function(body) {
      if (body && typeof body === 'object') {
        body.correlationId = req.correlationId;
      }
      return originalJson.call(this, body);
    };

    next();
  }

  handleError(error: Error, req: Request, res: Response): void {
    const correlationId = req.correlationId || this.generateCorrelationId();
    const timestamp = new Date().toISOString();

    // Log the error
    this.logError(error, req, correlationId);

    // Publish error event
    this.publishErrorEvent(error, req, correlationId);

    // Format error response
    const errorResponse = this.formatErrorResponse(error, req, correlationId);

    // Send response
    res.status(errorResponse.statusCode).json(errorResponse);
  }

  private logError(error: Error, req: Request, correlationId: string): void {
    const logData = {
      correlationId,
      method: req.method,
      url: req.originalUrl,
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };

    if (error instanceof HttpException) {
      const status = error.getStatus();
      if (status >= 500) {
        this.logger.error('Server error', logData);
      } else if (status >= 400) {
        this.logger.warn('Client error', logData);
      } else {
        this.logger.log('HTTP exception', logData);
      }
    } else {
      this.logger.error('Unhandled error', logData);
    }
  }

  private publishErrorEvent(error: Error, req: Request, correlationId: string): void {
    const event = {
      eventType: 'error.occurred',
      tenantId: (req as any).user?.tenantId || 'system',
      userId: (req as any).user?.id,
      timestamp: new Date().toISOString(),
      data: {
        error: {
          name: error.name,
          message: error.message,
          statusCode: error instanceof HttpException ? error.getStatus() : 500,
          errorCode: (error as any).errorCode || 'UNKNOWN_ERROR',
        },
        request: {
          method: req.method,
          url: req.originalUrl,
          ip: this.getClientIP(req),
          userAgent: req.get('User-Agent'),
        },
        correlationId,
      },
      metadata: {
        ip: this.getClientIP(req),
        userAgent: req.get('User-Agent'),
      },
    };

    // Don't await to avoid blocking the response
    this.eventPublisher.publishAuthEvent(event).catch(err => {
      this.logger.error('Failed to publish error event', err);
    });
  }

  private formatErrorResponse(error: Error, req: Request, correlationId: string): ErrorResponse {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorName = 'Internal Server Error';
    let details: any;

    if (error instanceof HttpException) {
      statusCode = error.getStatus();
      const response = error.getResponse();
      
      if (typeof response === 'object' && response !== null) {
        message = (response as any).message || error.message;
        details = (response as any);
      } else {
        message = response as string;
      }
      
      errorName = error.constructor.name;
    } else if (error instanceof ValidationErrorException) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = error.message;
      errorName = 'Validation Error';
      details = error.details;
    } else if (error instanceof AuthenticationError) {
      statusCode = HttpStatus.UNAUTHORIZED;
      message = error.message;
      errorName = 'Authentication Error';
      details = { errorCode: error.errorCode };
    } else if (error instanceof AuthorizationError) {
      statusCode = HttpStatus.FORBIDDEN;
      message = error.message;
      errorName = 'Authorization Error';
      details = { errorCode: error.errorCode };
    } else if (error instanceof RateLimitError) {
      statusCode = HttpStatus.TOO_MANY_REQUESTS;
      message = error.message;
      errorName = 'Rate Limit Error';
      details = { retryAfter: error.retryAfter };
    } else if (error instanceof ResourceNotFoundError) {
      statusCode = HttpStatus.NOT_FOUND;
      message = error.message;
      errorName = 'Resource Not Found';
      details = { resource: error.resource, identifier: error.identifier };
    } else if (error instanceof ConflictError) {
      statusCode = HttpStatus.CONFLICT;
      message = error.message;
      errorName = 'Conflict Error';
      details = { resource: error.resource, identifier: error.identifier };
    }

    const response: ErrorResponse = {
      statusCode,
      message,
      error: errorName,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      correlationId,
    };

    if (details && Object.keys(details).length > 0) {
      response.details = details;
    }

    if (isDevelopment && error.stack) {
      response.stack = error.stack;
    }

    return response;
  }

  private generateCorrelationId(): string {
    const random1: string = Math.random().toString(36).substring(2, 15);
    const random2: string = Math.random().toString(36).substring(2, 15);
    const timestamp: string = Date.now().toString(36);
    return random1 + random2 + timestamp;
  }

  private getClientIP(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    const realIP = req.get('X-Real-IP');
    
    return forwarded ? forwarded.split(',')[0].trim() : 
           realIP || req.ip || 'unknown';
  }
}

// Global error handler for uncaught exceptions
@Injectable()
export class GlobalExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly errorHandler: ErrorHandlerMiddleware) {}

  catch(exception: Error, host: any): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    this.errorHandler.handleError(exception, request, response);
  }
}

// Async error handler wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Validation helper
export function validateRequest(schema: any, data: any): void {
  const { error } = schema.validate(data);
  if (error) {
    const details = error.details.map((detail: any) => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value,
    }));
    throw new ValidationErrorException('Validation failed', details);
  }
}

// Retry utility
export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Circuit breaker
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private successCount = 0;

  constructor(
    private readonly failureThreshold = 5,
    private readonly timeout = 60000, // 1 minute
    private readonly successThreshold = 3,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'closed';
        this.successCount = 0;
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }
}