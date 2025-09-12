import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { DatabaseService } from '@glavito/shared-database';
import type { 
  AuthSSORequest, 
  AuthSSOInitiateResponse, 
  AuthUser, 
  AuthTenant,
  AuthSSOProvider 
} from '@glavito/shared-auth';
import { randomBytes } from 'crypto';

interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

@Injectable()
export class SSOService {
  private readonly providers = {
    google: {
      clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: this.configService.get<string>('GOOGLE_CLIENT_SECRET'),
      redirectUri: this.configService.get<string>('GOOGLE_REDIRECT_URI'),
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scope: 'openid email profile',
    },
    microsoft: {
      clientId: this.configService.get<string>('MICROSOFT_CLIENT_ID'),
      clientSecret: this.configService.get<string>('MICROSOFT_CLIENT_SECRET'),
      redirectUri: this.configService.get<string>('MICROSOFT_REDIRECT_URI'),
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scope: 'openid email profile User.Read',
    },
    github: {
      clientId: this.configService.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: this.configService.get<string>('GITHUB_CLIENT_SECRET'),
      redirectUri: this.configService.get<string>('GITHUB_REDIRECT_URI'),
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      scope: 'user:email',
    },
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
  ) {}

  async initiateSSO(provider: 'google' | 'microsoft' | 'github', redirectUrl: string): Promise<AuthSSOInitiateResponse> {
    const config = this.providers[provider as keyof typeof this.providers];
    if (!config) {
      throw new BadRequestException(`Unsupported provider: ${provider}`);
    }

    const state = randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scope,
      state,
    } as Record<string, string>);

    const authUrl = `${config.authUrl}?${params.toString()}`;

    return {
      authUrl,
      state,
    };
  }

  async handleSSOCallback(
    provider: 'google' | 'microsoft' | 'github',
    code: string,
    tenantId?: string,
  ): Promise<{
    user: AuthUser;
    tenant: AuthTenant;
    tokens: { accessToken: string; refreshToken: string };
    isNewUser: boolean;
  }> {
    const config = this.providers[provider];
    if (!config) {
      throw new BadRequestException(`Unsupported provider: ${provider}`);
    }

    try {
      // Exchange code for access token
      const tokenResponse = await axios.post(config.tokenUrl, {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      });

      const accessToken = tokenResponse.data.access_token;

      // Get user info from provider
      const userInfoResponse = await axios.get(config.userInfoUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const userInfo = this.extractUserInfo(provider, userInfoResponse.data);

      // Check if user exists with this SSO provider
      const existingSSOProvider = await this.databaseService.sSOProvider.findFirst({
        where: {
          provider,
          providerId: userInfo.providerId,
        },
        include: {
          user: {
            include: { tenant: true },
          },
        },
      });

      if (existingSSOProvider) {
        // Existing user - generate tokens
        const tokens = await this.generateTokens(existingSSOProvider.user);
        
        return {
          user: existingSSOProvider.user as AuthUser,
          tenant: existingSSOProvider.user.tenant as AuthTenant,
          tokens,
          isNewUser: false,
        };
      }

      // Check if user exists with this email
      let user = await this.databaseService.user.findFirst({
        where: { email: userInfo.email },
        include: { tenant: true },
      });

      if (!user) {
        // Create new user
        let actualTenantId = tenantId;
        
        if (!actualTenantId) {
          // Create new tenant
          const tenant = await this.createTenantForUser(userInfo.email);
          actualTenantId = tenant.id;
        }

        user = await this.databaseService.user.create({
          data: {
            email: userInfo.email,
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            role: 'agent',
            status: 'active',
            emailVerified: true, // SSO users are verified
            tenantId: actualTenantId,
            passwordHash: '', // No password for SSO users
          },
          include: { tenant: true },
        });
      }

      // Create SSO provider record
      await this.databaseService.sSOProvider.create({
        data: {
          userId: user.id,
          provider,
          providerId: userInfo.providerId,
          email: userInfo.email,
          accessToken,
          refreshToken: tokenResponse.data.refresh_token,
          tokenExpires: new Date(Date.now() + tokenResponse.data.expires_in * 1000),
          profileData: userInfo.profileData,
        },
      });

      const tokens = await this.generateTokens(user);

      return {
        user: user as AuthUser,
        tenant: user.tenant as AuthTenant,
        tokens,
        isNewUser: true,
      };

    } catch (error) {
      throw new UnauthorizedException('SSO authentication failed');
    }
  }

  private extractUserInfo(provider: string, data: any): { providerId: string; email: string; firstName: string; lastName: string; profileData: any } {
    switch (provider) {
      case 'google':
        return {
          providerId: data.id,
          email: data.email,
          firstName: data.given_name,
          lastName: data.family_name,
          profileData: {
            picture: data.picture,
            locale: data.locale,
          },
        };
      case 'microsoft':
        return {
          providerId: data.id,
          email: data.mail || data.userPrincipalName,
          firstName: data.givenName,
          lastName: data.surname,
          profileData: {
            jobTitle: data.jobTitle,
            officeLocation: data.officeLocation,
          },
        };
      case 'github':
        return {
          providerId: data.id.toString(),
          email: data.email,
          firstName: data.name?.split(' ')[0] || data.login,
          lastName: data.name?.split(' ').slice(1).join(' ') || '',
          profileData: {
            avatar_url: data.avatar_url,
            html_url: data.html_url,
            company: data.company,
            location: data.location,
          },
        };
      default:
        throw new BadRequestException(`Unsupported provider: ${provider}`);
    }
  }

  private async createTenantForUser(email: string) {
    const tenantName = email.split('@')[0];
    return this.databaseService.tenant.create({
      data: {
        name: `${tenantName}'s Organization`,
        slug: tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        subdomain: tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        status: 'active',
        plan: 'starter',
        settings: {},
      },
    });
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '24h',
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  async refreshSSOToken(ssoProviderId: string): Promise<string> {
    const ssoProvider = await this.databaseService.sSOProvider.findUnique({
      where: { id: ssoProviderId },
    });

    if (!ssoProvider || !ssoProvider.refreshToken) {
      throw new BadRequestException('No refresh token available');
    }

    const config = this.providers[ssoProvider.provider as keyof typeof this.providers];
    
    try {
      const response = await axios.post(config.tokenUrl, {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: ssoProvider.refreshToken,
        grant_type: 'refresh_token',
      });

      await this.databaseService.sSOProvider.update({
        where: { id: ssoProviderId },
        data: {
          accessToken: response.data.access_token,
          tokenExpires: new Date(Date.now() + response.data.expires_in * 1000),
        },
      });

      return response.data.access_token;
    } catch (error) {
      throw new UnauthorizedException('Token refresh failed');
    }
  }
}