import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import type { AuthTenant, AuthUser } from '@glavito/shared-auth';

export interface CreateTenantRequest {
  name: string;
  slug: string;
  subdomain: string;
  ownerId: string;
  settings?: Record<string, any>;
}

export interface UpdateTenantRequest {
  name?: string;
  slug?: string;
  subdomain?: string;
  settings?: Record<string, any>;
  status?: 'active' | 'suspended' | 'deleted';
}

export interface TenantMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'admin' | 'agent' | 'viewer';
  joinedAt: Date;
  lastActiveAt: Date;
}

export interface TenantSettings {
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customCSS?: string;
  };
  notifications?: {
    email: {
      newTicket: boolean;
      ticketAssigned: boolean;
      ticketClosed: boolean;
      mentions: boolean;
    };
    webhook?: {
      url: string;
      events: string[];
      secret: string;
    };
  };
  security?: {
    enforceSSO: boolean;
    allowedDomains: string[];
    sessionTimeout: number; // in minutes
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
  };
  integrations?: {
    slack?: {
      enabled: boolean;
      webhookUrl?: string;
      channel?: string;
    };
    discord?: {
      enabled: boolean;
      webhookUrl?: string;
    };
    jira?: {
      enabled: boolean;
      host?: string;
      email?: string;
      apiToken?: string;
    };
  };
}

@Injectable()
export class OrganizationService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createTenant(request: CreateTenantRequest): Promise<AuthTenant> {
    // Validate slug and subdomain uniqueness
    const existingSlug = await this.databaseService.tenant.findUnique({
      where: { slug: request.slug },
    });

    if (existingSlug) {
      throw new BadRequestException('Slug already exists');
    }

    const existingSubdomain = await this.databaseService.tenant.findUnique({
      where: { subdomain: request.subdomain },
    });

    if (existingSubdomain) {
      throw new BadRequestException('Subdomain already exists');
    }

    const tenant = await this.databaseService.tenant.create({
      data: {
        name: request.name,
        slug: request.slug,
        subdomain: request.subdomain,
        ownerId: request.ownerId,
        status: 'active',
        plan: 'starter',
        settings: request.settings || {},
      },
    });

    // Update user's tenant association
    await this.databaseService.user.update({
      where: { id: request.ownerId },
      data: { tenantId: tenant.id, role: 'owner' },
    });

    return tenant as AuthTenant;
  }

  async updateTenant(tenantId: string, request: UpdateTenantRequest): Promise<AuthTenant> {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Validate slug and subdomain if provided
    if (request.slug && request.slug !== tenant.slug) {
      const existingSlug = await this.databaseService.tenant.findUnique({
        where: { slug: request.slug },
      });

      if (existingSlug) {
        throw new BadRequestException('Slug already exists');
      }
    }

    if (request.subdomain && request.subdomain !== tenant.subdomain) {
      const existingSubdomain = await this.databaseService.tenant.findUnique({
        where: { subdomain: request.subdomain },
      });

      if (existingSubdomain) {
        throw new BadRequestException('Subdomain already exists');
      }
    }

    const updatedTenant = await this.databaseService.tenant.update({
      where: { id: tenantId },
      data: {
        ...(request.name && { name: request.name }),
        ...(request.slug && { slug: request.slug }),
        ...(request.subdomain && { subdomain: request.subdomain }),
        ...(request.settings && { settings: request.settings }),
        ...(request.status && { status: request.status }),
      },
    });

    return updatedTenant as AuthTenant;
  }

  async getTenantById(tenantId: string): Promise<AuthTenant> {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { id: tenantId },
      include: { owner: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant as AuthTenant;
  }

  async getTenantBySlug(slug: string): Promise<AuthTenant> {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { slug },
      include: { owner: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant as AuthTenant;
  }

  async getTenantBySubdomain(subdomain: string): Promise<AuthTenant> {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { subdomain },
      include: { owner: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant as AuthTenant;
  }

  async getTenantMembers(tenantId: string): Promise<TenantMember[]> {
    const users = await this.databaseService.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as 'owner' | 'admin' | 'agent' | 'viewer',
      joinedAt: user.createdAt,
      lastActiveAt: user.lastLoginAt || user.createdAt,
    }));
  }

  async addMemberToTenant(
    tenantId: string,
    userId: string,
    role: 'admin' | 'agent' | 'viewer',
  ): Promise<TenantMember> {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.tenantId && user.tenantId !== tenantId) {
      throw new BadRequestException('User already belongs to another tenant');
    }

    const updatedUser = await this.databaseService.user.update({
      where: { id: userId },
      data: {
        tenantId,
        role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role as 'owner' | 'admin' | 'agent' | 'viewer',
      joinedAt: updatedUser.createdAt,
      lastActiveAt: updatedUser.lastLoginAt || updatedUser.createdAt,
    };
  }

  async removeMemberFromTenant(tenantId: string, userId: string): Promise<void> {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.tenantId !== tenantId) {
      throw new BadRequestException('User does not belong to this tenant');
    }

    if (user.role === 'owner') {
      throw new BadRequestException('Cannot remove tenant owner');
    }

    await this.databaseService.user.update({
      where: { id: userId },
      data: {
        tenantId: null,
        role: 'agent',
      },
    });
  }

  async updateMemberRole(
    tenantId: string,
    userId: string,
    newRole: 'admin' | 'agent' | 'viewer',
  ): Promise<TenantMember> {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.tenantId !== tenantId) {
      throw new BadRequestException('User does not belong to this tenant');
    }

    if (user.role === 'owner') {
      throw new BadRequestException('Cannot change owner role');
    }

    const updatedUser = await this.databaseService.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role as 'owner' | 'admin' | 'agent' | 'viewer',
      joinedAt: updatedUser.createdAt,
      lastActiveAt: updatedUser.lastLoginAt || updatedUser.createdAt,
    };
  }

  async updateTenantSettings(
    tenantId: string,
    settings: Partial<TenantSettings>,
  ): Promise<AuthTenant> {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const updatedSettings = {
      ...tenant.settings,
      ...settings,
    };

    const updatedTenant = await this.databaseService.tenant.update({
      where: { id: tenantId },
      data: {
        settings: updatedSettings,
      },
    });

    return updatedTenant as AuthTenant;
  }

  async getTenantSettings(tenantId: string): Promise<TenantSettings> {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return (tenant.settings as TenantSettings) || {};
  }

  async validateTenantAccess(tenantId: string, userId: string): Promise<boolean> {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    return user.tenantId === tenantId;
  }

  async getTenantStats(tenantId: string): Promise<{
    memberCount: number;
    customerCount: number;
    ticketCount: number;
    channelCount: number;
  }> {
    const [memberCount, customerCount, ticketCount, channelCount] = await Promise.all([
      this.databaseService.user.count({ where: { tenantId } }),
      this.databaseService.customer.count({ where: { tenantId } }),
      this.databaseService.ticket.count({ where: { tenantId } }),
      this.databaseService.channel.count({ where: { tenantId } }),
    ]);

    return {
      memberCount,
      customerCount,
      ticketCount,
      channelCount,
    };
  }
}