import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeController } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { createSpan } from '../tracing/tracing.config';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Health check',
    description: 'Check the health of the API gateway and its dependencies',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check successful',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: { type: 'object' },
            memory: { type: 'object' },
            disk: { type: 'object' },
          },
        },
        error: { type: 'object' },
        details: {
          type: 'object',
          properties: {
            database: { type: 'object' },
            memory: { type: 'object' },
            disk: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable',
  })
  async check(): Promise<any> {
    const span = createSpan('health.check');
    
    try {
      const result = await this.health.check([
        // Database health is covered by app-side controller
        () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024), // 150MB
        () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024), // 150MB
        () => this.disk.checkStorage('disk', { path: '/', threshold: 0.9 }),
        () => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com'),
      ]);

      this.logger.log('Health check completed successfully');
      span.setAttributes({
        'health.status': 'ok',
        'health.timestamp': new Date().toISOString(),
      });

      return result;
    } catch (error) {
      this.logger.error('Health check failed', error);
      span.setAttributes({
        'health.status': 'error',
        'health.error': error.message,
      });
      throw error;
    } finally {
      span.end();
    }
  }

  @Get('ready')
  @HealthCheck()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Check if the service is ready to accept traffic',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
  })
  async readiness(): Promise<any> {
    const span = createSpan('health.readiness');
    
    try {
      const result = await this.health.check([
        () => this.prismaHealth.pingCheck('database'),
      ]);

      this.logger.log('Readiness check completed');
      span.setAttributes({
        'health.type': 'readiness',
        'health.status': 'ready',
      });

      return result;
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      span.setAttributes({
        'health.type': 'readiness',
        'health.status': 'not_ready',
      });
      throw error;
    } finally {
      span.end();
    }
  }

  @Get('live')
  @HealthCheck()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Check if the service is alive',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
  })
  async liveness(): Promise<any> {
    const span = createSpan('health.liveness');
    
    try {
      const result = await this.health.check([
        () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024), // 200MB
      ]);

      this.logger.log('Liveness check completed');
      span.setAttributes({
        'health.type': 'liveness',
        'health.status': 'alive',
      });

      return result;
    } catch (error) {
      this.logger.error('Liveness check failed', error);
      span.setAttributes({
        'health.type': 'liveness',
        'health.status': 'not_alive',
      });
      throw error;
    } finally {
      span.end();
    }
  }

  @Get('metrics')
  @ApiExcludeController()
  async metrics() {
    // Serve Prometheus metrics collected via prom-client
    const prom = await import('prom-client');
    const register = prom.register;
    return {
      // Returning raw string is preferred when using Express res, but keep JSON fallback if caller expects JSON
      // Consumers (Prometheus) should scrape '/metrics' from app-level controller when available
      contentType: register.contentType,
      metrics: await register.metrics(),
    };
  }
}