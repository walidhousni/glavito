import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { EmailService } from './email.service';
import type { EmailSendRequest } from './types';
import { Response } from 'express';
import { EmailTrackingService } from './tracking.service';
import { DatabaseService } from '@glavito/shared-database';
import { EmailProviderFactory } from './provider.factory';

@Controller('email')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly tracking: EmailTrackingService,
    private readonly database: DatabaseService,
    private readonly factory: EmailProviderFactory,
  ) {}

  @Post('send')
  async send(@Body() body: EmailSendRequest) {
    const result = await this.emailService.send(body);
    return { success: true, ...result };
  }

  // Provider webhooks
  @Post('webhooks/sendgrid')
  async sendgridWebhook(@Body() payload: unknown, @Query('tenantId') tenantId?: string) {
    const adapter = await this.factory.getAdapterForTenant(String(tenantId || ''));
    let events: any[] = [];
    try {
      events = adapter.parseWebhook(payload, {});
    } catch {
      // ignore for now
    }
    for (const e of events) {
      if (!e?.messageId || !tenantId) continue;
      await this.tracking.recordEvent({
        tenantId,
        deliveryId: String(e.messageId),
        type: e.type,
        url: e.url,
        ip: e.ip,
        userAgent: e.userAgent,
      });
    }
    return { success: true };
  }

  @Post('webhooks/ses')
  async sesWebhook(@Body() _payload: unknown) {
    // Placeholder; handled via SNS subscription in production
    return { success: true };
  }

  @Post('webhooks/aliyun')
  async aliyunWebhook(@Body() _payload: unknown) {
    return { success: true };
  }

  // 1x1 transparent pixel
  @Get('open.gif')
  async openPixel(@Query('m') messageId: string, @Query('t') tenantId: string, @Res() res: Response) {
    if (messageId && tenantId) {
      await this.tracking.recordEvent({
        tenantId,
        deliveryId: messageId,
        type: 'open',
      });
      // increment open count
      try {
        await this.database.emailDelivery.update({
          where: { id: messageId },
          data: { openCount: { increment: 1 }, openedAt: new Date() } as any,
        });
      } catch {
        // ignore
      }
    }
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=',
      'base64',
    ); // 1x1 gif
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(pixel);
  }

  // Click redirect: /email/c/:token where token encodes { m, t, u }
  @Get('c/:token')
  async clickRedirect(@Param('token') token: string, @Res() res: Response) {
    let data: { m?: string; t?: string; u?: string } = {};
    try {
      data = JSON.parse(Buffer.from(token, 'base64').toString('utf-8')) as any;
    } catch {
      // ignore
    }
    const m = data.m;
    const t = data.t;
    const u = data.u;
    if (m && t) {
      await this.tracking.recordEvent({
        tenantId: t,
        deliveryId: m,
        type: 'click',
        url: u,
      });
      try {
        await this.database.emailDelivery.update({
          where: { id: m },
          data: { clickCount: { increment: 1 } } as any,
        });
      } catch {
        // ignore
      }
    }
    res.redirect(u || '/');
  }

  // Unsubscribe endpoint: /email/u/:token (encodes { m, t })
  @Get('u/:token')
  async unsubscribe(@Param('token') token: string, @Res() res: Response) {
    let data: { m?: string; t?: string } = {};
    try {
      data = JSON.parse(Buffer.from(token, 'base64').toString('utf-8')) as any;
    } catch {
      // ignore
    }
    const m = data.m;
    const t = data.t;
    if (m && t) {
      const delivery = await this.database.emailDelivery.findFirst({ where: { id: m, tenantId: t } });
      if (delivery) {
        await this.database.emailSuppression.upsert({
          where: { tenantId_email: { tenantId: t, email: (delivery as any).to } },
          create: { tenantId: t, email: (delivery as any).to, reason: 'unsubscribe' },
          update: { reason: 'unsubscribe' },
        });
      }
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send('<html><body><p>You have been unsubscribed.</p></body></html>');
  }
}


