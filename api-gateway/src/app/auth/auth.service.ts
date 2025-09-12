import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';
import { DatabaseService } from '@glavito/shared-database';
import type { 
  LoginRequest, 
  LoginResponse, 
  JwtPayload, 
  User, 
  Tenant, 
  RegisterRequest, 
  RegisterResponse,
  CreateInvitationRequest,
  AcceptInvitationRequest
} from '@glavito/shared-types';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async login(loginDto: LoginRequest): Promise<LoginResponse> {
    const { email, password, tenantId } = loginDto;

    // Find user by email and tenant
    const user = await this.databaseService.user.findFirst({
      where: {
        email,
        ...(tenantId && { tenantId }),
        status: 'active',
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password (guard against SSO users or bad data)
    const hash = typeof (user as any).passwordHash === 'string' ? (user as any).passwordHash : '';
    if (!hash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(password, hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.databaseService.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    } as const;

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    // Remove sensitive data
    const { passwordHash, ...userWithoutPassword } = user;
    const { tenant } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword as User,
      tenant: tenant as Tenant,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.databaseService.user.findUnique({
        where: { id: payload.sub },
        include: { tenant: true },
      });

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new access token
      const newPayload = {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      } as const;

      const accessToken = this.jwtService.sign(newPayload);

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    // In a production environment, you would typically blacklist the refresh token
    // For now, we'll just return a success message
    return { message: 'Logout successful' };
  }

  async validateUser(payload: JwtPayload) {
    const user = await this.databaseService.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Compute effective permissions (role-mapped + direct user permissions)
    const direct = await this.databaseService.userPermission.findMany({
      where: { userId: user.id },
      include: { permission: true },
    });

    const directPerms = (direct || [])
      .map((up: any) => up.permission?.name)
      .filter(Boolean) as string[];

    const roleMap = ((user as any)?.tenant as any)?.settings?.roles || {};
    const roleName = (user as any).role as string;
    let rolePerms = (roleMap?.[roleName]?.permissions || []) as string[];

    // Fallback default permissions if tenant roles mapping is not configured
    if (!rolePerms || rolePerms.length === 0) {
      if (roleName === 'admin') {
        rolePerms = [
          'tickets.read',
          'tickets.create',
          'tickets.update',
          'tickets.assign',
          'tickets.resolve',
          'tickets.delete',
          'tickets.export',
          // Call permissions
          'calls.start',
          'calls.end',
          'calls.read',
          // Conversation permissions
          'conversations.create',
          'conversations.read',
          'conversations.update',
          'conversations.delete',
          // Customer permissions
          'customers.read',
          'customers.create',
          'customers.update',
          'customers.delete',
          // CRM permissions
          'crm.leads.create',
          'crm.leads.read',
          'crm.leads.update',
          'crm.leads.delete',
          'crm.deals.create',
          'crm.deals.read',
          'crm.deals.update',
          'crm.deals.delete',
          // Custom fields & objects management
          'crm.custom_fields.read',
          'crm.custom_fields.create',
          'crm.custom_fields.update',
          'crm.custom_fields.delete',
          'crm.custom_objects.read',
          'crm.custom_objects.create',
          'crm.custom_objects.update',
          'crm.custom_objects.delete',
          // Marketplace management defaults
          'marketplace.read',
          'marketplace.manage',
        ];
      } else if (roleName === 'agent') {
        rolePerms = [
          'tickets.read',
          'tickets.update',
          'tickets.assign',
          'tickets.resolve',
          'tickets.create',
          // Call permissions
          'calls.start',
          'calls.end',
          'calls.read',
          // Conversation permissions
          'conversations.create',
          'conversations.read',
          'conversations.update',
          // Customer permissions
          'customers.read',
          'customers.create',
          'customers.update',
          // CRM permissions (limited for agents)
          'crm.leads.read',
          'crm.leads.update',
          'crm.deals.read',
          'crm.deals.update',
          // Custom objects read for agents
          'crm.custom_objects.read',
          // Marketplace read-only defaults
          'marketplace.read',
        ];
      }
    }

    const effectivePermissions = Array.from(new Set([...(directPerms || []), ...(rolePerms || [])]));

    // Attach permissions to the user object that Passport stores on request.user
    return { ...user, permissions: effectivePermissions } as any;
  }

  async register(registerDto: RegisterRequest): Promise<RegisterResponse> {
    const { email, password, firstName, lastName, tenantId } = registerDto;

    // Check if user already exists
    const existingUser = await this.databaseService.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create tenant if not provided
    let actualTenantId = tenantId;
    if (!tenantId) {
      const tenant = await this.createTenantForUser(email);
      actualTenantId = tenant.id;
    }

    // Create user (first user of a new tenant becomes admin)
    const user = await this.databaseService.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: tenantId ? 'agent' : 'admin',
        status: 'active',
        emailVerified: false,
        tenantId: actualTenantId!,
      },
      include: {
        tenant: true,
      },
    });

    // If this user created the tenant, set them as the owner
    if (!tenantId) {
      try {
        await this.databaseService.tenant.update({
          where: { id: actualTenantId },
          data: { ownerId: user.id },
        });
      } catch (err) {
        // Non-fatal; ownership can be set later by admins
      }
    }

    // Generate verification token
    const verificationToken = this.jwtService.sign(
      { sub: user.id, type: 'verify' },
      {
        secret: this.configService.get('JWT_VERIFY_SECRET'),
        expiresIn: this.configService.get('JWT_VERIFY_EXPIRES_IN', '24h'),
      },
    );

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, verificationToken);

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    // Remove sensitive data
      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        accessToken,
        refreshToken,
        user: userWithoutPassword as User,
        tenant: user.tenant as Tenant,
        requiresEmailVerification: true,
      } as any;
  }

  private async createTenantForUser(email: string): Promise<Tenant> {
    const tenantName = email.split('@')[0];
    const base = tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/^-+|-+$/g, '') || 'tenant';

    // Ensure subdomain uniqueness
    let candidate = base;
    let tries = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.databaseService.tenant.findUnique({ where: { subdomain: candidate } }).catch(() => null);
      if (!existing) break;
      tries += 1;
      const suffix = Math.random().toString(36).slice(2, 6);
      candidate = `${base}-${suffix}`;
      if (tries > 5) break; // avoid long loops in rare cases
    }

    const created = await this.databaseService.tenant.create({
      data: {
        name: `${tenantName}'s Organization`,
        slug: base,
        subdomain: candidate,
        status: 'active',
      },
    });
    return (created as unknown) as Tenant;
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_VERIFY_SECRET'),
      });

      if (payload.type !== 'verify') {
        throw new BadRequestException('Invalid verification token');
      }

      const user = await this.databaseService.user.update({
        where: { id: payload.sub },
        data: { emailVerified: true },
        include: { tenant: true },
      });

      // Generate new tokens
      const accessToken = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      });

      const refreshToken = this.jwtService.sign(
        { sub: user.id, type: 'refresh' },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        },
      );

      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        accessToken,
        refreshToken,
        user: userWithoutPassword as User,
        tenant: user.tenant as Tenant,
      };
    } catch (error) {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  async sendPasswordReset(email: string) {
    const user = await this.databaseService.user.findFirst({
      where: { email, status: 'active' },
    });

    if (!user) {
      // Don't throw error for security reasons
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, type: 'reset' },
      {
        secret: this.configService.get('JWT_RESET_SECRET'),
        expiresIn: this.configService.get('JWT_RESET_EXPIRES_IN', '1h'),
      },
    );

    await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.databaseService.user.findFirst({
      where: { email, status: 'active' },
      include: { tenant: true },
    });

    if (!user) {
      // Do not leak existence
      return { message: 'If the email exists, a verification link has been sent' };
    }

    if (user.emailVerified) {
      return { message: 'Email already verified' };
    }

    const verificationToken = this.jwtService.sign(
      { sub: user.id, type: 'verify' },
      {
        secret: this.configService.get('JWT_VERIFY_SECRET'),
        expiresIn: this.configService.get('JWT_VERIFY_EXPIRES_IN', '24h'),
      },
    );

    await this.emailService.sendVerificationEmail(user.email, verificationToken);
    return { message: 'Verification email sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_RESET_SECRET'),
      });

      if (payload.type !== 'reset') {
        throw new BadRequestException('Invalid reset token');
      }

      const passwordHash = await bcrypt.hash(String(newPassword ?? ''), 12);

      const user = await this.databaseService.user.update({
        where: { id: payload.sub },
        data: { passwordHash },
        include: { tenant: true },
      });

      // Generate new tokens
      const accessToken = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      });

      const refreshToken = this.jwtService.sign(
        { sub: user.id, type: 'refresh' },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        },
      );

      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        accessToken,
        refreshToken,
        user: userWithoutPassword as User,
        tenant: user.tenant as Tenant,
      };
    } catch (error) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  async createInvitation(invitationData: CreateInvitationRequest & { tenantId: string; inviterUserId: string }) {
    const { email, role, tenantId, inviterUserId } = invitationData;

    // Check if user already exists
    const existingUser = await this.databaseService.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check for existing pending invitation
    const existingInvitation = await this.databaseService.invitation.findFirst({
      where: { email, tenantId, status: 'pending' },
    });

    if (existingInvitation) {
      throw new ConflictException('An invitation is already pending for this email');
    }

    const invitationToken = randomBytes(32).toString('hex');
    const expiresAt = addDays(new Date(), 7); // 7 days expiration

    const invitation = await this.databaseService.invitation.create({
      data: {
        email,
        role,
        token: invitationToken,
        tenantId,
        inviterUserId,
        expiresAt,
        status: 'pending',
      },
    });

    await this.emailService.sendInvitationEmail(email, invitationToken);

    return invitation;
  }

  async getInvitation(token: string) {
    const invitation = await this.databaseService.invitation.findFirst({
      where: {
        token,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      include: {
        tenant: true,
        inviter: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    return invitation;
  }

  async acceptInvitation(token: string, acceptData: AcceptInvitationRequest) {
    const invitation = await this.databaseService.invitation.findFirst({
      where: {
        token,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    const { firstName, lastName, password } = acceptData;
    const passwordHash = await bcrypt.hash(String(password ?? ''), 12);

    // Create user
    const user = await this.databaseService.user.create({
      data: {
        email: invitation.email,
        passwordHash,
        firstName,
        lastName,
        role: invitation.role,
        tenantId: invitation.tenantId,
        status: 'active',
        emailVerified: true,
      },
      include: { tenant: true },
    });

    // Update invitation status
    await this.databaseService.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPassword as User,
      tenant: (user as any).tenant as Tenant,
    };
  }

  async getUserProfile(userId: string): Promise<User> {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
      include: {
        tenant: true,
        ssoProviders: {
          select: {
            provider: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async initiateSSO(provider: 'google' | 'microsoft' | 'github') {
    const state = randomBytes(16).toString('hex');
    const frontend = this.configService.get<string>('FRONTEND_URL');
    if (!frontend) throw new BadRequestException('FRONTEND_URL not configured');

    let authUrl: string;
    switch (provider) {
      case 'google': {
        const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
        const redirectUri = `${frontend}/auth/google/callback`;
        const scope = encodeURIComponent('openid email profile');
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&include_granted_scopes=true&state=${state}`;
        break;
      }
      case 'microsoft': {
        const clientId = this.configService.get<string>('MICROSOFT_CLIENT_ID');
        const redirectUri = `${frontend}/auth/microsoft/callback`;
        const scope = encodeURIComponent('openid profile email offline_access User.Read');
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;
        break;
      }
      case 'github': {
        const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
        const redirectUri = `${frontend}/auth/github/callback`;
        const scope = encodeURIComponent('read:user user:email');
        authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
        break;
      }
      default:
        throw new BadRequestException('Unsupported SSO provider');
    }

    return { url: authUrl, state };
  }

  async handleSSOCallback(provider: 'google' | 'microsoft' | 'github', code: string, _state: string, tenantId?: string) {
    // Exchange code for tokens and fetch profile
    const frontend = this.configService.get<string>('FRONTEND_URL');
    if (!frontend) throw new BadRequestException('FRONTEND_URL not configured');

    let accessToken: string | undefined;
    let providerId = '';
    let email = '';
    let firstName = '';
    let lastName = '';

    const form = (data: Record<string, string>) => new URLSearchParams(data).toString();

    if (provider === 'google') {
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')!;
      const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET')!;
      const redirectUri = `${frontend}/auth/google/callback`;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      });
      const tokenJson = await tokenRes.json().catch(() => ({}));
      accessToken = tokenJson?.access_token as string | undefined;
      if (!accessToken) throw new UnauthorizedException('Failed to obtain Google access token');
      const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
      const u = await userRes.json().catch(() => ({} as any));
      providerId = String(u?.sub || '');
      email = String(u?.email || '');
      firstName = String(u?.given_name || '');
      lastName = String(u?.family_name || '');
    }

    if (provider === 'microsoft') {
      const clientId = this.configService.get<string>('MICROSOFT_CLIENT_ID')!;
      const clientSecret = this.configService.get<string>('MICROSOFT_CLIENT_SECRET')!;
      const redirectUri = `${frontend}/auth/microsoft/callback`;
      const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      });
      const tokenJson = await tokenRes.json().catch(() => ({}));
      accessToken = tokenJson?.access_token as string | undefined;
      if (!accessToken) throw new UnauthorizedException('Failed to obtain Microsoft access token');
      const userRes = await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${accessToken}` } });
      const u = await userRes.json().catch(() => ({} as any));
      providerId = String(u?.id || '');
      const mail = String(u?.mail || u?.userPrincipalName || '');
      email = mail;
      firstName = String(u?.givenName || '');
      lastName = String(u?.surname || '');
    }

    if (provider === 'github') {
      const clientId = this.configService.get<string>('GITHUB_CLIENT_ID')!;
      const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET')!;
      const redirectUri = `${frontend}/auth/github/callback`;
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        body: form({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
      });
      const tokenJson = await tokenRes.json().catch(() => ({}));
      accessToken = tokenJson?.access_token as string | undefined;
      if (!accessToken) throw new UnauthorizedException('Failed to obtain GitHub access token');
      const userRes = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${accessToken}`, 'Accept': 'application/vnd.github+json' } });
      const u = await userRes.json().catch(() => ({} as any));
      providerId = String(u?.id || '');
      let ghEmail = '';
      try {
        const emailsRes = await fetch('https://api.github.com/user/emails', { headers: { Authorization: `Bearer ${accessToken}`, 'Accept': 'application/vnd.github+json' } });
        const emails = (await emailsRes.json()) as Array<{ email: string; primary?: boolean; verified?: boolean }>;
        ghEmail = (emails?.find(e => e.primary)?.email) || emails?.[0]?.email || '';
      } catch { /* ignore */ }
      email = ghEmail || String(u?.email || '');
      const name = String(u?.name || '');
      if (name) {
        const parts = name.split(' ');
        firstName = parts.shift() || '';
        lastName = parts.join(' ');
      } else {
        firstName = String(u?.login || '');
        lastName = '';
      }
    }

    if (!providerId || !email) {
      throw new UnauthorizedException('Failed to fetch SSO profile');
    }

    // Link or create user
    const existingLink = await this.databaseService.ssoProvider.findFirst({
      where: { provider, providerId },
      include: { user: { include: { tenant: true } } },
    });

    let user: any = existingLink?.user;
    let isNewUser = false;

    if (!user) {
      user = await this.databaseService.user.findFirst({ where: { email }, include: { tenant: true } });
      if (!user) {
        const actualTenantId = tenantId || (await this.createTenantForUser(email)).id;
        user = await this.databaseService.user.create({
          data: {
            email,
            passwordHash: '',
            firstName: firstName || email.split('@')[0],
            lastName: lastName || '',
            role: 'agent',
            status: 'active',
            emailVerified: true,
            tenantId: actualTenantId,
          },
          include: { tenant: true },
        });
        isNewUser = true;
      }

      await this.databaseService.ssoProvider.upsert({
        where: { provider_providerId: { provider, providerId } } as any,
        update: { userId: user.id, email, accessToken },
        create: { userId: user.id, provider, providerId, email, accessToken },
      });
    }

    // Generate tokens
    const payload: JwtPayload = { sub: user.id, email: user.email, tenantId: user.tenantId, role: user.role } as const;
    const signedAccessToken = this.jwtService.sign(payload);
    const signedRefreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { secret: this.configService.get('JWT_REFRESH_SECRET'), expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d') },
    );

    const { passwordHash, ...userWithoutPassword } = user;
    return { accessToken: signedAccessToken, refreshToken: signedRefreshToken, user: userWithoutPassword as User, tenant: (user as any).tenant as Tenant, isNewUser };
  }
}