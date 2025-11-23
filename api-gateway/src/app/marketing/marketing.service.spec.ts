import { Test, TestingModule } from '@nestjs/testing';
import { MarketingService } from './marketing.service';
import { EmailService } from '../email/email.service';
import { WhatsAppAdapter, SMSAdapter } from '@glavito/shared-conversation';
import { EventPublisherService } from '@glavito/shared-kafka';
import { DatabaseService } from '@glavito/shared-database';

describe('MarketingService', () => {
  let service: MarketingService;
  let dbMock: jest.Mocked<DatabaseService>;
  let emailMock: jest.Mocked<EmailService>;
  let whatsappMock: jest.Mocked<WhatsAppAdapter>;
  let smsMock: jest.Mocked<SMSAdapter>;
  let eventPublisherMock: jest.Mocked<EventPublisherService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketingService,
        { provide: DatabaseService, useValue: { campaignDelivery: { findMany: jest.fn(), update: jest.fn(), create: jest.fn() }, marketingCampaign: { findUnique: jest.fn() } } },
        { provide: EmailService, useValue: { sendTransactionalEmail: jest.fn() } },
        { provide: WhatsAppAdapter, useValue: { sendMessage: jest.fn() } },
        { provide: SMSAdapter, useValue: { sendMessage: jest.fn() } },
        { provide: EventPublisherService, useValue: { publish: jest.fn() } },
      ],
    }).compile();

    service = module.get<MarketingService>(MarketingService);
    dbMock = module.get(DatabaseService, { strict: false });
    emailMock = module.get(EmailService, { strict: false });
    whatsappMock = module.get(WhatsAppAdapter, { strict: false });
    smsMock = module.get(SMSAdapter, { strict: false });
    eventPublisherMock = module.get(EventPublisherService, { strict: false });
  });

  it('should create campaign', async () => {
    const payload = { name: 'Test', type: 'EMAIL' };
    dbMock.marketingCampaign.create.mockResolvedValue({ id: 'test-id' });
    await service.create('tenant', payload);
    expect(dbMock.marketingCampaign.create).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should process delivery EMAIL', async () => {
    const jobData = { deliveryId: 'd1', tenantId: 't1' };
    const delivery = { id: 'd1', channel: { type: 'EMAIL' }, customer: { email: 'test@test.com' }, campaignId: 'c1', variantId: null };
    dbMock.campaignDelivery.findUnique.mockResolvedValue(delivery);
    emailMock.sendTransactionalEmail.mockResolvedValue({ id: 'msg1' });
    dbMock.message.create.mockResolvedValue({ id: 'm1' });
    eventPublisherMock.publish.mockResolvedValue();

    await service.handleDelivery({ data: jobData } as any);

    expect(emailMock.sendTransactionalEmail).toHaveBeenCalled();
    expect(dbMock.campaignDelivery.update).toHaveBeenCalledWith({ where: { id: 'd1' }, data: { status: 'sent', messageId: 'msg1' } });
    expect(dbMock.message.create).toHaveBeenCalled();
    expect(eventPublisherMock.publish).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'marketing.delivery.sent' }));
  });

  // Similar tests for other channels, errors
});
