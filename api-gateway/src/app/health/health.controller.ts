import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckResult,
  HealthIndicatorResult,
  HealthIndicatorStatus,
} from '@nestjs/terminus';
import { DatabaseService } from '@glavito/shared-database';
import { RedisService } from '@glavito/shared-redis';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly databaseService: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  @Get('summary')
  async summary() {
    const db = await this.databaseService.healthCheck();
    const redisOk = await this.redis.healthCheck();
    const redisStats = await this.redis.getStats().catch(() => null);

    return {
      status: 'ok',
      db,
      redis: {
        ok: redisOk,
        stats: redisStats,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Health check successful' })
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        const result = await this.databaseService.healthCheck();
        const status: HealthIndicatorStatus = result.status === 'ok' ? 'up' : 'down';
        const payload = { database: { status } };
        if (status === 'up') {
          return payload;
        }
        throw new Error('Database is not healthy');
      },
    ]);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async ready() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Prometheus metrics' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics' })
  async metrics(@Res() res: any) {
    const prom = await import('prom-client');
    res.setHeader('Content-Type', prom.register.contentType);
    res.send(await prom.register.metrics());
  }
}