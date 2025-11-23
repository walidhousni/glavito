import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { WhiteLabelService } from './white-label.service';

@Controller('white-label/t')
export class WhiteLabelTrackingController {
  constructor(private readonly wl: WhiteLabelService) {}

  // 1x1 transparent GIF
  @Get('open')
  async trackOpen(
    @Query('d') deliveryId: string,
    @Query('t') tenantId?: string,
    @Req() req?: any,
    @Res() res?: any,
  ) {
    try {
      await this.wl.recordEmailOpen(String(tenantId || ''), String(deliveryId || ''), {
        ip: req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || '',
        userAgent: req?.headers?.['user-agent'] || '',
      });
    } catch (_) {
      // ignore errors for tracking endpoint
    }
    const gif = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.end(gif);
  }

  @Get('click')
  async trackClick(
    @Query('d') deliveryId: string,
    @Query('u') urlEncoded: string,
    @Query('t') tenantId?: string,
    @Req() req?: any,
    @Res() res?: any,
  ) {
    const url = (() => {
      try { return decodeURIComponent(String(urlEncoded || '')); } catch { return String(urlEncoded || ''); }
    })();
    try {
      await this.wl.recordEmailClick(String(tenantId || ''), String(deliveryId || ''), url, {
        ip: req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || '',
        userAgent: req?.headers?.['user-agent'] || '',
      });
    } catch (_) {
      // ignore errors and still redirect
    }
    // Validate redirect URL, fallback to '/'
    let safeUrl = '/';
    try { safeUrl = this.wl.validateRedirectUrl(url); } catch { safeUrl = '/'; }
    res.status(302);
    res.setHeader('Location', safeUrl);
    return res.end();
  }
}


