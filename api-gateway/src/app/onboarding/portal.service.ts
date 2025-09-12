/**
 * Customer Portal Service
 * Handles customer portal customization, branding, and publishing
 */

import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@glavito/shared-database';
import { EventEmitter2 } from '@nestjs/event-emitter';
// Removed unused import: HttpService
// Removed unused import: firstValueFrom
import * as crypto from 'crypto';
import {
  CustomerPortal,
  CreatePortalRequest,
  UpdatePortalRequest,
  PublishPortalRequest,
  CreateCustomDomainRequest,
  CreatePortalPageRequest,
  UpdatePortalPageRequest,
  CreatePortalThemeRequest,
  // Removed unused CreatePortalWidgetRequest
  CustomerPortalPage,
  CustomerPortalTheme,
  // Removed unused PortalWidget
  CustomDomain,
  PortalPreview,
  PortalMetrics,
  PortalTemplate,
  PortalBranding,
  PortalFeatures,
  PortalCustomization,
  PortalSEOSettings,
  DNSRecord,
} from '@glavito/shared-types';
import { Prisma } from '@prisma/client';

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    // Removed unused HttpService
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create customer portal
   */
  async createPortal(
    tenantId: string,
    request: CreatePortalRequest,
    userId: string
  ): Promise<CustomerPortal> {
    try {
      this.logger.log(`Creating customer portal: ${request.name} for tenant: ${tenantId}`);

      // Check if portal already exists
      const existingPortal = await this.databaseService.customerPortal.findUnique({
        where: { tenantId },
      });

      if (existingPortal) {
        throw new ConflictException('Customer portal already exists for this tenant');
      }

      // Validate subdomain
      await this.validateSubdomain(request.subdomain);

      // Create default branding, features, and customization
      const defaultBranding = this.getDefaultBranding();
      const defaultFeatures = this.getDefaultFeatures();
      const defaultCustomization = this.getDefaultCustomization();
      const defaultSEOSettings = this.getDefaultSEOSettings(request.name);

      const portal = await this.databaseService.customerPortal.create({
        data: {
          tenantId,
          name: request.name,
          description: request.description,
          subdomain: request.subdomain,
          branding: ({ ...defaultBranding, ...request.branding } as unknown) as Prisma.InputJsonValue,
          features: ({ ...defaultFeatures, ...request.features } as unknown) as Prisma.InputJsonValue,
          customization: ({ ...defaultCustomization, ...request.customization } as unknown) as Prisma.InputJsonValue,
          seoSettings: ({ ...defaultSEOSettings, ...request.seoSettings } as unknown) as Prisma.InputJsonValue,
        },
      });

      // Create default pages
      await this.createDefaultPages(portal.id);

      // Create default theme
      await this.createDefaultTheme(portal.id);

      // Emit portal created event
      this.eventEmitter.emit('portal.created', {
        tenantId,
        portalId: portal.id,
        userId,
        subdomain: request.subdomain,
      });

      return this.mapToCustomerPortal(portal);
    } catch (error) {
      this.logger.error(`Failed to create customer portal: ${(error as Error).message}`);
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create customer portal');
    }
  }

  /**
   * Update customer portal
   */
  async updatePortal(
    tenantId: string,
    request: UpdatePortalRequest,
    userId: string
  ): Promise<CustomerPortal> {
    try {
      const existingPortal = await this.databaseService.customerPortal.findUnique({
        where: { tenantId },
      });

      if (!existingPortal) {
        throw new NotFoundException('Customer portal not found');
      }

      // Validate subdomain if changed
      if (request.subdomain && request.subdomain !== existingPortal.subdomain) {
        await this.validateSubdomain(request.subdomain);
      }

      // Validate custom domain if provided
      if (request.customDomain) {
        this.validateCustomDomain(request.customDomain);
      }

      const updatedPortal = await this.databaseService.customerPortal.update({
        where: { tenantId },
        data: {
          name: request.name,
          description: request.description,
          subdomain: request.subdomain,
          customDomain: request.customDomain,
          isActive: request.isActive,
          branding: request.branding ? (({ ...existingPortal.branding, ...request.branding } as unknown) as Prisma.InputJsonValue) : undefined,
          features: request.features ? (({ ...existingPortal.features, ...request.features } as unknown) as Prisma.InputJsonValue) : undefined,
          customization: request.customization ? (({ ...existingPortal.customization, ...request.customization } as unknown) as Prisma.InputJsonValue) : undefined,
          seoSettings: request.seoSettings ? (({ ...existingPortal.seoSettings, ...request.seoSettings } as unknown) as Prisma.InputJsonValue) : undefined,
        },
      });

      // Emit portal updated event
      this.eventEmitter.emit('portal.updated', {
        tenantId,
        portalId: updatedPortal.id,
        userId,
        changes: request,
      });

      return this.mapToCustomerPortal(updatedPortal);
    } catch (error) {
      this.logger.error(`Failed to update customer portal: ${(error as Error).message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update customer portal');
    }
  }

  /**
   * Get customer portal
   */
  async getPortal(tenantId: string): Promise<CustomerPortal | null> {
    try {
      const portal = await this.databaseService.customerPortal.findUnique({
        where: { tenantId },
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

      return portal ? this.mapToCustomerPortal(portal) : null;
    } catch (error) {
      this.logger.error(`Failed to get customer portal: ${(error as Error).message}`);
      throw new BadRequestException('Failed to get customer portal');
    }
  }

  /**
   * Delete customer portal
   */
  async deletePortal(tenantId: string, userId: string): Promise<void> {
    try {
      const portal = await this.databaseService.customerPortal.findUnique({
        where: { tenantId },
      });

      if (!portal) {
        throw new NotFoundException('Customer portal not found');
      }

      await this.databaseService.customerPortal.delete({
        where: { tenantId },
      });

      // Emit portal deleted event
      this.eventEmitter.emit('portal.deleted', {
        tenantId,
        portalId: portal.id,
        userId,
        subdomain: portal.subdomain,
      });

      this.logger.log(`Customer portal deleted: ${portal.id} by ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to delete customer portal: ${(error as Error).message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to delete customer portal');
    }
  }

  /**
   * Publish customer portal
   */
  async publishPortal(
    tenantId: string,
    request: PublishPortalRequest,
    userId: string
  ): Promise<{ success: boolean; url: string; integrationCode?: string }> {
    try {
      this.logger.log(`Publishing customer portal for tenant: ${tenantId}`);

      const portal = await this.databaseService.customerPortal.findUnique({
        where: { tenantId },
        include: {
          pages: { where: { isActive: true } },
          themes: { where: { isActive: true } },
        },
      });

      if (!portal) {
        throw new NotFoundException('Customer portal not found');
      }

      // Validate portal before publishing
      await this.validatePortalForPublishing(portal);

      // Generate integration code if requested
      let integrationCode: string | undefined;
      if (request.generateIntegrationCode) {
        integrationCode = this.generateIntegrationCode(portal);
      }

      // Update portal as published
      const publishedPortal = await this.databaseService.customerPortal.update({
        where: { tenantId },
        data: {
          isPublished: true,
          publishedAt: new Date(),
          lastPublishedAt: new Date(),
          integrationCode,
        },
      });

      // Deploy portal to CDN/hosting service
      const deploymentUrl = await this.deployPortal(publishedPortal);

      // Emit portal published event
      this.eventEmitter.emit('portal.published', {
        tenantId,
        portalId: portal.id,
        userId,
        url: deploymentUrl,
        integrationCode,
      });

      return {
        success: true,
        url: deploymentUrl,
        integrationCode,
      };
    } catch (error) {
      this.logger.error(`Failed to publish customer portal: ${(error as Error).message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to publish customer portal');
    }
  }

  /**
   * Generate portal preview
   */
  async generatePreview(tenantId: string): Promise<PortalPreview> {
    try {
      const portal = await this.databaseService.customerPortal.findUnique({
        where: { tenantId },
        include: {
          pages: { where: { isActive: true } },
          themes: { where: { isActive: true } },
        },
      });

      if (!portal) {
        throw new NotFoundException('Customer portal not found');
      }

      // Generate preview HTML, CSS, and JS
      const html = this.generatePortalHTML(portal);
      const css = this.generatePortalCSS(portal);
      const js = this.generatePortalJS(portal);

      // Extract assets
      const assets = this.extractPortalAssets(portal);

      // Generate preview URL
      const previewUrl = `${this.configService.get('PORTAL_PREVIEW_URL')}/${portal.subdomain}`;

      return {
        url: previewUrl,
        html,
        css,
        js,
        assets,
      };
    } catch (error) {
      this.logger.error(`Failed to generate portal preview: ${(error as Error).message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to generate portal preview');
    }
  }

  /**
   * Create custom domain
   */
  async createCustomDomain(
    tenantId: string,
    request: CreateCustomDomainRequest,
    userId: string
  ): Promise<CustomDomain> {
    try {
      this.logger.log(`Creating custom domain: ${request.domain} for tenant: ${tenantId}`);

      const portal = await this.databaseService.customerPortal.findUnique({
        where: { tenantId },
      });

      if (!portal) {
        throw new NotFoundException('Customer portal not found');
      }

      // Validate domain
      this.validateCustomDomain(request.domain);

      // Check if domain already exists
      const existingDomain = await this.databaseService.customDomain.findUnique({
        where: { domain: request.domain },
      });

      if (existingDomain) {
        throw new ConflictException('Domain already exists');
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Generate DNS records
      const dnsRecords = this.generateDNSRecords(request.domain, portal.subdomain);

      const customDomain = await this.databaseService.customDomain.create({
        data: {
          tenantId,
          portalId: portal.id,
          domain: request.domain,
          verificationToken,
          dnsRecords,
        },
      });

      // Start domain verification if requested
      if (request.autoVerify) {
        await this.verifyCustomDomain(customDomain.id);
      }

      // Emit custom domain created event
      this.eventEmitter.emit('custom.domain.created', {
        tenantId,
        domainId: customDomain.id,
        domain: request.domain,
        userId,
      });

      return this.mapToCustomDomain(customDomain);
    } catch (error) {
      this.logger.error(`Failed to create custom domain: ${(error as Error).message}`);
      if (error instanceof NotFoundException || error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create custom domain');
    }
  }

  /**
   * Verify custom domain
   */
  async verifyCustomDomain(domainId: string): Promise<CustomDomain> {
    try {
      const domain = await this.databaseService.customDomain.findUnique({
        where: { id: domainId },
      });

      if (!domain) {
        throw new NotFoundException('Custom domain not found');
      }

      // Check DNS records
      const dnsVerified = await this.checkDNSRecords(domain.domain, domain.dnsRecords as DNSRecord[]);

      let updatedDomain;
      if (dnsVerified) {
        // Setup SSL certificate
        const sslCertificate = await this.setupSSLCertificate(domain.domain);

        updatedDomain = await this.databaseService.customDomain.update({
          where: { id: domainId },
          data: {
            status: 'active',
            sslStatus: sslCertificate ? 'active' : 'pending',
            sslCertificate,
            verifiedAt: new Date(),
            lastCheckedAt: new Date(),
          },
        });

        // Emit domain verified event
        this.eventEmitter.emit('custom.domain.verified', {
          tenantId: domain.tenantId,
          domainId,
          domain: domain.domain,
        });
      } else {
        updatedDomain = await this.databaseService.customDomain.update({
          where: { id: domainId },
          data: {
            status: 'failed',
            errorMessage: 'DNS records not properly configured',
            lastCheckedAt: new Date(),
          },
        });
      }

      return this.mapToCustomDomain(updatedDomain);
    } catch (error) {
      this.logger.error(`Failed to verify custom domain: ${(error as Error).message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to verify custom domain');
    }
  }

  /**
   * Create portal page
   */
  async createPortalPage(
    tenantId: string,
    request: CreatePortalPageRequest,
    userId: string
  ): Promise<CustomerPortalPage> {
    try {
      const portal = await this.databaseService.customerPortal.findUnique({
        where: { tenantId },
      });

      if (!portal) {
        throw new NotFoundException('Customer portal not found');
      }

      // Validate slug uniqueness
      const existingPage = await this.databaseService.customerPortalPage.findFirst({
        where: {
          portalId: portal.id,
          slug: request.slug,
        },
      });

      if (existingPage) {
        throw new ConflictException('Page with this slug already exists');
      }

      const page = await this.databaseService.customerPortalPage.create({
        data: {
          portalId: portal.id,
          name: request.name,
          slug: request.slug,
          title: request.title,
          content: request.content,
          pageType: request.pageType,
          seoTitle: request.seoTitle,
          seoDescription: request.seoDescription,
          customCss: request.customCss,
          customJs: request.customJs,
        },
      });

      // Emit page created event
      this.eventEmitter.emit('portal.page.created', {
        tenantId,
        portalId: portal.id,
        pageId: page.id,
        userId,
      });

      return this.mapToCustomerPortalPage(page);
    } catch (error) {
      this.logger.error(`Failed to create portal page: ${(error as Error).message}`);
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create portal page');
    }
  }

  /**
   * Update portal page
   */
  async updatePortalPage(
    tenantId: string,
    pageId: string,
    request: UpdatePortalPageRequest,
    userId: string
  ): Promise<CustomerPortalPage> {
    try {
      const portal = await this.databaseService.customerPortal.findUnique({
        where: { tenantId },
      });

      if (!portal) {
        throw new NotFoundException('Customer portal not found');
      }

      const existingPage = await this.databaseService.customerPortalPage.findFirst({
        where: {
          id: pageId,
          portalId: portal.id,
        },
      });

      if (!existingPage) {
        throw new NotFoundException('Portal page not found');
      }

      // Validate slug uniqueness if changed
      if (request.slug && request.slug !== existingPage.slug) {
        const duplicatePage = await this.databaseService.customerPortalPage.findFirst({
          where: {
            portalId: portal.id,
            slug: request.slug,
            id: { not: pageId },
          },
        });

        if (duplicatePage) {
          throw new ConflictException('Page with this slug already exists');
        }
      }

      const updatedPage = await this.databaseService.customerPortalPage.update({
        where: { id: pageId },
        data: {
          name: request.name,
          slug: request.slug,
          title: request.title,
          content: request.content,
          isActive: request.isActive,
          seoTitle: request.seoTitle,
          seoDescription: request.seoDescription,
          customCss: request.customCss,
          customJs: request.customJs,
        },
      });

      // Emit page updated event
      this.eventEmitter.emit('portal.page.updated', {
        tenantId,
        portalId: portal.id,
        pageId,
        userId,
        changes: request,
      });

      return this.mapToCustomerPortalPage(updatedPage);
    } catch (error) {
      this.logger.error(`Failed to update portal page: ${(error as Error).message}`);
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to update portal page');
    }
  }

  /**
   * Create portal theme
   */
  async createPortalTheme(
    tenantId: string,
    request: CreatePortalThemeRequest,
    userId: string
  ): Promise<CustomerPortalTheme> {
    try {
      const portal = await this.databaseService.customerPortal.findUnique({
        where: { tenantId },
      });

      if (!portal) {
        throw new NotFoundException('Customer portal not found');
      }

      // Check if theme name already exists
      const existingTheme = await this.databaseService.customerPortalTheme.findFirst({
        where: {
          portalId: portal.id,
          name: request.name,
        },
      });

      if (existingTheme) {
        throw new ConflictException('Theme with this name already exists');
      }

      const theme = await this.databaseService.customerPortalTheme.create({
        data: {
          portalId: portal.id,
          name: request.name,
          description: request.description,
          colors: request.colors,
          typography: request.typography || {},
          layout: request.layout || {},
          components: request.components || {},
          customCss: request.customCss,
        },
      });

      // Emit theme created event
      this.eventEmitter.emit('portal.theme.created', {
        tenantId,
        portalId: portal.id,
        themeId: theme.id,
        userId,
      });

      return this.mapToCustomerPortalTheme(theme);
    } catch (error) {
      this.logger.error(`Failed to create portal theme: ${(error as Error).message}`);
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Failed to create portal theme');
    }
  }

  /**
   * Activate portal theme
   */
  async activatePortalTheme(
    tenantId: string,
    themeId: string,
    userId: string
  ): Promise<CustomerPortalTheme> {
    try {
      const portal = await this.databaseService.customerPortal.findUnique({
        where: { tenantId },
      });

      if (!portal) {
        throw new NotFoundException('Customer portal not found');
      }

      const theme = await this.databaseService.customerPortalTheme.findFirst({
        where: {
          id: themeId,
          portalId: portal.id,
        },
      });

      if (!theme) {
        throw new NotFoundException('Portal theme not found');
      }

      // Deactivate all other themes
      await this.databaseService.customerPortalTheme.updateMany({
        where: {
          portalId: portal.id,
          isActive: true,
        },
        data: { isActive: false },
      });

      // Activate the selected theme
      const activatedTheme = await this.databaseService.customerPortalTheme.update({
        where: { id: themeId },
        data: { isActive: true },
      });

      // Emit theme activated event
      this.eventEmitter.emit('portal.theme.activated', {
        tenantId,
        portalId: portal.id,
        themeId,
        userId,
      });

      return this.mapToCustomerPortalTheme(activatedTheme);
    } catch (error) {
      this.logger.error(`Failed to activate portal theme: ${(error as Error).message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to activate portal theme');
    }
  }

  /**
   * Get portal metrics
   */
  async getPortalMetrics(
    tenantId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      period?: 'day' | 'week' | 'month';
    } = {}
  ): Promise<PortalMetrics> {
    try {
      const portal = await this.databaseService.customerPortal.findUnique({
        where: { tenantId },
      });

      if (!portal) {
        throw new NotFoundException('Customer portal not found');
      }

      const { startDate, endDate, period = 'week' } = options;
      const dateRange = this.getDateRange(startDate, endDate, period);

      // Get analytics data
      const analytics = await this.databaseService.customerPortalAnalytics.findMany({
        where: {
          portalId: portal.id,
          date: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        orderBy: { date: 'asc' },
      });

      // Calculate metrics
      const overview = this.calculateOverviewMetrics(analytics);
      const trends = this.calculateTrendMetrics(analytics, period);
      const topPages = this.calculateTopPages(analytics);
      const topSearches = this.calculateTopSearches(analytics);
      const devices = this.calculateDeviceMetrics(analytics);
      const browsers = this.calculateBrowserMetrics(analytics);
      const countries = this.calculateCountryMetrics(analytics);
      const referrers = this.calculateReferrerMetrics(analytics);

      return {
        overview,
        trends,
        topPages,
        topSearches,
        devices,
        browsers,
        countries,
        referrers,
      };
    } catch (error) {
      this.logger.error(`Failed to get portal metrics: ${(error as Error).message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to get portal metrics');
    }
  }

  /**
   * Get portal templates
   */
  async getPortalTemplates(
    category?: string,
    isPremium?: boolean
  ): Promise<PortalTemplate[]> {
    try {
      // This would typically fetch from a templates database or API
      // For now, return predefined templates
      const templates = this.getPredefinedTemplates();

      let filteredTemplates = templates;

      if (category) {
        filteredTemplates = filteredTemplates.filter(t => t.category === category);
      }

      if (isPremium !== undefined) {
        filteredTemplates = filteredTemplates.filter(t => t.isPremium === isPremium);
      }

      return filteredTemplates;
    } catch (error) {
      this.logger.error(`Failed to get portal templates: ${(error as Error).message}`);
      throw new BadRequestException('Failed to get portal templates');
    }
  }

  // Private helper methods

  private async validateSubdomain(subdomain: string): Promise<void> {
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    const reservedSubdomains = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop'];

    if (!subdomainRegex.test(subdomain)) {
      throw new BadRequestException('Invalid subdomain format');
    }

    if (subdomain.length < 3 || subdomain.length > 63) {
      throw new BadRequestException('Subdomain must be between 3 and 63 characters');
    }

    if (reservedSubdomains.includes(subdomain)) {
      throw new BadRequestException('Subdomain is reserved');
    }

    // Check if subdomain is already taken
    const existingPortal = await this.databaseService.customerPortal.findUnique({
      where: { subdomain },
    });

    if (existingPortal) {
      throw new ConflictException('Subdomain is already taken');
    }
  }

  private validateCustomDomain(domain: string): void {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;

    if (!domainRegex.test(domain)) {
      throw new BadRequestException('Invalid domain format');
    }

    if (domain.length > 253) {
      throw new BadRequestException('Domain name too long');
    }
  }

  private getDefaultBranding(): PortalBranding {
    return {
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
        border: '#E2E8F0',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      typography: {
        fontFamily: {
          primary: 'Inter, system-ui, sans-serif',
          secondary: 'Georgia, serif',
        },
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        lineHeight: {
          tight: 1.25,
          normal: 1.5,
          relaxed: 1.75,
        },
      },
      spacing: {
        xs: '0.5rem',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
        '2xl': '4rem',
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
    };
  }

  private getDefaultFeatures(): PortalFeatures {
    return {
      ticketSubmission: {
        enabled: true,
        requireAuth: false,
        allowAttachments: true,
        maxAttachmentSize: 10,
        allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
        customFields: [],
        autoAssignment: true,
        emailNotifications: true,
      },
      knowledgeBase: {
        enabled: true,
        searchEnabled: true,
        categoriesEnabled: true,
        ratingsEnabled: true,
        commentsEnabled: false,
        suggestionsEnabled: true,
      },
      liveChat: {
        enabled: false,
        position: 'bottom-right',
        theme: 'auto',
        welcomeMessage: 'Hello! How can we help you today?',
        offlineMessage: 'We are currently offline. Please leave a message.',
        businessHoursOnly: false,
      },
      ticketStatus: {
        enabled: true,
        allowGuestAccess: true,
        showProgress: true,
        showHistory: true,
        emailUpdates: true,
      },
      userAccount: {
        enabled: false,
        registrationEnabled: false,
        socialLogin: {
          google: false,
          microsoft: false,
          github: false,
        },
        profileFields: [],
      },
      feedback: {
        enabled: true,
        showOnAllPages: false,
        collectRatings: true,
        collectComments: true,
        emailNotifications: true,
      },
    };
  }

  private getDefaultCustomization(): PortalCustomization {
    return {
      layout: {
        headerStyle: 'standard',
        navigationStyle: 'horizontal',
        footerStyle: 'standard',
        containerWidth: 'standard',
      },
      homepage: {
        heroSection: {
          enabled: true,
          title: 'How can we help you?',
          subtitle: 'Find answers to your questions or get in touch with our support team.',
          ctaButton: {
            text: 'Submit a Ticket',
            link: '/submit-ticket',
            style: 'primary',
          },
        },
        featuredSections: {
          quickActions: true,
          popularArticles: true,
          recentTickets: false,
          announcements: false,
        },
      },
      navigation: {
        items: [
          {
            id: 'home',
            label: 'Home',
            url: '/',
            type: 'internal',
            sortOrder: 1,
            isActive: true,
          },
          {
            id: 'knowledge-base',
            label: 'Knowledge Base',
            url: '/knowledge-base',
            type: 'internal',
            sortOrder: 2,
            isActive: true,
          },
          {
            id: 'submit-ticket',
            label: 'Submit Ticket',
            url: '/submit-ticket',
            type: 'internal',
            sortOrder: 3,
            isActive: true,
          },
          {
            id: 'contact',
            label: 'Contact',
            url: '/contact',
            type: 'internal',
            sortOrder: 4,
            isActive: true,
          },
        ],
        showSearch: true,
        showLanguageSelector: false,
        showUserMenu: false,
      },
      footer: {
        showCompanyInfo: true,
        showSocialLinks: false,
        showLegalLinks: true,
        customLinks: [],
        copyrightText: '© 2024 Your Company. All rights reserved.',
      },
    };
  }

  private getDefaultSEOSettings(portalName: string): PortalSEOSettings {
    return {
      title: `${portalName} - Customer Support`,
      description: `Get help and support from ${portalName}. Submit tickets, browse our knowledge base, and find answers to your questions.`,
      keywords: ['support', 'help', 'customer service', 'tickets', 'knowledge base'],
      twitterCard: 'summary_large_image',
      robots: {
        index: true,
        follow: true,
      },
      structuredData: {
        organization: true,
        website: true,
        breadcrumbs: true,
      },
      analytics: {
        customScripts: [],
      },
    };
  }

  private async createDefaultPages(portalId: string): Promise<void> {
    const defaultPages = [
      {
        name: 'Home',
        slug: 'home',
        title: 'Welcome to Our Support Portal',
        content: '<h1>Welcome to Our Support Portal</h1><p>Find answers to your questions or get in touch with our support team.</p>',
        pageType: 'home' as const,
        isSystem: true,
        sortOrder: 1,
      },
      {
        name: 'Contact',
        slug: 'contact',
        title: 'Contact Us',
        content: '<h1>Contact Us</h1><p>Get in touch with our support team.</p>',
        pageType: 'contact' as const,
        isSystem: true,
        sortOrder: 2,
      },
      {
        name: 'Submit Ticket',
        slug: 'submit-ticket',
        title: 'Submit a Support Ticket',
        content: '<h1>Submit a Support Ticket</h1><p>Describe your issue and we\'ll get back to you as soon as possible.</p>',
        pageType: 'ticket_submit' as const,
        isSystem: true,
        sortOrder: 3,
      },
    ];

    for (const page of defaultPages) {
      await this.databaseService.customerPortalPage.create({
        data: {
          portalId,
          ...page,
        },
      });
    }
  }

  private async createDefaultTheme(portalId: string): Promise<void> {
    const defaultTheme = {
      name: 'Default',
      description: 'Default portal theme',
      isActive: true,
      isSystem: true,
      colors: {
        primary: '#3B82F6',
        secondary: '#64748B',
        accent: '#F59E0B',
        background: '#FFFFFF',
        surface: '#F8FAFC',
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: {
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
        },
      },
      layout: {
        containerWidth: '1200px',
        headerHeight: '64px',
        sidebarWidth: '256px',
      },
      components: {
        button: {
          borderRadius: '0.375rem',
          padding: '0.5rem 1rem',
        },
        card: {
          borderRadius: '0.5rem',
          shadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    };

    await this.databaseService.customerPortalTheme.create({
      data: {
        portalId,
        ...defaultTheme,
      },
    });
  }

  private async validatePortalForPublishing(portal: any): Promise<void> {
    // Check if portal has required pages
    const requiredPages = ['home', 'contact'];
    const existingPages = portal.pages.map((p: any) => p.pageType);
    
    for (const requiredPage of requiredPages) {
      if (!existingPages.includes(requiredPage)) {
        throw new BadRequestException(`Missing required page: ${requiredPage}`);
      }
    }

    // Check if portal has active theme
    if (!portal.themes.some((t: any) => t.isActive)) {
      throw new BadRequestException('Portal must have an active theme');
    }

    // Validate branding
    const branding = portal.branding as PortalBranding;
    if (!branding.colors.primary) {
      throw new BadRequestException('Portal must have a primary color defined');
    }
  }

  private generateIntegrationCode(portal: any): string {
    const baseUrl = this.configService.get('PORTAL_BASE_URL');
    const portalUrl = portal.customDomain || `${portal.subdomain}.${baseUrl}`;

    return `
<!-- Glavito Customer Portal Integration -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${portalUrl}/widget.js';
    script.async = true;
    script.onload = function() {
      GlavitoPortal.init({
        portalId: '${portal.id}',
        tenantId: '${portal.tenantId}',
        subdomain: '${portal.subdomain}',
        customDomain: '${portal.customDomain || ''}',
        features: ${JSON.stringify(portal.features)},
        branding: ${JSON.stringify(portal.branding)}
      });
    };
    document.head.appendChild(script);
  })();
</script>
<!-- End Glavito Customer Portal Integration -->
    `.trim();
  }

  private async deployPortal(portal: any): Promise<string> {
    // This would integrate with your deployment service (Vercel, Netlify, AWS, etc.)
    // For now, return a mock URL
    const baseUrl = this.configService.get('PORTAL_BASE_URL');
    return portal.customDomain || `https://${portal.subdomain}.${baseUrl}`;
  }

  private generatePortalHTML(portal: any): string {
    // Generate HTML based on portal configuration
    // This is a simplified version - in production, you'd use a proper template engine
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${portal.seoSettings.title}</title>
  <meta name="description" content="${portal.seoSettings.description}">
</head>
<body>
  <div id="portal-root">
    <header>
      <h1>${portal.name}</h1>
    </header>
    <main>
      <p>${portal.description || 'Welcome to our support portal'}</p>
    </main>
  </div>
</body>
</html>
    `.trim();
  }

  private generatePortalCSS(portal: any): string {
    const branding = portal.branding as PortalBranding;
    return `
:root {
  --primary-color: ${branding.colors.primary};
  --secondary-color: ${branding.colors.secondary};
  --background-color: ${branding.colors.background};
  --text-color: ${branding.colors.text.primary};
  --font-family: ${branding.typography.fontFamily.primary};
}

body {
  font-family: var(--font-family);
  background-color: var(--background-color);
  color: var(--text-color);
  margin: 0;
  padding: 0;
}

header {
  background-color: var(--primary-color);
  color: white;
  padding: 1rem;
}

main {
  padding: 2rem;
}
    `.trim();
  }

  private generatePortalJS(portal: any): string {
    return `
// Portal JavaScript
(function() {
  console.log('Portal loaded:', '${portal.name}');
  
  // Initialize portal features
  if (window.GlavitoPortal) {
    window.GlavitoPortal.init({
      portalId: '${portal.id}',
      features: ${JSON.stringify(portal.features)}
    });
  }
})();
    `.trim();
  }

  private extractPortalAssets(portal: any): { images: string[]; fonts: string[]; icons: string[] } {
    const assets = {
      images: [],
      fonts: [],
      icons: [],
    };

    // Extract logo
    if (portal.branding.logo?.url) {
      assets.images.push(portal.branding.logo.url);
    }

    // Extract favicon
    if (portal.branding.favicon?.url) {
      assets.icons.push(portal.branding.favicon.url);
    }

    // Extract fonts from typography
    const fontFamily = portal.branding.typography.fontFamily.primary;
    if (fontFamily && fontFamily.includes('http')) {
      assets.fonts.push(fontFamily);
    }

    return assets;
  }

  private generateDNSRecords(domain: string, subdomain: string): DNSRecord[] {
    const baseUrl = this.configService.get('PORTAL_BASE_URL');
    
    return [
      {
        type: 'CNAME',
        name: domain,
        value: `${subdomain}.${baseUrl}`,
        ttl: 300,
      },
      {
        type: 'TXT',
        name: `_glavito-verification.${domain}`,
        value: `glavito-verification=${crypto.randomBytes(16).toString('hex')}`,
        ttl: 300,
      },
    ];
  }

  private async checkDNSRecords(domain: string, expectedRecords: DNSRecord[]): Promise<boolean> {
    // This would use a DNS lookup service to verify records
    // For now, return true as a placeholder
    return true;
  }

  private async setupSSLCertificate(domain: string): Promise<any> {
    // This would integrate with Let's Encrypt or another SSL provider
    // For now, return a mock certificate
    return {
      issuer: 'Let\'s Encrypt',
      subject: domain,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      fingerprint: crypto.randomBytes(20).toString('hex'),
      serialNumber: crypto.randomBytes(16).toString('hex'),
    };
  }

  private getDateRange(startDate?: Date, endDate?: Date, period: any = 'week') {
    const now = new Date();
    const end = endDate || now;
    
    let start: Date;
    switch (period) {
      case 'day':
        start = startDate || new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // week
        start = startDate || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  private calculateOverviewMetrics(analytics: any[]) {
    return analytics.reduce(
      (acc, day) => ({
        totalViews: acc.totalViews + day.pageViews,
        uniqueVisitors: acc.uniqueVisitors + day.uniqueVisitors,
        ticketsSubmitted: acc.ticketsSubmitted + day.ticketsSubmitted,
        avgSessionDuration: (acc.avgSessionDuration + (day.avgSessionDuration || 0)) / 2,
        bounceRate: (acc.bounceRate + (day.bounceRate || 0)) / 2,
      }),
      {
        totalViews: 0,
        uniqueVisitors: 0,
        ticketsSubmitted: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
      }
    );
  }

  private calculateTrendMetrics(analytics: any[], period: string) {
    return analytics.map(day => ({
      period: day.date.toISOString().split('T')[0],
      views: day.pageViews,
      visitors: day.uniqueVisitors,
      tickets: day.ticketsSubmitted,
    }));
  }

  private calculateTopPages(analytics: any[]) {
    const pageMap = new Map<string, number>();
    let totalViews = 0;

    analytics.forEach(day => {
      totalViews += day.pageViews;
      (day.topPages as any[] || []).forEach(page => {
        pageMap.set(page.page, (pageMap.get(page.page) || 0) + page.views);
      });
    });

    return Array.from(pageMap.entries())
      .map(([page, views]) => ({
        page,
        views,
        percentage: totalViews > 0 ? (views / totalViews) * 100 : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }

  private calculateTopSearches(analytics: any[]) {
    const searchMap = new Map<string, number>();
    let totalSearches = 0;

    analytics.forEach(day => {
      totalSearches += day.searchQueries;
      (day.topSearches as any[] || []).forEach(search => {
        searchMap.set(search.query, (searchMap.get(search.query) || 0) + search.count);
      });
    });

    return Array.from(searchMap.entries())
      .map(([query, count]) => ({
        query,
        count,
        percentage: totalSearches > 0 ? (count / totalSearches) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculateDeviceMetrics(analytics: any[]) {
    const deviceMap = new Map<string, number>();
    let totalVisitors = 0;

    analytics.forEach(day => {
      totalVisitors += day.uniqueVisitors;
      Object.entries((day.devices as Record<string, number>) || {}).forEach(([device, count]) => {
        deviceMap.set(device, (deviceMap.get(device) || 0) + count);
      });
    });

    return Array.from(deviceMap.entries())
      .map(([device, count]) => ({
        device,
        percentage: totalVisitors > 0 ? (count / totalVisitors) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }

  private calculateBrowserMetrics(analytics: any[]) {
    const browserMap = new Map<string, number>();
    let totalVisitors = 0;

    analytics.forEach(day => {
      totalVisitors += day.uniqueVisitors;
      Object.entries((day.browsers as Record<string, number>) || {}).forEach(([browser, count]) => {
        browserMap.set(browser, (browserMap.get(browser) || 0) + count);
      });
    });

    return Array.from(browserMap.entries())
      .map(([browser, count]) => ({
        browser,
        percentage: totalVisitors > 0 ? (count / totalVisitors) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }

  private calculateCountryMetrics(analytics: any[]) {
    const countryMap = new Map<string, number>();
    let totalVisitors = 0;

    analytics.forEach(day => {
      totalVisitors += day.uniqueVisitors;
      Object.entries((day.countries as Record<string, number>) || {}).forEach(([country, count]) => {
        countryMap.set(country, (countryMap.get(country) || 0) + count);
      });
    });

    return Array.from(countryMap.entries())
      .map(([country, count]) => ({
        country,
        percentage: totalVisitors > 0 ? (count / totalVisitors) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }

  private calculateReferrerMetrics(analytics: any[]) {
    const referrerMap = new Map<string, number>();
    let totalVisits = 0;

    analytics.forEach(day => {
      (day.referrers as any[]).forEach(referrer => {
        totalVisits += referrer.visits;
        referrerMap.set(referrer.source, (referrerMap.get(referrer.source) || 0) + referrer.visits);
      });
    });

    return Array.from(referrerMap.entries())
      .map(([source, visits]) => ({
        source,
        visits,
        percentage: totalVisits > 0 ? (visits / totalVisits) * 100 : 0,
      }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);
  }

  private getPredefinedTemplates(): PortalTemplate[] {
    // Return predefined portal templates
    // This would typically come from a database or external service
    return [
      {
        id: 'modern-business',
        name: 'Modern Business',
        description: 'Clean and professional template for business support portals',
        category: 'business',
        previewImage: '/templates/modern-business.jpg',
        branding: this.getDefaultBranding(),
        features: this.getDefaultFeatures(),
        customization: this.getDefaultCustomization(),
        pages: [],
        isSystem: true,
        isPremium: false,
        metadata: {},
      },
      // Add more templates...
    ];
  }

  private mapToCustomerPortal(portal: any): CustomerPortal {
    return {
      id: portal.id,
      tenantId: portal.tenantId,
      name: portal.name,
      description: portal.description,
      subdomain: portal.subdomain,
      customDomain: portal.customDomain,
      isActive: portal.isActive,
      isPublished: portal.isPublished,
      branding: portal.branding,
      features: portal.features,
      customization: portal.customization,
      seoSettings: portal.seoSettings,
      integrationCode: portal.integrationCode,
      publishedAt: portal.publishedAt,
      lastPublishedAt: portal.lastPublishedAt,
      metadata: portal.metadata,
      createdAt: portal.createdAt,
      updatedAt: portal.updatedAt,
    };
  }

  private mapToCustomerPortalPage(page: any): CustomerPortalPage {
    return {
      id: page.id,
      portalId: page.portalId,
      name: page.name,
      slug: page.slug,
      title: page.title,
      content: page.content,
      pageType: page.pageType,
      isActive: page.isActive,
      isSystem: page.isSystem,
      sortOrder: page.sortOrder,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      customCss: page.customCss,
      customJs: page.customJs,
      metadata: page.metadata,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  }

  private mapToCustomerPortalTheme(theme: any): CustomerPortalTheme {
    return {
      id: theme.id,
      portalId: theme.portalId,
      name: theme.name,
      description: theme.description,
      isActive: theme.isActive,
      isSystem: theme.isSystem,
      colors: theme.colors,
      typography: theme.typography,
      layout: theme.layout,
      components: theme.components,
      customCss: theme.customCss,
      previewImage: theme.previewImage,
      metadata: theme.metadata,
      createdAt: theme.createdAt,
      updatedAt: theme.updatedAt,
    };
  }

  private mapToCustomDomain(domain: any): CustomDomain {
    return {
      id: domain.id,
      tenantId: domain.tenantId,
      portalId: domain.portalId,
      domain: domain.domain,
      status: domain.status,
      verificationToken: domain.verificationToken,
      dnsRecords: domain.dnsRecords,
      sslStatus: domain.sslStatus,
      sslCertificate: domain.sslCertificate,
      lastCheckedAt: domain.lastCheckedAt,
      verifiedAt: domain.verifiedAt,
      errorMessage: domain.errorMessage,
      metadata: domain.metadata,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}