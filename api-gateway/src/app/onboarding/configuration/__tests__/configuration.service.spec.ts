import { Test, TestingModule } from '@nestjs/testing';
import { ConfigurationService } from '../configuration.service';
import { DatabaseService } from '@glavito/shared-database';
import { BrandingConfig, WhatsAppConfig, InstagramConfig, EmailConfig } from '@glavito/shared-types';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let databaseService: jest.Mocked<DatabaseService>;

  const mockTenant = {
    id: 'tenant-1',
    brandingConfig: null,
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      tenant: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      integrationStatus: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigurationService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<ConfigurationService>(ConfigurationService);
    databaseService = module.get(DatabaseService);
  });

  describe('updateOrganizationBranding', () => {
    it('should update organization branding', async () => {
      const branding: BrandingConfig = {
        companyName: 'Test Company',
        primaryColor: '#3B82F6',
        secondaryColor: '#6B7280',
        accentColor: '#F59E0B',
        fontFamily: 'Inter, sans-serif',
      };

      databaseService.tenant.update.mockResolvedValue({} as any);

      await service.updateOrganizationBranding('tenant-1', branding);

      expect(databaseService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: {
          brandingConfig: branding,
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('uploadLogo', () => {
    const mockFile = {
      originalname: 'logo.png',
      mimetype: 'image/png',
      size: 1024 * 1024, // 1MB
      filename: 'logo.png',
    } as Express.Multer.File;

    beforeEach(() => {
      databaseService.tenant.findUnique.mockResolvedValue(mockTenant);
      databaseService.tenant.update.mockResolvedValue({} as any);
    });

    it('should upload logo successfully', async () => {
      const logoUrl = await service.uploadLogo('tenant-1', mockFile);

      expect(logoUrl).toContain('storage.glavito.com/logos/tenant-1/');
      expect(databaseService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: {
          brandingConfig: expect.objectContaining({
            logoUrl: expect.any(String),
          }),
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should reject invalid file types', async () => {
      const invalidFile = { ...mockFile, mimetype: 'text/plain' };

      await expect(service.uploadLogo('tenant-1', invalidFile)).rejects.toThrow(
        'Invalid file type'
      );
    });

    it('should reject files that are too large', async () => {
      const largeFile = { ...mockFile, size: 5 * 1024 * 1024 }; // 5MB

      await expect(service.uploadLogo('tenant-1', largeFile)).rejects.toThrow(
        'File size too large'
      );
    });
  });

  describe('setColorScheme', () => {
    it('should update color scheme', async () => {
      const colors = {
        primary: '#3B82F6',
        secondary: '#6B7280',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#000000',
      };

      databaseService.tenant.findUnique.mockResolvedValue(mockTenant);
      databaseService.tenant.update.mockResolvedValue({} as any);

      await service.setColorScheme('tenant-1', colors);

      expect(databaseService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: {
          brandingConfig: expect.objectContaining({
            primaryColor: colors.primary,
            secondaryColor: colors.secondary,
            accentColor: colors.accent,
          }),
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('configureWhatsApp', () => {
    const whatsappConfig: WhatsAppConfig = {
      businessAccountId: 'test-business-id',
      accessToken: 'test-access-token',
      phoneNumberId: 'test-phone-id',
      webhookVerifyToken: 'test-verify-token',
      enabled: true,
    };

    beforeEach(() => {
      databaseService.integrationStatus.upsert.mockResolvedValue({} as any);
    });

    it('should configure WhatsApp successfully', async () => {
      const result = await service.configureWhatsApp('tenant-1', whatsappConfig);

      expect(result.status).toBe('connected');
      expect(databaseService.integrationStatus.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_integrationType: {
            tenantId: 'tenant-1',
            integrationType: 'whatsapp',
          },
        },
        update: expect.objectContaining({
          status: 'connected',
          configuration: whatsappConfig,
        }),
        create: expect.objectContaining({
          tenantId: 'tenant-1',
          integrationType: 'whatsapp',
          status: 'connected',
          configuration: whatsappConfig,
        }),
      });
    });

    it('should handle missing required fields', async () => {
      const invalidConfig = { ...whatsappConfig, businessAccountId: '' };

      await expect(service.configureWhatsApp('tenant-1', invalidConfig)).rejects.toThrow(
        'Missing required WhatsApp configuration fields'
      );
    });

    it('should store error status on connection failure', async () => {
      // Mock connection test failure
      jest.spyOn(service as any, 'testWhatsAppConnection').mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      await expect(service.configureWhatsApp('tenant-1', whatsappConfig)).rejects.toThrow(
        'WhatsApp connection failed'
      );

      expect(databaseService.integrationStatus.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            status: 'error',
            errorMessage: expect.stringContaining('WhatsApp connection failed'),
          }),
        })
      );
    });
  });

  describe('configureInstagram', () => {
    const instagramConfig: InstagramConfig = {
      businessAccountId: 'test-business-id',
      accessToken: 'test-access-token',
      pageId: 'test-page-id',
      enabled: true,
    };

    beforeEach(() => {
      databaseService.integrationStatus.upsert.mockResolvedValue({} as any);
    });

    it('should configure Instagram successfully', async () => {
      const result = await service.configureInstagram('tenant-1', instagramConfig);

      expect(result.status).toBe('connected');
      expect(databaseService.integrationStatus.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_integrationType: {
            tenantId: 'tenant-1',
            integrationType: 'instagram',
          },
        },
        update: expect.objectContaining({
          status: 'connected',
          configuration: instagramConfig,
        }),
        create: expect.objectContaining({
          tenantId: 'tenant-1',
          integrationType: 'instagram',
          status: 'connected',
          configuration: instagramConfig,
        }),
      });
    });

    it('should handle missing required fields', async () => {
      const invalidConfig = { ...instagramConfig, pageId: '' };

      await expect(service.configureInstagram('tenant-1', invalidConfig)).rejects.toThrow(
        'Missing required Instagram configuration fields'
      );
    });
  });

  describe('configureEmail', () => {
    const emailConfig: EmailConfig = {
      provider: 'custom',
      enabled: true,
      imapConfig: {
        host: 'imap.example.com',
        port: 993,
        secure: true,
        username: 'test@example.com',
        password: 'password123',
      },
      smtpConfig: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        username: 'test@example.com',
        password: 'password123',
      },
    };

    beforeEach(() => {
      databaseService.integrationStatus.upsert.mockResolvedValue({} as any);
    });

    it('should configure email successfully', async () => {
      const result = await service.configureEmail('tenant-1', emailConfig);

      expect(result.status).toBe('connected');
      expect(databaseService.integrationStatus.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_integrationType: {
            tenantId: 'tenant-1',
            integrationType: 'email',
          },
        },
        update: expect.objectContaining({
          status: 'connected',
          configuration: expect.objectContaining({
            provider: 'custom',
            enabled: true,
            imapConfig: expect.objectContaining({
              password: '***ENCRYPTED***', // Should be sanitized
            }),
          }),
        }),
        create: expect.objectContaining({
          tenantId: 'tenant-1',
          integrationType: 'email',
          status: 'connected',
        }),
      });
    });

    it('should validate custom provider configuration', async () => {
      const invalidConfig = { ...emailConfig, imapConfig: undefined };

      await expect(service.configureEmail('tenant-1', invalidConfig)).rejects.toThrow(
        'IMAP and SMTP configuration required for custom provider'
      );
    });

    it('should validate email credentials', async () => {
      const invalidConfig = {
        ...emailConfig,
        imapConfig: { ...emailConfig.imapConfig, username: '', password: '' },
      };

      await expect(service.configureEmail('tenant-1', invalidConfig)).rejects.toThrow(
        'Email credentials are required'
      );
    });
  });

  describe('testChannelConnection', () => {
    it('should test channel connection', async () => {
      const result = await service.testChannelConnection('tenant-1', 'whatsapp');

      expect(result).toMatchObject({
        success: true,
        message: 'Connection test successful',
      });
    });
  });

  describe('enableAIFeatures', () => {
    it('should enable AI features', async () => {
      const aiFeatures = {
        ticketClassification: true,
        sentimentAnalysis: false,
        autoResponse: true,
        languageDetection: true,
        knowledgeBaseSuggestions: true,
        workflowAutomation: false,
        customModels: [],
      };

      databaseService.integrationStatus.upsert.mockResolvedValue({} as any);

      await service.enableAIFeatures('tenant-1', aiFeatures);

      expect(databaseService.integrationStatus.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_integrationType: {
            tenantId: 'tenant-1',
            integrationType: 'ai',
          },
        },
        update: expect.objectContaining({
          status: 'connected',
          configuration: aiFeatures,
        }),
        create: expect.objectContaining({
          tenantId: 'tenant-1',
          integrationType: 'ai',
          status: 'connected',
          configuration: aiFeatures,
        }),
      });
    });
  });

  describe('private methods', () => {
    describe('sanitizeEmailConfig', () => {
      it('should sanitize email configuration', () => {
        const config: EmailConfig = {
          provider: 'custom',
          enabled: true,
          imapConfig: {
            host: 'imap.example.com',
            port: 993,
            secure: true,
            username: 'test@example.com',
            password: 'secret-password',
          },
          smtpConfig: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            username: 'test@example.com',
            password: 'secret-password',
          },
        };

        const sanitized = (service as any).sanitizeEmailConfig(config);

        expect(sanitized.imapConfig.password).toBe('***ENCRYPTED***');
        expect(sanitized.smtpConfig.password).toBe('***ENCRYPTED***');
        expect(sanitized.imapConfig.username).toBe('test@example.com'); // Should not be sanitized
      });
    });
  });
});