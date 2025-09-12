import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@glavito/shared-database';

@ApiTags('webhooks-whatsapp')
@Controller('webhooks/whatsapp/status')
export class WhatsAppWebhookStatusController {
  private readonly logger = new Logger(WhatsAppWebhookStatusController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle WhatsApp delivery/read status callbacks' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status processed' })
  async handleStatus(
    @Body() body: unknown,
    @Headers() _headers: Record<string, string>
  ) {
    try {
      type StatusPayload = { entry?: Array<{ changes?: Array<{ value?: { statuses?: Array<{ id: string; status: string; timestamp?: string }>, messages?: Array<{ id: string }> } }> }> };
      const data = body as StatusPayload;
      const change = data.entry?.[0]?.changes?.[0];
      const status = change?.value?.statuses?.[0];
      if (!status?.id || !status.status) {
        return { success: true }; // nothing to do
      }

      // Update message metadata by channelMessageId
      await this.prisma['messageAdvanced']?.updateMany?.({
        where: { channelMessageId: status.id },
        data: {
          metadata: {
            ...(null as any),
            deliveryStatus: status.status,
            deliveryTimestamp: status.timestamp ? new Date(parseInt(status.timestamp, 10) * 1000) : new Date()
          } as any
        }
      }).catch(async () => {
        // fallback to base messages table
        const msg = await this.prisma['message'].findFirst({
          where: { metadata: { path: ['channelMessageId'], equals: status.id } } as any
        });
        if (msg) {
          await this.prisma['message'].update({
            where: { id: (msg as any).id },
            data: {
              metadata: {
                ...(msg as any).metadata,
                deliveryStatus: status.status,
                deliveryTimestamp: status.timestamp ? new Date(parseInt(status.timestamp, 10) * 1000) : new Date()
              } as any
            }
          });
        }
      });

      return { success: true };
    } catch (err) {
      this.logger.error('Failed to process WhatsApp status callback', err as Error);
      return { success: false };
    }
  }
}


