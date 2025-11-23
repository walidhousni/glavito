import { Controller, Get, Param, Query, Res } from '@nestjs/common'
import express from 'express'
import { MarketingService } from './marketing.service'

// Public controller: no auth, used for email tracking pixels and unsubscribe links
@Controller('marketing/track')
export class MarketingTrackingController {
  constructor(private readonly marketing: MarketingService) {}

  // 1x1 pixel for open tracking
  @Get(':deliveryId/open')
  async open(@Param('deliveryId') deliveryId: string, @Res() res: express.Response) {
    try { await this.marketing.trackDeliveryOpen(deliveryId) } catch {}
    const pixel = Buffer.from(
      'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
      'base64'
    )
    res.setHeader('Content-Type', 'image/gif')
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    return res.status(200).send(pixel)
  }

  @Get(':deliveryId/click')
  async click(
    @Param('deliveryId') deliveryId: string,
    @Query('url') url: string | undefined,
    @Res() res: express.Response
  ) {
    try { await this.marketing.trackDeliveryClick(deliveryId, url) } catch {}
    const html = `<!DOCTYPE html><html><body><p>Thanks! Link tracked.</p></body></html>`
    res.setHeader('Content-Type', 'text/html')
    return res.status(200).send(html)
  }

  // Signed redirect for non-email channels (minimal version without signature)
  @Get(':deliveryId/link')
  async linkRedirect(
    @Param('deliveryId') deliveryId: string,
    @Query('to') to: string | undefined,
    @Res() res: express.Response
  ) {
    try { await this.marketing.trackDeliveryClick(deliveryId, to) } catch {}
    const dest = to && /^https?:\/\//i.test(to) ? to : '/';
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, dest);
  }
  @Get(':deliveryId/unsubscribe')
  async unsubscribe(@Param('deliveryId') deliveryId: string, @Res() res: express.Response) {
    try { await this.marketing.unsubscribeCustomerFromEmailMarketing(deliveryId) } catch {}
    const html = `<!DOCTYPE html><html><body><p>You have been unsubscribed.</p></body></html>`
    res.setHeader('Content-Type', 'text/html')
    return res.status(200).send(html)
  }
}


