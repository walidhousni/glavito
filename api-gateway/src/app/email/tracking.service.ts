import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

@Injectable()
export class EmailTrackingService {
  constructor(private readonly database: DatabaseService) {}

  async recordEvent(event: {
    tenantId: string;
    deliveryId: string;
    type: string;
    url?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.database.emailEvent.create({
      data: {
        tenantId: event.tenantId,
        deliveryId: event.deliveryId,
        type: event.type,
        url: event.url,
        ip: event.ip,
        userAgent: event.userAgent,
      },
    });
  }
}


