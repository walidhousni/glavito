import { Controller, Post, Body, Headers, UseGuards, Get, Delete, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WebhooksService } from './webhooks.service';
import { CurrentUser } from '@glavito/shared-auth';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('incoming')
  handleIncomingWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    return this.webhooksService.handleIncomingWebhook(payload, headers);
  }

  // Provider-specific inbound endpoints (bidirectional sync stubs)
  @Post('inbound/salesforce')
  handleSalesforceInbound(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    return this.webhooksService.handleInbound('salesforce', payload, headers);
  }

  @Post('inbound/hubspot')
  handleHubspotInbound(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
  ) {
    return this.webhooksService.handleInbound('hubspot', payload, headers);
  }

  @Post('outgoing')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  sendOutgoingWebhook(@Body() payload: any) {
    // For testing manual dispatch: expects an EventPayload-like body
    return this.webhooksService.sendOutgoingWebhook(payload);
  }

  // Admin endpoints
  @Post('endpoints')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  createEndpoint(
    @CurrentUser() user: any,
    @Body() body: { name: string; url: string; events: string[]; secret?: string; headers?: Record<string, string>; retryPolicy?: any },
  ) {
    return this.webhooksService.registerEndpoint({
      tenantId: user.tenantId,
      name: body.name,
      url: body.url,
      events: body.events,
      secret: body.secret,
      headers: body.headers,
      retryPolicy: body.retryPolicy,
    });
  }

  @Get('endpoints')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listEndpoints(@CurrentUser() user: any) {
    return this.webhooksService.listEndpoints(user.tenantId);
  }

  @Delete('endpoints/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  deleteEndpoint(@CurrentUser() user: any, @Param('id') id: string) {
    return this.webhooksService.deleteEndpoint(user.tenantId, id);
  }

  @Get('endpoints/:id/deliveries')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listEndpointDeliveries(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? parseInt(limit, 10) : 50;
    return this.webhooksService.listDeliveries(user.tenantId, id, take);
  }
}