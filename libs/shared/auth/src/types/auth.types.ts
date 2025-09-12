// Enhanced authentication types for the Glavito platform

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'agent' | 'super_admin';
  status: 'active' | 'inactive' | 'suspended';
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  loginAttempts: number;
  lockoutUntil?: Date;
  lastLoginAt?: Date;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial';
  plan: 'starter' | 'professional' | 'business' | 'enterprise';
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSubscription {
  id: string;
  tenantId: string;
  plan: 'starter' | 'professional' | 'business' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
  trialEndsAt?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSSOProvider {
  id: string;
  userId: string;
  provider: 'google' | 'microsoft' | 'github';
  providerId: string;
  email: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpires?: Date;
  profileData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthInvitation {
  id: string;
  tenantId: string;
  inviterUserId: string;
  email: string;
  role: 'admin' | 'agent';
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthCredentials {
  email: string;
  password: string;
  tenantId?: string;
}

export interface AuthRegistration {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
  plan?: 'starter' | 'professional' | 'business' | 'enterprise';
}

export interface AuthPasswordReset {
  email: string;
}

export interface AuthPasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface AuthEmailVerification {
  token: string;
}

export interface AuthSSORequest {
  provider: 'google' | 'microsoft' | 'github';
  code: string;
  state: string;
  tenantId?: string;
}

export interface AuthSSOInitiate {
  provider: 'google' | 'microsoft' | 'github';
  redirectUrl: string;
}

export interface AuthSSOInitiateResponse {
  authUrl: string;
  state: string;
}

export interface AuthRefreshToken {
  refreshToken: string;
}

export interface AuthError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface AuthRateLimit {
  key: string;
  limit: number;
  window: number;
  remaining: number;
  reset: number;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthAuditLog {
  id: string;
  userId: string;
  tenantId: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface AuthConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
    verifySecret: string;
    verifyExpiresIn: string;
    resetSecret: string;
    resetExpiresIn: string;
  };
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  security: {
    maxLoginAttempts: number;
    lockoutDuration: number;
    enableTwoFactor: boolean;
    enableEmailVerification: boolean;
  };
  sso: {
    google: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    microsoft: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    github: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
  };
}