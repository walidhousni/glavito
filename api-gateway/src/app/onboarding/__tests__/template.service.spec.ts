/**
 * Template Service Tests
 * Unit tests for template management functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TemplateService, OnboardingTemplate, TemplateFilter } from '../template.service';
import { DatabaseService } from '@glavito/shared-database';

describe('TemplateService', () => {
  let service: TemplateService;
  let databaseService: jest.Mocked<DatabaseService>;
  let configService: jest.Mocked<ConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  beforeEach(async () => {
    const mockDatabaseService = {
      // Add any database methods that would be used
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    databaseService = module.get(DatabaseService);
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTemplates', () => {
    it('should return all templates without filter', async () => {
      jest.spyOn(service as any, 'loadTemplatesFromDatabase').mockResolvedValue([
        { id: 'template-1', name: 'Template 1', industry: 'technology' },
        { id: 'template-2', name: 'Template 2', industry: 'ecommerce' },
      ]);

      const result = await service.getTemplates();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('template-1');
      expect(result[1].id).toBe('template-2');
    });

    it('should return filtered templates', async () => {
      const mockTemplates = [
        { id: 'template-1', name: 'Template 1', industry: 'technology', category: 'complete' },
        { id: 'template-2', name: 'Template 2', industry: 'ecommerce', category: 'workflow' },
      ];

      jest.spyOn(service as any, 'loadTemplatesFromDatabase').mockResolvedValue(mockTemplates);

      const filter: TemplateFilter = { industry: 'technology' };
      const result = await service.getTemplates(filter);

      expect(result).toHaveLength(1);
      expect(result[0].industry).toBe('technology');
    });

    it('should handle database errors', async () => {
      jest.spyOn(service as any, 'loadTemplatesFromDatabase').mockRejectedValue(new Error('Database error'));

      await expect(service.getTemplates()).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTemplate', () => {
    it('should return template by ID', async () => {
      const mockTemplate = {
        id: 'template-123',
        name: 'Test Template',
        industry: 'technology',
      };

      jest.spyOn(service as any, 'loadTemplateFromDatabase').mockResolvedValue(mockTemplate);

      const result = await service.getTemplate('template-123');

      expect(result).toEqual(mockTemplate);
    });

    it('should throw NotFoundException for non-existent template', async () => {
      jest.spyOn(service as any, 'loadTemplateFromDatabase').mockResolvedValue(null);

      await expect(service.getTemplate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTemplate', () => {
    it('should create template successfully', async () => {
      const templateData: Partial<OnboardingTemplate> = {
        name: 'Custom Template',
        description: 'A custom template',
        industry: 'technology',
        category: 'complete',
        tags: ['custom', 'test'],
      };

      jest.spyOn(service as any, 'saveTemplateToDatabase').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'getDefaultMetadata').mockReturnValue({
        industry: 'general',
        companySize: 'medium',
        complexity: 'moderate',
        estimatedSetupTime: 30,
        prerequisites: [],
        supportedFeatures: [],
        integrations: [],
        languages: ['en'],
        screenshots: [],
        documentation: '',
        changelog: [],
      });

      const result = await service.createTemplate(mockTenantId, mockUserId, templateData);

      expect(result).toBeDefined();
      expect(result.name).toBe(templateData.name);
      expect(result.description).toBe(templateData.description);
      expect(result.industry).toBe(templateData.industry);
      expect(result.category).toBe(templateData.category);
      expect(result.tags).toEqual(templateData.tags);
      expect(result.createdBy).toBe(mockUserId);
      expect(result.isOfficial).toBe(false);
      expect(result.usageCount).toBe(0);
      expect(result.rating).toBe(0);

      expect(eventEmitter.emit).toHaveBeenCalledWith('template.created', {
        templateId: result.id,
        tenantId: mockTenantId,
        userId: mockUserId,
      });
    });

    it('should create template with default values', async () => {
      jest.spyOn(service as any, 'saveTemplateToDatabase').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'getDefaultMetadata').mockReturnValue({
        industry: 'general',
        companySize: 'medium',
        complexity: 'moderate',
        estimatedSetupTime: 30,
        prerequisites: [],
        supportedFeatures: [],
        integrations: [],
        languages: ['en'],
        screenshots: [],
        documentation: '',
        changelog: [],
      });

      const result = await service.createTemplate(mockTenantId, mockUserId, {});

      expect(result.name).toBe('Custom Template');
      expect(result.description).toBe('');
      expect(result.industry).toBe('general');
      expect(result.category).toBe('complete');
      expect(result.version).toBe('1.0.0');
      expect(result.isPublic).toBe(false);
    });

    it('should handle creation errors', async () => {
      jest.spyOn(service as any, 'saveTemplateToDatabase').mockRejectedValue(new Error('Save error'));

      await expect(
        service.createTemplate(mockTenantId, mockUserId, { name: 'Test' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateTemplate', () => {
    const mockTemplate: OnboardingTemplate = {
      id: 'template-123',
      name: 'Original Template',
      description: 'Original description',
      industry: 'technology',
      category: 'complete',
      version: '1.0.0',
      isPublic: false,
      isOfficial: false,
      tags: [],
      configuration: {},
      metadata: {
        industry: 'technology',
        companySize: 'medium',
        complexity: 'moderate',
        estimatedSetupTime: 30,
        prerequisites: [],
        supportedFeatures: [],
        integrations: [],
        languages: ['en'],
        screenshots: [],
        documentation: '',
        changelog: [],
      },
      createdBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      rating: 0,
      reviews: [],
    };

    it('should update template successfully', async () => {
      const updates = {
        name: 'Updated Template',
        description: 'Updated description',
      };

      jest.spyOn(service, 'getTemplate').mockResolvedValue(mockTemplate);
      jest.spyOn(service as any, 'saveTemplateToDatabase').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'incrementVersion').mockReturnValue('1.0.1');

      const result = await service.updateTemplate('template-123', mockUserId, updates);

      expect(result.name).toBe(updates.name);
      expect(result.description).toBe(updates.description);
      expect(result.version).toBe('1.0.1');
      expect(result.updatedAt).toBeInstanceOf(Date);

      expect(eventEmitter.emit).toHaveBeenCalledWith('template.updated', {
        templateId: 'template-123',
        userId: mockUserId,
        changes: ['name', 'description'],
      });
    });

    it('should throw error for unauthorized update', async () => {
      const unauthorizedTemplate = { ...mockTemplate, createdBy: 'different-user', isPublic: false };
      jest.spyOn(service, 'getTemplate').mockResolvedValue(unauthorizedTemplate);

      await expect(
        service.updateTemplate('template-123', mockUserId, { name: 'Updated' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow update of public template', async () => {
      const publicTemplate = { ...mockTemplate, createdBy: 'different-user', isPublic: true };
      jest.spyOn(service, 'getTemplate').mockResolvedValue(publicTemplate);
      jest.spyOn(service as any, 'saveTemplateToDatabase').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'incrementVersion').mockReturnValue('1.0.1');

      const result = await service.updateTemplate('template-123', mockUserId, { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });
  });

  describe('deleteTemplate', () => {
    const mockTemplate: OnboardingTemplate = {
      id: 'template-123',
      name: 'Test Template',
      description: '',
      industry: 'technology',
      category: 'complete',
      version: '1.0.0',
      isPublic: false,
      isOfficial: false,
      tags: [],
      configuration: {},
      metadata: {
        industry: 'technology',
        companySize: 'medium',
        complexity: 'moderate',
        estimatedSetupTime: 30,
        prerequisites: [],
        supportedFeatures: [],
        integrations: [],
        languages: ['en'],
        screenshots: [],
        documentation: '',
        changelog: [],
      },
      createdBy: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      rating: 0,
      reviews: [],
    };

    it('should delete template successfully', async () => {
      jest.spyOn(service, 'getTemplate').mockResolvedValue(mockTemplate);
      jest.spyOn(service as any, 'removeTemplateFromDatabase').mockResolvedValue(undefined);

      await service.deleteTemplate('template-123', mockUserId);

      expect(eventEmitter.emit).toHaveBeenCalledWith('template.deleted', {
        templateId: 'template-123',
        userId: mockUserId,
      });
    });

    it('should throw error for unauthorized deletion', async () => {
      const unauthorizedTemplate = { ...mockTemplate, createdBy: 'different-user' };
      jest.spyOn(service, 'getTemplate').mockResolvedValue(unauthorizedTemplate);

      await expect(
        service.deleteTemplate('template-123', mockUserId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('applyTemplate', () => {
    const mockTemplate: OnboardingTemplate = {
      id: 'template-123',
      name: 'Test Template',
      description: '',
      industry: 'technology',
      category: 'complete',
      version: '1.0.0',
      isPublic: true,
      isOfficial: true,
      tags: [],
      configuration: {
        organizationSetup: {
          requiredFields: ['name', 'email'],
          optionalFields: ['phone'],
          defaultValues: { timezone: 'UTC' },
          branding: {
            colorScheme: ['#3b82f6'],
            logoGuidelines: 'Modern logo',
            fontRecommendations: ['Inter'],
          },
          businessHours: {
            timezone: 'UTC',
            workingDays: [1, 2, 3, 4, 5],
            workingHours: { start: '09:00', end: '17:00' },
            holidays: [],
          },
        },
        workflowRules: {
          rules: [],
          slaRules: [],
          categories: ['Technical'],
          priorities: ['Low', 'Medium', 'High'],
          statuses: ['New', 'Open', 'Closed'],
        },
      },
      metadata: {
        industry: 'technology',
        companySize: 'medium',
        complexity: 'moderate',
        estimatedSetupTime: 30,
        prerequisites: [],
        supportedFeatures: [],
        integrations: [],
        languages: ['en'],
        screenshots: [],
        documentation: '',
        changelog: [],
      },
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 10,
      rating: 4.5,
      reviews: [],
    };

    it('should apply template successfully', async () => {
      jest.spyOn(service, 'getTemplate').mockResolvedValue(mockTemplate);
      jest.spyOn(service as any, 'applyOrganizationTemplate').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'applyWorkflowTemplate').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'saveTemplateToDatabase').mockResolvedValue(undefined);

      const customizations = { organizationName: 'Test Company' };

      await service.applyTemplate(mockTenantId, 'template-123', customizations);

      expect(service as any).toHaveProperty('applyOrganizationTemplate');
      expect(service as any).toHaveProperty('applyWorkflowTemplate');
      expect(eventEmitter.emit).toHaveBeenCalledWith('template.applied', {
        templateId: 'template-123',
        tenantId: mockTenantId,
        customizations,
      });
    });

    it('should increment usage count', async () => {
      const originalUsageCount = mockTemplate.usageCount;
      jest.spyOn(service, 'getTemplate').mockResolvedValue(mockTemplate);
      jest.spyOn(service as any, 'saveTemplateToDatabase').mockImplementation((template) => {
        expect(template.usageCount).toBe(originalUsageCount + 1);
        return Promise.resolve();
      });

      await service.applyTemplate(mockTenantId, 'template-123');
    });

    it('should handle application errors', async () => {
      jest.spyOn(service, 'getTemplate').mockResolvedValue(mockTemplate);
      jest.spyOn(service as any, 'applyOrganizationTemplate').mockRejectedValue(new Error('Apply error'));

      await expect(
        service.applyTemplate(mockTenantId, 'template-123')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSmartRecommendations', () => {
    it('should return smart recommendations', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Tech Template',
          industry: 'technology',
          metadata: { companySize: 'startup' },
          rating: 4.5,
          usageCount: 100,
          isOfficial: true,
          isPublic: true,
        },
        {
          id: 'template-2',
          name: 'Ecommerce Template',
          industry: 'ecommerce',
          metadata: { companySize: 'medium' },
          rating: 3.8,
          usageCount: 50,
          isOfficial: false,
          isPublic: true,
        },
      ];

      jest.spyOn(service, 'getTemplates').mockResolvedValue(mockTemplates as any);
      jest.spyOn(service as any, 'calculateRecommendationConfidence').mockReturnValueOnce(0.8).mockReturnValueOnce(0.4);
      jest.spyOn(service as any, 'generateRecommendationReasons').mockReturnValue(['Good match']);
      jest.spyOn(service as any, 'calculateEstimatedBenefit').mockReturnValue('Save 30 minutes');
      jest.spyOn(service as any, 'generateSmartCustomizations').mockResolvedValue([]);

      const context = {
        industry: 'technology',
        companySize: 'startup',
      };

      const result = await service.getSmartRecommendations(mockTenantId, context);

      expect(result).toHaveLength(1); // Only template-1 should pass confidence threshold
      expect(result[0].templateId).toBe('template-1');
      expect(result[0].confidence).toBe(0.8);
    });

    it('should sort recommendations by confidence', async () => {
      const mockTemplates = [
        { id: 'template-1', industry: 'technology', isPublic: true },
        { id: 'template-2', industry: 'technology', isPublic: true },
      ];

      jest.spyOn(service, 'getTemplates').mockResolvedValue(mockTemplates as any);
      jest.spyOn(service as any, 'calculateRecommendationConfidence').mockReturnValueOnce(0.6).mockReturnValueOnce(0.9);
      jest.spyOn(service as any, 'generateRecommendationReasons').mockReturnValue(['Good match']);
      jest.spyOn(service as any, 'calculateEstimatedBenefit').mockReturnValue('Save time');
      jest.spyOn(service as any, 'generateSmartCustomizations').mockResolvedValue([]);

      const result = await service.getSmartRecommendations(mockTenantId, {});

      expect(result).toHaveLength(2);
      expect(result[0].templateId).toBe('template-2'); // Higher confidence first
      expect(result[1].templateId).toBe('template-1');
    });

    it('should limit recommendations to top 5', async () => {
      const mockTemplates = Array.from({ length: 10 }, (_, i) => ({
        id: `template-${i}`,
        industry: 'technology',
        isPublic: true,
      }));

      jest.spyOn(service, 'getTemplates').mockResolvedValue(mockTemplates as any);
      jest.spyOn(service as any, 'calculateRecommendationConfidence').mockReturnValue(0.7);
      jest.spyOn(service as any, 'generateRecommendationReasons').mockReturnValue(['Good match']);
      jest.spyOn(service as any, 'calculateEstimatedBenefit').mockReturnValue('Save time');
      jest.spyOn(service as any, 'generateSmartCustomizations').mockResolvedValue([]);

      const result = await service.getSmartRecommendations(mockTenantId, {});

      expect(result).toHaveLength(5);
    });
  });

  describe('getTemplateCategories', () => {
    it('should return template categories', async () => {
      const result = await service.getTemplateCategories();

      expect(result).toHaveLength(6);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('count');
      expect(result[0]).toHaveProperty('description');
      expect(result.find(c => c.name === 'complete')).toBeDefined();
      expect(result.find(c => c.name === 'workflow')).toBeDefined();
    });
  });

  describe('getTemplateIndustries', () => {
    it('should return template industries', async () => {
      const result = await service.getTemplateIndustries();

      expect(result).toHaveLength(8);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('count');
      expect(result[0]).toHaveProperty('description');
      expect(result.find(i => i.name === 'technology')).toBeDefined();
      expect(result.find(i => i.name === 'ecommerce')).toBeDefined();
    });
  });

  describe('addTemplateReview', () => {
    const mockTemplate: OnboardingTemplate = {
      id: 'template-123',
      name: 'Test Template',
      description: '',
      industry: 'technology',
      category: 'complete',
      version: '1.0.0',
      isPublic: true,
      isOfficial: false,
      tags: [],
      configuration: {},
      metadata: {
        industry: 'technology',
        companySize: 'medium',
        complexity: 'moderate',
        estimatedSetupTime: 30,
        prerequisites: [],
        supportedFeatures: [],
        integrations: [],
        languages: ['en'],
        screenshots: [],
        documentation: '',
        changelog: [],
      },
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      rating: 0,
      reviews: [],
    };

    it('should add template review successfully', async () => {
      jest.spyOn(service, 'getTemplate').mockResolvedValue(mockTemplate);
      jest.spyOn(service as any, 'saveTemplateToDatabase').mockResolvedValue(undefined);

      const review = {
        rating: 5,
        comment: 'Excellent template!',
        pros: ['Easy to use', 'Comprehensive'],
        cons: ['Could be faster'],
      };

      await service.addTemplateReview('template-123', mockUserId, 'John Doe', review);

      expect(eventEmitter.emit).toHaveBeenCalledWith('template.reviewed', {
        templateId: 'template-123',
        userId: mockUserId,
        rating: 5,
      });
    });

    it('should update average rating', async () => {
      const templateWithReviews = {
        ...mockTemplate,
        reviews: [
          {
            id: 'review-1',
            userId: 'user-1',
            userName: 'User 1',
            rating: 4,
            comment: 'Good',
            pros: [],
            cons: [],
            createdAt: new Date(),
          },
        ],
        rating: 4,
      };

      jest.spyOn(service, 'getTemplate').mockResolvedValue(templateWithReviews);
      jest.spyOn(service as any, 'saveTemplateToDatabase').mockImplementation((template) => {
        expect(template.rating).toBe(4.5); // (4 + 5) / 2
        return Promise.resolve();
      });

      const review = {
        rating: 5,
        comment: 'Excellent!',
        pros: ['Great'],
        cons: [],
      };

      await service.addTemplateReview('template-123', mockUserId, 'John Doe', review);
    });
  });

  describe('helper methods', () => {
    describe('calculateRecommendationConfidence', () => {
      it('should calculate confidence based on multiple factors', () => {
        const template = {
          industry: 'technology',
          metadata: { companySize: 'startup' },
          rating: 4.5,
          usageCount: 150,
          isOfficial: true,
        };

        const context = {
          industry: 'technology',
          companySize: 'startup',
        };

        const confidence = (service as any).calculateRecommendationConfidence(template, context);

        expect(confidence).toBeGreaterThan(0.5);
        expect(confidence).toBeLessThanOrEqual(1.0);
      });

      it('should give higher confidence for exact matches', () => {
        const template = {
          industry: 'technology',
          metadata: { companySize: 'startup' },
          rating: 4.5,
          usageCount: 150,
          isOfficial: true,
        };

        const exactContext = {
          industry: 'technology',
          companySize: 'startup',
        };

        const partialContext = {
          industry: 'ecommerce',
          companySize: 'large',
        };

        const exactConfidence = (service as any).calculateRecommendationConfidence(template, exactContext);
        const partialConfidence = (service as any).calculateRecommendationConfidence(template, partialContext);

        expect(exactConfidence).toBeGreaterThan(partialConfidence);
      });
    });

    describe('generateRecommendationReasons', () => {
      it('should generate appropriate reasons', () => {
        const template = {
          industry: 'technology',
          metadata: { companySize: 'startup' },
          rating: 4.5,
          usageCount: 150,
          isOfficial: true,
        };

        const context = {
          industry: 'technology',
          companySize: 'startup',
        };

        const reasons = (service as any).generateRecommendationReasons(template, context);

        expect(reasons).toContain('Designed specifically for technology industry');
        expect(reasons).toContain('Optimized for startup companies');
        expect(reasons).toContain('Highly rated (4.5/5.0) by users');
        expect(reasons).toContain('Proven template used by 150+ organizations');
        expect(reasons).toContain('Official template maintained by our team');
      });
    });

    describe('incrementVersion', () => {
      it('should increment patch version', () => {
        const newVersion = (service as any).incrementVersion('1.2.3');
        expect(newVersion).toBe('1.2.4');
      });

      it('should handle missing patch version', () => {
        const newVersion = (service as any).incrementVersion('1.2');
        expect(newVersion).toBe('1.2.1');
      });
    });

    describe('calculateEstimatedBenefit', () => {
      it('should calculate time savings', () => {
        const template = {
          metadata: { estimatedSetupTime: 30 },
        };

        const benefit = (service as any).calculateEstimatedBenefit(template, {});

        expect(benefit).toContain('Save approximately');
        expect(benefit).toContain('minutes');
      });
    });
  });
});