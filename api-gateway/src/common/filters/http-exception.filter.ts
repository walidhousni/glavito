import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  method: string;
  requestId: string;
  validationErrors?: any[];
  stack?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let validationErrors: any[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
        validationErrors = (exceptionResponse as any).message || [];
      } else {
        message = exceptionResponse as string;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      method: request.method,
      requestId: response.getHeader('X-Request-ID') as string || 'unknown',
      ...(Array.isArray(validationErrors) && validationErrors.length > 0 && { validationErrors }),
      ...(process.env.NODE_ENV !== 'production' && { stack: (exception as Error).stack }),
    };

    // Log the error
    this.logger.error({
      message: 'HTTP Exception caught',
      status,
      error: errorResponse,
      exception: exception instanceof Error ? {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      } : exception,
      request: {
        method: request.method,
        url: request.originalUrl,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        userId: (request as any).user?.id || 'anonymous',
      },
    });

    response.status(status).json(errorResponse);
  }
}