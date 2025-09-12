/**
 * Configuration Controller Tests
 * Unit tests for configuration API endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigurationController } from '../configuration.controller';
import { ConfigurationService } from '../configuration.service';

describe('ConfigurationController', () => {
  let controller: ConfigurationController;
  let configurationService: jest.Mocked<ConfigurationService>;

  const mockRequest = {
    user: {
      tenantId: 'tenant-123',
      userId: 'user-123',
    },
  };

  beforeEach(async () => {
    const mockConfigurationService = {
      getOrganizationConfig: jest.fn(),
      updateOrganizationConfig: jest.fn(),
      uploadLogo: jest.fn(),
      getBrandingConfig: jest.fn(),
      updateBrandingConfig: jest.fn(),
      generateBrandingPreview: jest.fn(),
      getCustomFields: jest.fn(),
      createCustomField: jest.fn(),
      updateCustomField: jest.fn(),
      deleteCustomField: jest.fn(),
      validateConfiguration: jest.fn(),
      exportConfiguration: jest.fn(),
      importConfiguration: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigurationController],
      providers: [
        { provide: ConfigurationService, useValue: mockConfigurationService },
      ],
    }).compile();

    controller = module.get<ConfigurationController>(ConfigurationController);
    configurationService = module.get(ConfigurationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrganizationConfig', () => {
    it('should get organization configuration', async () => {
      const mockConfig = {
        name: 'Test Organization',
        website: 'https://test.com',
        industry: 'technology',
      };

      configurationService.getOrganizationConfig.mockResolvedValue(mockConfig);

      const result = await controller.getOrganizationConfig(mockRequest);

      expect(configurationService.getOrganizationConfig).toHaveBeenCalledWith('tenant-123');
      expect(result).toEqual(mockConfig);
    });
  });

  describe('updateOrganizationConfig', () => {
    it('should update organization configuration', async () => {
      const configUpdate = {
        name: 'Updated Organization',
        website: 'https://updated.com',
      };

      const updatedConfig = {
        ...configUpdate,
        id: 'config-123',
        updatedAt: new Date(),
      };

      configurationService.updateOrganizationConfig.mockResolvedValue(updatedConfig);

      const result = await controller.updateOrganizationConfig(mockRequest, configUpdate);

      expect(configurationService.updateOrganizationConfig).toHaveBeenCalledWith(
        'tenant-123',
        configUpdate
      );
      expect(result).toEqual(updatedConfig);
    });
  });

  describe('uploadLogo', () => {
    it('should upload organization logo', async () => {
      const mockFile = {
        originalname: 'logo.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('fake-image-data'),
      } as Express.Multer.File;

      const uploadResult = {
        url: 'https://cdn.example.com/logo.png',
        filename: 'logo.png',
        size: 1024,
      };

      configurationService.uploadLogo.mockResolvedValue(uploadResult);

      const result = await controller.uploadLogo(mockRequest, mockFile);

      expect(configurationService.uploadLogo).toHaveBeenCalledWith('tenant-123', mockFile);
      expect(result).toEqual(uploadResult);
    });
  });

  describe('getBrandingConfig', () => {
    it('should get branding configuration', async () => {
      const mockBranding = {
        primaryColor: '#3b82f6',
        secondaryColor: '#64748b',
        logoUrl: 'https://cdn.example.com/logo.png',
      };

      configurationService.getBrandingConfig.mockResolvedValue(mockBranding);

      const result = await controller.getBrandingConfig(mockRequest);

      expect(configurationService.getBrandingConfig).toHaveBeenCalledWith('tenant-123');
      expect(result).toEqual(mockBranding);
    });
  });

  describe('updateBrandingConfig', () => {
    it('should update branding configuration', async () => {
      const brandingUpdate = {
        primaryColor: '#ef4444',
        secondaryColor: '#374151',
      };

      const updatedBranding = {
        ...brandingUpdate,
        id: 'branding-123',
        updatedAt: new Date(),
      };

      configurationService.updateBrandingConfig.mockResolvedValue(updatedBranding);

      const result = await controller.updateBrandingConfig(mockRequest, brandingUpdate);

      expect(configurationService.updateBrandingConfig).toHaveBeenCalledWith(
        'tenant-123',
        brandingUpdate
      );
      expect(result).toEqual(updatedBranding);
    });
  });

  describe('getBrandingPreview', () => {
    it('should generate branding preview', async () => {
      const mockPreview = {
        previewUrl: 'https://preview.example.com/branding-preview.png',
        components: ['header', 'sidebar', 'buttons'],
      };

      configurationService.generateBrandingPreview.mockResolvedValue(mockPreview);

      const result = await controller.getBrandingPreview(mockRequest);

      expect(configurationService.generateBrandingPreview).toHaveBeenCalledWith('tenant-123');
      expect(result).toEqual(mockPreview);
    });
  });

  describe('getCustomFields', () => {
    it('should get custom fields', async () => {
      const mockFields = [
        {
          id: 'field-1',
          name: 'department',
          type: 'select',
          label: 'Department',
          required: true,
          options: ['Sales', 'Support', 'Engineering'],
        },
        {
          id: 'field-2',
          name: 'priority_level',
          type: 'number',
          label: 'Priority Level',
          required: false,
        },
      ];

      configurationService.getCustomFields.mockResolvedValue(mockFields);

      const result = await controller.getCustomFields(mockRequest);

      expect(configurationService.getCustomFields).toHaveBeenCalledWith('tenant-123');
      expect(result).toEqual(mockFields);
    });
  });

  describe('createCustomField', () => {
    it('should create custom field', async () => {
      const fieldConfig = {
        name: 'customer_type',
        type: 'select',
        label: 'Customer Type',
        required: true,
        options: ['Individual', 'Business', 'Enterprise'],
      };

      const createdField = {
        id: 'field-123',
        ...fieldConfig,
        createdAt: new Date(),
      };

      configurationService.createCustomField.mockResolvedValue(createdField);

      const result = await controller.createCustomField(mockRequest, fieldConfig);

      expect(configurationService.createCustomField).toHaveBeenCalledWith(
        'tenant-123',
        fieldConfig
      );
      expect(result).toEqual(createdField);
    });
  });

  describe('updateCustomField', () => {
    it('should update custom field', async () => {
      const fieldUpdate = {
        label: 'Updated Customer Type',
        options: ['Individual', 'Business', 'Enterprise', 'Government'],
      };

      const updatedField = {
        id: 'field-123',
        name: 'customer_type',
        type: 'select',
        ...fieldUpdate,
        updatedAt: new Date(),
      };

      configurationService.updateCustomField.mockResolvedValue(updatedField);

      const result = await controller.updateCustomField(mockRequest, 'field-123', fieldUpdate);

      expect(configurationService.updateCustomField).toHaveBeenCalledWith(
        'tenant-123',
        'field-123',
        fieldUpdate
      );
      expect(result).toEqual(updatedField);
    });
  });

  describe('deleteCustomField', () => {
    it('should delete custom field', async () => {
      configurationService.deleteCustomField.mockResolvedValue(undefined);

      await controller.deleteCustomField(mockRequest, 'field-123');

      expect(configurationService.deleteCustomField).toHaveBeenCalledWith(
        'tenant-123',
        'field-123'
      );
    });
  });

  describe('validateConfiguration', () => {
    it('should validate configuration', async () => {
      const configToValidate = {
        organizationName: 'Test Org',
        primaryColor: '#invalid-color',
        customFields: [
          {
            name: 'test_field',
            type: 'select',
            options: [],
          },
        ],
      };

      const validationResult = {
        isValid: false,
        errors: [
          {
            field: 'primaryColor',
            message: 'Invalid color format',
            code: 'INVALID_COLOR',
          },
          {
            field: 'customFields[0].options',
            message: 'Select field must have at least one option',
            code: 'EMPTY_OPTIONS',
          },
        ],
        warnings: [],
      };

      configurationService.validateConfiguration.mockResolvedValue(validationResult);

      const result = await controller.validateConfiguration(mockRequest, configToValidate);

      expect(configurationService.validateConfiguration).toHaveBeenCalledWith(
        'tenant-123',
        configToValidate
      );
      expect(result).toEqual(validationResult);
    });
  });

  describe('exportConfiguration', () => {
    it('should export configuration', async () => {
      const exportResult = {
        exportId: 'export-123',
        downloadUrl: 'https://api.example.com/exports/export-123/download',
        format: 'json',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      configurationService.exportConfiguration.mockResolvedValue(exportResult);

      const result = await controller.exportConfiguration(mockRequest);

      expect(configurationService.exportConfiguration).toHaveBeenCalledWith('tenant-123');
      expect(result).toEqual(exportResult);
    });
  });

  describe('importConfiguration', () => {
    it('should import configuration', async () => {
      const configToImport = {
        organization: {
          name: 'Imported Organization',
          website: 'https://imported.com',
        },
        branding: {
          primaryColor: '#10b981',
          secondaryColor: '#6b7280',
        },
        customFields: [
          {
            name: 'imported_field',
            type: 'text',
            label: 'Imported Field',
            required: false,
          },
        ],
      };

      const importResult = {
        importId: 'import-123',
        status: 'completed',
        importedItems: {
          organization: 1,
          branding: 1,
          customFields: 1,
        },
        errors: [],
        warnings: [],
      };

      configurationService.importConfiguration.mockResolvedValue(importResult);

      const result = await controller.importConfiguration(mockRequest, configToImport);

      expect(configurationService.importConfiguration).toHaveBeenCalledWith(
        'tenant-123',
        configToImport
      );
      expect(result).toEqual(importResult);
    });
  });
});