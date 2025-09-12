import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class MetricsService implements OnModuleInit {
  private static initialized = false;
  private readonly logger = new Logger(MetricsService.name);

  async onModuleInit() {
    if (MetricsService.initialized) return;
    try {
      const prom = await import('prom-client');
      prom.collectDefaultMetrics();
      MetricsService.initialized = true;
      this.logger.log('Prometheus default metrics initialized');
    } catch (err) {
      this.logger.warn(`Prometheus metrics initialization failed: ${(err as any)?.message}`);
    }
  }

  async getRegistry() {
    const prom = await import('prom-client');
    return prom.register;
  }
}


