/**
 * Unit tests for StripeService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@glavito/shared-database';
import { StripeService, StripeAccountSetupRequest, PaymentIntentRequest, BillingConfigurationRequest } from '../stripe.service';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    accounts: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    accountLinks: {
      create: jest.fn(),
    },
    paymentIntents: {
      create: jest.fn(),
    },
    customers: {
      create: jest.fn(),
    },
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
    invoiceItems: {
      create: jest.fn(),
    },
    invoices: {
      create: jest.fn(),
      finalizeInvoice: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

describe('StripeService', () => {
  let service: StripeService;
  let databaseService: jest.Mocked<DatabaseService>;
  let configService: jest.Mocked<ConfigService>;

  const mockTenantId = 'tenant-123';
  const mockStripeAccountId = 'acct_123';
  const mockCustomerId = 'customer-123';

  beforeEach(async () => {
    const mockDatabaseService = {
      stripeAccount: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      paymentIntent: {
        create: jest.fn(),
        update: jest.fn(),
      },
      billingConfiguration: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
    databaseService = module.get(DatabaseService);
    configService = module.get(ConfigService);

    // Mock config values
    configService.get.mockImplementation((key: string) => {
      switch (key) {
        case 'STRIPE_SECRET_KEY':
          return 'sk_test_123';
        case 'STRIPE_WEBHOOK_SECRET':
          return 'whsec_123';
        case 'APP_URL':
          return 'https://app.example.com';
        default:
          return undefined;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createStripeAccount', () => {
    const mockAccountRequest: StripeAccountSetupRequest = {
      email: 'test@example.com',
      country: 'US',
      businessType: 'company',
      businessProfile: {
        name: 'Test Company',
        url: 'https://test.com',
      },
    };

    it('should successfully create a Stripe account', async () => {
      // Mock no existing account
      databaseService.stripeAccount.findUnique.mockResolvedValue(null);

      // Mock Stripe account creation
      const mockStripeAccount = {
        id: mockStripeAccountId,
        email: mockAccountRequest.email,
        country: mockAccountRequest.country,
        default_currency: 'usd',
        business_type: mockAccountRequest.businessType,
        details_submitted: false,
        payouts_enabled: false,
        charges_enabled: false,
        requirements: {
          currently_due: ['business_profile.url'],
          eventually_due: [],
          past_due: [],
          pending_verification: [],
        },
        capabilities: {
          card_payments: 'active',
          transfers: 'pending',
        },
        settings: {},
      };

      (service as any).stripe.accounts.create.mockResolvedValue(mockStripeAccount);

      // Mock database creation
      const mockDbAccount = {
        id: 'db-account-123',
        tenantId: mockTenantId,
        stripeAccountId: mockStripeAccountId,
        email: mockAccountRequest.email,
        country: mockAccountRequest.country,
        defaultCurrency: 'usd',
        businessType: mockAccountRequest.businessType,
        businessProfile: mockAccountRequest.businessProfile,
        detailsSubmitted: false,
        payoutsEnabled: false,
        chargesEnabled: false,
        requirements: mockStripeAccount.requirements,
        capabilities: mockStripeAccount.capabilities,
        settings: mockStripeAccount.settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      databaseService.stripeAccount.create.mockResolvedValue(mockDbAccount as any);

      const result = await service.createStripeAccount(mockTenantId, mockAccountRequest);

      expect(result).toEqual({
        id: mockStripeAccountId,
        email: mockAccountRequest.email,
        country: mockAccountRequest.country,
        defaultCurrency: 'usd',
        businessType: mockAccountRequest.businessType,
        detailsSubmitted: false,
        payoutsEnabled: false,
        chargesEnabled: false,
        requirements: {
          currentlyDue: ['business_profile.url'],
          eventuallyDue: [],
          pastDue: [],
          pendingVerification: [],
        },
        capabilities: {
          card_payments: 'active',
          transfers: 'pending',
        },
      });

      expect(databaseService.stripeAccount.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          stripeAccountId: mockStripeAccountId,
          email: mockAccountRequest.email,
          country: mockAccountRequest.country,
          businessType: mockAccountRequest.businessType,
        }),
      });
    });

    it('should throw BadRequestException if account already exists', async () => {
      databaseService.stripeAccount.findUnique.mockResolvedValue({
        id: 'existing-account',
        tenantId: mockTenantId,
      } as any);

      await expect(
        service.createStripeAccount(mockTenantId, mockAccountRequest)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle Stripe API errors', async () => {
      databaseService.stripeAccount.findUnique.mockResolvedValue(null);
      (service as any).stripe.accounts.create.mockRejectedValue(new Error('Stripe API error'));

      await expect(
        service.createStripeAccount(mockTenantId, mockAccountRequest)
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('createAccountLink', () => {
    it('should successfully create an account link', async () => {
      const mockDbAccount = {
        id: 'db-account-123',
        stripeAccountId: mockStripeAccountId,
      };

      databaseService.stripeAccount.findUnique.mockResolvedValue(mockDbAccount as any);

      const mockAccountLink = {
        url: 'https://connect.stripe.com/setup/123',
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      (service as any).stripe.accountLinks.create.mockResolvedValue(mockAccountLink);

      const result = await service.createAccountLink(mockTenantId);

      expect(result).toEqual({
        url: mockAccountLink.url,
        expiresAt: new Date(mockAccountLink.expires_at * 1000),
      });

      expect((service as any).stripe.accountLinks.create).toHaveBeenCalledWith({
        account: mockStripeAccountId,
        refresh_url: expect.stringContaining('/onboarding/payment-setup?refresh=true'),
        return_url: expect.stringContaining('/onboarding/payment-setup?success=true'),
        type: 'account_onboarding',
      });
    });

    it('should throw BadRequestException if account not found', async () => {
      databaseService.stripeAccount.findUnique.mockResolvedValue(null);

      await expect(
        service.createAccountLink(mockTenantId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createPaymentIntent', () => {
    const mockPaymentRequest: PaymentIntentRequest = {
      amount: 2000, // $20.00
      currency: 'usd',
      description: 'Test payment',
      receiptEmail: 'customer@example.com',
    };

    it('should successfully create a payment intent', async () => {
      const mockDbAccount = {
        id: 'db-account-123',
        stripeAccountId: mockStripeAccountId,
        chargesEnabled: true,
      };

      databaseService.stripeAccount.findUnique.mockResolvedValue(mockDbAccount as any);

      const mockPaymentIntent = {
        id: 'pi_123',
        amount: mockPaymentRequest.amount,
        currency: mockPaymentRequest.currency,
        status: 'requires_payment_method',
        client_secret: 'pi_123_secret_456',
      };

      (service as any).stripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const mockDbPaymentIntent = {
        id: 'db-pi-123',
        tenantId: mockTenantId,
        stripeAccountId: mockDbAccount.id,
        stripePaymentId: mockPaymentIntent.id,
        amount: mockPaymentRequest.amount,
        currency: mockPaymentRequest.currency,
        status: mockPaymentIntent.status,
        clientSecret: mockPaymentIntent.client_secret,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      databaseService.paymentIntent.create.mockResolvedValue(mockDbPaymentIntent as any);

      const result = await service.createPaymentIntent(mockTenantId, mockPaymentRequest);

      expect(result).toEqual({
        clientSecret: mockPaymentIntent.client_secret,
        paymentIntentId: mockDbPaymentIntent.id,
      });

      expect((service as any).stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: mockPaymentRequest.amount,
          currency: mockPaymentRequest.currency,
          description: mockPaymentRequest.description,
          receipt_email: mockPaymentRequest.receiptEmail,
          application_fee_amount: Math.floor(mockPaymentRequest.amount * 0.029),
        }),
        {
          stripeAccount: mockStripeAccountId,
        }
      );
    });

    it('should throw BadRequestException if charges not enabled', async () => {
      const mockDbAccount = {
        id: 'db-account-123',
        stripeAccountId: mockStripeAccountId,
        chargesEnabled: false,
      };

      databaseService.stripeAccount.findUnique.mockResolvedValue(mockDbAccount as any);

      await expect(
        service.createPaymentIntent(mockTenantId, mockPaymentRequest)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('setupBillingConfiguration', () => {
    const mockBillingRequest: BillingConfigurationRequest = {
      currency: 'usd',
      taxRate: 0.08,
      invoicePrefix: 'INV',
      paymentTerms: 30,
      autoCharge: true,
      reminderDays: [7, 3, 1],
    };

    it('should successfully setup billing configuration', async () => {
      databaseService.billingConfiguration.upsert.mockResolvedValue({
        id: 'billing-123',
        tenantId: mockTenantId,
        ...mockBillingRequest,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await service.setupBillingConfiguration(mockTenantId, mockBillingRequest);

      expect(databaseService.billingConfiguration.upsert).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        create: expect.objectContaining({
          tenantId: mockTenantId,
          currency: mockBillingRequest.currency,
          taxRate: mockBillingRequest.taxRate,
          invoicePrefix: mockBillingRequest.invoicePrefix,
          paymentTerms: mockBillingRequest.paymentTerms,
          autoCharge: mockBillingRequest.autoCharge,
          reminderDays: mockBillingRequest.reminderDays,
        }),
        update: expect.objectContaining({
          currency: mockBillingRequest.currency,
          taxRate: mockBillingRequest.taxRate,
          invoicePrefix: mockBillingRequest.invoicePrefix,
          paymentTerms: mockBillingRequest.paymentTerms,
          autoCharge: mockBillingRequest.autoCharge,
          reminderDays: mockBillingRequest.reminderDays,
        }),
      });
    });

    it('should handle database errors', async () => {
      databaseService.billingConfiguration.upsert.mockRejectedValue(new Error('Database error'));

      await expect(
        service.setupBillingConfiguration(mockTenantId, mockBillingRequest)
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment status for configured account', async () => {
      const mockDbAccount = {
        id: 'db-account-123',
        stripeAccountId: mockStripeAccountId,
        detailsSubmitted: true,
        payoutsEnabled: true,
        chargesEnabled: true,
      };

      databaseService.stripeAccount.findUnique.mockResolvedValue(mockDbAccount as any);

      const mockStripeAccount = {
        id: mockStripeAccountId,
        details_submitted: true,
        payouts_enabled: true,
        charges_enabled: true,
        requirements: {
          currently_due: [],
          past_due: [],
        },
      };

      (service as any).stripe.accounts.retrieve.mockResolvedValue(mockStripeAccount);

      const result = await service.getPaymentStatus(mockTenantId);

      expect(result).toEqual({
        isConfigured: true,
        accountId: mockStripeAccountId,
        payoutsEnabled: true,
        chargesEnabled: true,
        detailsSubmitted: true,
        requirements: [],
      });
    });

    it('should return unconfigured status when no account exists', async () => {
      databaseService.stripeAccount.findUnique.mockResolvedValue(null);

      const result = await service.getPaymentStatus(mockTenantId);

      expect(result).toEqual({
        isConfigured: false,
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        requirements: [],
      });
    });

    it('should handle Stripe API errors gracefully', async () => {
      const mockDbAccount = {
        id: 'db-account-123',
        stripeAccountId: mockStripeAccountId,
      };

      databaseService.stripeAccount.findUnique.mockResolvedValue(mockDbAccount as any);
      (service as any).stripe.accounts.retrieve.mockRejectedValue(new Error('Stripe API error'));

      const result = await service.getPaymentStatus(mockTenantId);

      expect(result).toEqual({
        isConfigured: false,
        payoutsEnabled: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        requirements: [],
        errorMessage: 'Stripe API error',
      });
    });
  });

  describe('generateInvoice', () => {
    const mockInvoiceItems = [
      {
        description: 'Service fee',
        amount: 5000, // $50.00
        quantity: 1,
      },
      {
        description: 'Additional service',
        amount: 2500, // $25.00
        quantity: 2,
      },
    ];

    it('should successfully generate an invoice', async () => {
      const mockDbAccount = {
        id: 'db-account-123',
        stripeAccountId: mockStripeAccountId,
      };

      const mockCustomer = {
        id: mockCustomerId,
        email: 'customer@example.com',
        firstName: 'John',
        lastName: 'Doe',
        customFields: {},
      };

      databaseService.stripeAccount.findUnique.mockResolvedValue(mockDbAccount as any);
      databaseService.customer.findUnique.mockResolvedValue(mockCustomer as any);

      const mockStripeCustomer = {
        id: 'cus_123',
        email: mockCustomer.email,
      };

      (service as any).stripe.customers.create.mockResolvedValue(mockStripeCustomer);

      const mockInvoice = {
        id: 'in_123',
        hosted_invoice_url: 'https://invoice.stripe.com/i/123',
      };

      (service as any).stripe.invoiceItems.create.mockResolvedValue({});
      (service as any).stripe.invoices.create.mockResolvedValue({ id: 'in_123' });
      (service as any).stripe.invoices.finalizeInvoice.mockResolvedValue(mockInvoice);

      databaseService.customer.update.mockResolvedValue({} as any);

      const result = await service.generateInvoice(mockTenantId, mockCustomerId, mockInvoiceItems);

      expect(result).toEqual({
        invoiceId: mockInvoice.id,
        hostedInvoiceUrl: mockInvoice.hosted_invoice_url,
      });

      expect((service as any).stripe.invoiceItems.create).toHaveBeenCalledTimes(2);
      expect((service as any).stripe.invoices.create).toHaveBeenCalledWith(
        {
          customer: mockStripeCustomer.id,
          auto_advance: true,
        },
        {
          stripeAccount: mockStripeAccountId,
        }
      );
    });

    it('should throw BadRequestException if customer not found', async () => {
      const mockDbAccount = {
        id: 'db-account-123',
        stripeAccountId: mockStripeAccountId,
      };

      databaseService.stripeAccount.findUnique.mockResolvedValue(mockDbAccount as any);
      databaseService.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.generateInvoice(mockTenantId, mockCustomerId, mockInvoiceItems)
      ).rejects.toThrow(BadRequestException);
    });
  });
});