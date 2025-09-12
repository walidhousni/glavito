/**
 * Enhanced API Gateway with Swagger documentation and OpenTelemetry tracing
 * Production-ready NestJS application with comprehensive monitoring
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { ConfigService } from '@nestjs/config';
import { otelSDK } from './tracing/tracing.config';
import helmet from 'helmet';
import compression from 'compression';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  // Initialize OpenTelemetry (do not crash app if it fails)
  try {
    await otelSDK.start();
  } catch (err) {
    Logger.warn(`OpenTelemetry disabled: ${(err as Error)?.message || String(err)}`);
  }
  
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Security
  const nodeEnvCors = (configService.get<string>('NODE_ENV') || 'development').toLowerCase();
  app.use(helmet({
    contentSecurityPolicy: nodeEnvCors === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());
  
  // Global prefix
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  
  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );
  
  // Global interceptors
  app.useGlobalInterceptors(
    new RequestLoggingInterceptor(),
    new TransformInterceptor()
  );
  
  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // CORS configuration
  const rawOrigins = configService.get<string>('CORS_ORIGIN') || '';
  const defaultOrigins = ['http://localhost:3000', 'http://localhost:4200'];
  const origins = rawOrigins
    ? rawOrigins.split(',').map((s) => s.trim()).filter(Boolean)
    : defaultOrigins;
  // reuse nodeEnvCors

  const corsOrigin = nodeEnvCors !== 'production'
    ? true // reflect request origin automatically in dev
    : (
        requestOrigin: string | undefined,
        callback: (err: Error | null, allowed?: boolean) => void,
      ) => {
        if (!requestOrigin) return callback(null, true);
        const allowed = origins.includes(requestOrigin);
        return callback(allowed ? null : new Error('CORS not allowed'), allowed);
      };

  app.enableCors({
    origin: corsOrigin as any,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-tenant-host', 'X-Tenant-Host', 'X-Correlation-Id'],
    optionsSuccessStatus: 204,
  });
  
  // Swagger configuration
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Glavito API Gateway')
      .setDescription('Comprehensive API documentation for the Glavito multi-tenant customer service platform')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addOAuth2()
      .addApiKey({ type: 'apiKey', name: 'X-API-KEY', in: 'header' }, 'X-API-KEY')
      .addServer('http://localhost:3001', 'Local Development')
      .addServer('https://api.glavito.com', 'Production')
      .addTag('auth', 'Authentication & Authorization')
      .addTag('onboarding', 'User Onboarding & Setup')
      .addTag('users', 'User Management')
      .addTag('tenants', 'Tenant Management')
      .addTag('tickets', 'Support Tickets')
      .addTag('customers', 'Customer Management')
      .addTag('channels', 'Communication Channels')
      .addTag('conversations', 'Chat Conversations')
      .addTag('messages', 'Message Management')
      .addTag('files', 'File Management')
      .addTag('webhooks', 'Webhook Endpoints')
      .addTag('health', 'Health Check')
      .build();
    
    const document = SwaggerModule.createDocument(app, config, {
      deepScanRoutes: true,
      extraModels: [],
    });
    
    SwaggerModule.setup('docs', app, document, {
      customSiteTitle: 'Glavito API Documentation',
      customfavIcon: 'https://glavito.com/favicon.ico',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
        // Inject white-label branding shim for the docs UI
        '/api/white-label/docs/branding.js',
      ],
      customCssUrl: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.css',
      ],
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
        showRequestDuration: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
  }
  
  const port = parseInt(configService.get('API_PORT') || configService.get('PORT') || '3001', 10);
  try {
    await app.listen(port);
  } catch (err) {
    const message = (err as any)?.message || String(err);
    Logger.error(`Failed to start server on port ${port}: ${message}`);
    throw err;
  }
  
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
  
  if (configService.get('NODE_ENV') !== 'production') {
    Logger.log(
      `📚 Swagger documentation available at: http://localhost:${port}/docs`
    );
  }
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    Logger.log('SIGTERM received, shutting down gracefully');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
