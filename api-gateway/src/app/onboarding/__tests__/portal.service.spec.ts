/**
 * Portal Service Tests
 * Comprehensive test suite for customer portal management functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PortalService } from '../portal.service';
import { DatabaseService } from '@glavito/shared-database';

describe('PortalService', () => {
    let service: PortalService;
    let databaseService: jest.Mocked<DatabaseService>;
    let eventEmitter: jest.Mocked<EventEmitter2>;
    let configService: jest.Mocked<ConfigService>;

    const mockTenantId = 'tenant-123';
    const mockUserId = 'user-123';
    const mockPortalId = 'portal-123';

    const mockPortal = {
        id: mockPortalId,
        tenantId: mockTenantId,
        name: 'Test Portal',
        description: 'Test portal description',
        subdomain: 'testportal',
        customDomain: null,
        isActive: true,
        isPublished: false,
        branding: {
            colors: {
                primary: '#3B82F6',
                secondary: '#64748B',
                accent: '#F59E0B',
                background: '#FFFFFF',
                surface: '#F8FAFC',
                text: {
                    primary: '#1E293B',
                    secondary: '#475569',
                    muted: '#94A3B8',
                },
            },
        },
        features: {
            ticketSubmission: { enabled: true },
            knowledgeBase: { enabled: true },
            liveChat: { enabled: false },
        },
        customization: {
            layout: {
                headerStyle: 'standard',
                navigationStyle: 'horizontal',
                containerWidth: 'standard',
            },
        },
        seoSettings: {
            title: 'Test Portal - Customer Support',
            description: 'Get help and support from Test Portal',
            keywords: ['support', 'help'],
        },
        integrationCode: null,
        publishedAt: null,
        lastPublishedAt: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockCreateRequest = {
        name: 'Test Portal',
        description: 'Test portal description',
        subdomain: 'testportal',
        branding: {
            colors: {
                primary: '#3B82F6',
                secondary: '#64748B',
            },
        },
    };

    beforeEach(async () => {
        const mockDatabaseService = {
            customerPortal: {
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
            customerPortalPage: {
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                createMany: jest.fn(),
            },
            customerPortalTheme: {
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                updateMany: jest.fn(),
            },
            customDomain: {
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
            customerPortalAnalytics: {
                findMany: jest.fn(),
            },
        };

        const mockEventEmitter = {
            emit: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn().mockImplementation((key: string) => {
                const config = {
                    PORTAL_BASE_URL: 'support.example.com',
                    PORTAL_PREVIEW_URL: 'https://preview.example.com',
                    APP_URL: 'https://app.example.com',
                };
                return config[key as keyof typeof config];
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PortalService,
                {
                    provide: DatabaseService,
                    useValue: mockDatabaseService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: HttpService,
                    useValue: {
                        get: jest.fn(),
                        post: jest.fn(),
                    },
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<PortalService>(PortalService);
        databaseService = module.get(DatabaseService);
        eventEmitter = module.get(EventEmitter2);
        configService = module.get(ConfigService);
    });

    describe('createPortal', () => {
        it('should create portal successfully', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(null); // No existing portal
            databaseService.customerPortal.create.mockResolvedValue(mockPortal);
            databaseService.customerPortalPage.createMany.mockResolvedValue({ count: 3 });
            databaseService.customerPortalTheme.create.mockResolvedValue({
                id: 'theme-123',
                name: 'Default',
                isActive: true,
            });

            const result = await service.createPortal(mockTenantId, mockCreateRequest, mockUserId);

            expect(result).toMatchObject({
                id: mockPortalId,
                name: 'Test Portal',
                subdomain: 'testportal',
                isActive: true,
                isPublished: false,
            });

            expect(databaseService.customerPortal.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    tenantId: mockTenantId,
                    name: mockCreateRequest.name,
                    subdomain: mockCreateRequest.subdomain,
                }),
            });

            expect(eventEmitter.emit).toHaveBeenCalledWith('portal.created', {
                tenantId: mockTenantId,
                portalId: mockPortalId,
                userId: mockUserId,
                subdomain: mockCreateRequest.subdomain,
            });
        });

        it('should throw ConflictException when portal already exists', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);

            await expect(
                service.createPortal(mockTenantId, mockCreateRequest, mockUserId)
            ).rejects.toThrow(ConflictException);
        });

        it('should validate subdomain format', async () => {
            const invalidRequest = {
                ...mockCreateRequest,
                subdomain: 'invalid-subdomain!',
            };

            databaseService.customerPortal.findUnique.mockResolvedValue(null);

            await expect(
                service.createPortal(mockTenantId, invalidRequest, mockUserId)
            ).rejects.toThrow(BadRequestException);
        });

        it('should check subdomain availability', async () => {
            const duplicateRequest = {
                ...mockCreateRequest,
                subdomain: 'existing-subdomain',
            };

            databaseService.customerPortal.findUnique
                .mockResolvedValueOnce(null) // No existing portal for tenant
                .mockResolvedValueOnce({ id: 'other-portal', subdomain: 'existing-subdomain' }); // Subdomain taken

            await expect(
                service.createPortal(mockTenantId, duplicateRequest, mockUserId)
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('getPortal', () => {
        it('should return portal when it exists', async () => {
            const portalWithRelations = {
                ...mockPortal,
                pages: [
                    {
                        id: 'page-1',
                        name: 'Home',
                        slug: 'home',
                        isActive: true,
                        sortOrder: 1,
                    },
                ],
                themes: [
                    {
                        id: 'theme-1',
                        name: 'Default',
                        isActive: true,
                    },
                ],
            };

            databaseService.customerPortal.findUnique.mockResolvedValue(portalWithRelations);

            const result = await service.getPortal(mockTenantId);

            expect(result).toMatchObject({
                id: mockPortalId,
                name: 'Test Portal',
                subdomain: 'testportal',
            });

            expect(databaseService.customerPortal.findUnique).toHaveBeenCalledWith({
                where: { tenantId: mockTenantId },
                include: {
                    pages: {
                        where: { isActive: true },
                        orderBy: { sortOrder: 'asc' },
                    },
                    themes: {
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });
        });

        it('should return null when portal does not exist', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(null);

            const result = await service.getPortal(mockTenantId);

            expect(result).toBeNull();
        });
    });

    describe('updatePortal', () => {
        const updateRequest = {
            name: 'Updated Portal',
            description: 'Updated description',
            isActive: false,
        };

        it('should update portal successfully', async () => {
            const updatedPortal = { ...mockPortal, ...updateRequest };
            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);
            databaseService.customerPortal.update.mockResolvedValue(updatedPortal);

            const result = await service.updatePortal(mockTenantId, updateRequest, mockUserId);

            expect(result.name).toBe('Updated Portal');
            expect(result.description).toBe('Updated description');
            expect(result.isActive).toBe(false);

            expect(eventEmitter.emit).toHaveBeenCalledWith('portal.updated', {
                tenantId: mockTenantId,
                portalId: mockPortalId,
                userId: mockUserId,
                changes: updateRequest,
            });
        });

        it('should throw NotFoundException when portal not found', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(null);

            await expect(
                service.updatePortal(mockTenantId, updateRequest, mockUserId)
            ).rejects.toThrow(NotFoundException);
        });

        it('should validate subdomain when changed', async () => {
            const requestWithInvalidSubdomain = {
                ...updateRequest,
                subdomain: 'invalid!subdomain',
            };

            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);

            await expect(
                service.updatePortal(mockTenantId, requestWithInvalidSubdomain, mockUserId)
            ).rejects.toThrow(BadRequestException);
        });

        it('should validate custom domain format', async () => {
            const requestWithInvalidDomain = {
                ...updateRequest,
                customDomain: 'invalid-domain!',
            };

            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);

            await expect(
                service.updatePortal(mockTenantId, requestWithInvalidDomain, mockUserId)
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('deletePortal', () => {
        it('should delete portal successfully', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);
            databaseService.customerPortal.delete.mockResolvedValue(mockPortal);

            await service.deletePortal(mockTenantId, mockUserId);

            expect(databaseService.customerPortal.delete).toHaveBeenCalledWith({
                where: { tenantId: mockTenantId },
            });

            expect(eventEmitter.emit).toHaveBeenCalledWith('portal.deleted', {
                tenantId: mockTenantId,
                portalId: mockPortalId,
                userId: mockUserId,
                subdomain: mockPortal.subdomain,
            });
        });

        it('should throw NotFoundException when portal not found', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(null);

            await expect(
                service.deletePortal(mockTenantId, mockUserId)
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('publishPortal', () => {
        const publishRequest = {
            generateIntegrationCode: true,
            notifyUsers: true,
            backupCurrent: false,
        };

        it('should publish portal successfully', async () => {
            const portalWithRelations = {
                ...mockPortal,
                pages: [
                    { pageType: 'home', isActive: true },
                    { pageType: 'contact', isActive: true },
                ],
                themes: [{ isActive: true }],
            };

            const publishedPortal = {
                ...mockPortal,
                isPublished: true,
                publishedAt: new Date(),
                lastPublishedAt: new Date(),
                integrationCode: expect.any(String),
            };

            databaseService.customerPortal.findUnique.mockResolvedValue(portalWithRelations);
            databaseService.customerPortal.update.mockResolvedValue(publishedPortal);

            const result = await service.publishPortal(mockTenantId, publishRequest, mockUserId);

            expect(result.success).toBe(true);
            expect(result.url).toBeDefined();
            expect(result.integrationCode).toBeDefined();

            expect(eventEmitter.emit).toHaveBeenCalledWith('portal.published', {
                tenantId: mockTenantId,
                portalId: mockPortalId,
                userId: mockUserId,
                url: expect.any(String),
                integrationCode: expect.any(String),
            });
        });

        it('should throw NotFoundException when portal not found', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(null);

            await expect(
                service.publishPortal(mockTenantId, publishRequest, mockUserId)
            ).rejects.toThrow(NotFoundException);
        });

        it('should validate portal before publishing', async () => {
            const incompletePortal = {
                ...mockPortal,
                pages: [{ pageType: 'home', isActive: true }], // Missing contact page
                themes: [],
            };

            databaseService.customerPortal.findUnique.mockResolvedValue(incompletePortal);

            await expect(
                service.publishPortal(mockTenantId, publishRequest, mockUserId)
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('generatePreview', () => {
        it('should generate portal preview successfully', async () => {
            const portalWithRelations = {
                ...mockPortal,
                pages: [{ pageType: 'home', isActive: true }],
                themes: [{ isActive: true }],
            };

            databaseService.customerPortal.findUnique.mockResolvedValue(portalWithRelations);

            const result = await service.generatePreview(mockTenantId);

            expect(result).toMatchObject({
                url: expect.stringContaining(mockPortal.subdomain),
                html: expect.any(String),
                css: expect.any(String),
                js: expect.any(String),
                assets: {
                    images: expect.any(Array),
                    fonts: expect.any(Array),
                    icons: expect.any(Array),
                },
            });
        });

        it('should throw NotFoundException when portal not found', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(null);

            await expect(
                service.generatePreview(mockTenantId)
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('createCustomDomain', () => {
        const domainRequest = {
            domain: 'support.example.com',
            autoVerify: true,
        };

        it('should create custom domain successfully', async () => {
            const mockCustomDomain = {
                id: 'domain-123',
                tenantId: mockTenantId,
                portalId: mockPortalId,
                domain: domainRequest.domain,
                status: 'pending',
                verificationToken: expect.any(String),
                dnsRecords: expect.any(Array),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);
            databaseService.customDomain.findUnique.mockResolvedValue(null); // Domain available
            databaseService.customDomain.create.mockResolvedValue(mockCustomDomain);

            const result = await service.createCustomDomain(mockTenantId, domainRequest, mockUserId);

            expect(result).toMatchObject({
                id: 'domain-123',
                domain: domainRequest.domain,
                status: 'pending',
            });

            expect(eventEmitter.emit).toHaveBeenCalledWith('custom.domain.created', {
                tenantId: mockTenantId,
                domainId: 'domain-123',
                domain: domainRequest.domain,
                userId: mockUserId,
            });
        });

        it('should throw NotFoundException when portal not found', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(null);

            await expect(
                service.createCustomDomain(mockTenantId, domainRequest, mockUserId)
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw ConflictException when domain already exists', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);
            databaseService.customDomain.findUnique.mockResolvedValue({
                id: 'existing-domain',
                domain: domainRequest.domain,
            });

            await expect(
                service.createCustomDomain(mockTenantId, domainRequest, mockUserId)
            ).rejects.toThrow(ConflictException);
        });

        it('should validate domain format', async () => {
            const invalidDomainRequest = {
                ...domainRequest,
                domain: 'invalid-domain!',
            };

            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);

            await expect(
                service.createCustomDomain(mockTenantId, invalidDomainRequest, mockUserId)
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('createPortalPage', () => {
        const pageRequest = {
            name: 'About Us',
            slug: 'about',
            title: 'About Our Company',
            content: '<h1>About Us</h1><p>We are a great company.</p>',
            pageType: 'custom' as const,
        };

        it('should create portal page successfully', async () => {
            const mockPage = {
                id: 'page-123',
                portalId: mockPortalId,
                ...pageRequest,
                isActive: true,
                isSystem: false,
                sortOrder: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);
            databaseService.customerPortalPage.findFirst.mockResolvedValue(null); // Slug available
            databaseService.customerPortalPage.create.mockResolvedValue(mockPage);

            const result = await service.createPortalPage(mockTenantId, pageRequest, mockUserId);

            expect(result).toMatchObject({
                id: 'page-123',
                name: 'About Us',
                slug: 'about',
                pageType: 'custom',
            });

            expect(eventEmitter.emit).toHaveBeenCalledWith('portal.page.created', {
                tenantId: mockTenantId,
                portalId: mockPortalId,
                pageId: 'page-123',
                userId: mockUserId,
            });
        });

        it('should throw NotFoundException when portal not found', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(null);

            await expect(
                service.createPortalPage(mockTenantId, pageRequest, mockUserId)
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw ConflictException when slug already exists', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);
            databaseService.customerPortalPage.findFirst.mockResolvedValue({
                id: 'existing-page',
                slug: pageRequest.slug,
            });

            await expect(
                service.createPortalPage(mockTenantId, pageRequest, mockUserId)
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('createPortalTheme', () => {
        const themeRequest = {
            name: 'Dark Theme',
            description: 'A dark theme for the portal',
            colors: {
                primary: '#1F2937',
                secondary: '#374151',
                background: '#111827',
            },
        };

        it('should create portal theme successfully', async () => {
            const mockTheme = {
                id: 'theme-123',
                portalId: mockPortalId,
                ...themeRequest,
                isActive: false,
                isSystem: false,
                typography: {},
                layout: {},
                components: {},
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);
            databaseService.customerPortalTheme.findFirst.mockResolvedValue(null); // Name available
            databaseService.customerPortalTheme.create.mockResolvedValue(mockTheme);

            const result = await service.createPortalTheme(mockTenantId, themeRequest, mockUserId);

            expect(result).toMatchObject({
                id: 'theme-123',
                name: 'Dark Theme',
                colors: themeRequest.colors,
            });

            expect(eventEmitter.emit).toHaveBeenCalledWith('portal.theme.created', {
                tenantId: mockTenantId,
                portalId: mockPortalId,
                themeId: 'theme-123',
                userId: mockUserId,
            });
        });

        it('should throw ConflictException when theme name already exists', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);
            databaseService.customerPortalTheme.findFirst.mockResolvedValue({
                id: 'existing-theme',
                name: themeRequest.name,
            });

            await expect(
                service.createPortalTheme(mockTenantId, themeRequest, mockUserId)
            ).rejects.toThrow(ConflictException);
        });
    });

    describe('activatePortalTheme', () => {
        const themeId = 'theme-123';

        it('should activate portal theme successfully', async () => {
            const mockTheme = {
                id: themeId,
                portalId: mockPortalId,
                name: 'Test Theme',
                isActive: false,
            };

            const activatedTheme = { ...mockTheme, isActive: true };

            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);
            databaseService.customerPortalTheme.findFirst.mockResolvedValue(mockTheme);
            databaseService.customerPortalTheme.updateMany.mockResolvedValue({ count: 1 });
            databaseService.customerPortalTheme.update.mockResolvedValue(activatedTheme);

            const result = await service.activatePortalTheme(mockTenantId, themeId, mockUserId);

            expect(result.isActive).toBe(true);

            expect(databaseService.customerPortalTheme.updateMany).toHaveBeenCalledWith({
                where: {
                    portalId: mockPortalId,
                    isActive: true,
                },
                data: { isActive: false },
            });

            expect(eventEmitter.emit).toHaveBeenCalledWith('portal.theme.activated', {
                tenantId: mockTenantId,
                portalId: mockPortalId,
                themeId,
                userId: mockUserId,
            });
        });

        it('should throw NotFoundException when theme not found', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);
            databaseService.customerPortalTheme.findFirst.mockResolvedValue(null);

            await expect(
                service.activatePortalTheme(mockTenantId, themeId, mockUserId)
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('getPortalMetrics', () => {
        it('should return portal metrics successfully', async () => {
            const mockAnalytics = [
                {
                    date: new Date('2024-01-01'),
                    pageViews: 100,
                    uniqueVisitors: 80,
                    ticketsSubmitted: 5,
                    faqViews: 20,
                    searchQueries: 15,
                    avgSessionDuration: 120,
                    bounceRate: 0.3,
                    topPages: [{ page: '/home', views: 50 }],
                    topSearches: [{ query: 'help', count: 10 }],
                    referrers: [{ source: 'google', visits: 30 }],
                    devices: { desktop: 60, mobile: 40 },
                    browsers: { chrome: 70, firefox: 30 },
                    countries: { US: 80, CA: 20 },
                },
            ];

            databaseService.customerPortal.findUnique.mockResolvedValue(mockPortal);
            databaseService.customerPortalAnalytics.findMany.mockResolvedValue(mockAnalytics);

            const result = await service.getPortalMetrics(mockTenantId);

            expect(result).toMatchObject({
                overview: {
                    totalViews: expect.any(Number),
                    uniqueVisitors: expect.any(Number),
                    ticketsSubmitted: expect.any(Number),
                    avgSessionDuration: expect.any(Number),
                    bounceRate: expect.any(Number),
                },
                trends: expect.any(Array),
                topPages: expect.any(Array),
                topSearches: expect.any(Array),
                devices: expect.any(Array),
                browsers: expect.any(Array),
                countries: expect.any(Array),
                referrers: expect.any(Array),
            });
        });

        it('should throw NotFoundException when portal not found', async () => {
            databaseService.customerPortal.findUnique.mockResolvedValue(null);

            await expect(
                service.getPortalMetrics(mockTenantId)
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('getPortalTemplates', () => {
        it('should return portal templates', async () => {
            const result = await service.getPortalTemplates();

            expect(result).toBeInstanceOf(Array);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toMatchObject({
                id: expect.any(String),
                name: expect.any(String),
                description: expect.any(String),
                category: expect.any(String),
                branding: expect.any(Object),
                features: expect.any(Object),
                customization: expect.any(Object),
            });
        });

        it('should filter templates by category', async () => {
            const result = await service.getPortalTemplates('business');

            expect(result.every(template => template.category === 'business')).toBe(true);
        });

        it('should filter templates by premium status', async () => {
            const result = await service.getPortalTemplates(undefined, false);

            expect(result.every(template => template.isPremium === false)).toBe(true);
        });
    });
});er
