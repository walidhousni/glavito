// Authentication interfaces

export interface IAuthService {
  validateUser(email: string, password: string): Promise<any>;
  login(user: any): Promise<any>;
  register(userData: any): Promise<any>;
  logout(token: string): Promise<void>;
  refreshTokens(refreshToken: string): Promise<any>;
  verifyEmail(token: string): Promise<void>;
  resendVerificationEmail(email: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  enableTwoFactor(userId: string, secret: string): Promise<void>;
  disableTwoFactor(userId: string): Promise<void>;
  verifyTwoFactor(userId: string, token: string): Promise<boolean>;
}

export interface ITokenService {
  generateAccessToken(payload: any): string;
  generateRefreshToken(payload: any): string;
  generateEmailVerificationToken(payload: any): string;
  generatePasswordResetToken(payload: any): string;
  verifyToken(token: string, secret: string): any;
  blacklistToken(token: string, ttl: number): Promise<void>;
  isTokenBlacklisted(token: string): Promise<boolean>;
}

export interface IUserService {
  findById(id: string): Promise<any>;
  findByEmail(email: string): Promise<any>;
  create(userData: any): Promise<any>;
  update(id: string, userData: any): Promise<any>;
  delete(id: string): Promise<void>;
  findByTenant(tenantId: string): Promise<any[]>;
}

export interface ITenantService {
  findById(id: string): Promise<any>;
  findBySlug(slug: string): Promise<any>;
  findBySubdomain(subdomain: string): Promise<any>;
  create(tenantData: any): Promise<any>;
  update(id: string, tenantData: any): Promise<any>;
  delete(id: string): Promise<void>;
  addMember(tenantId: string, userId: string, role: string): Promise<void>;
  removeMember(tenantId: string, userId: string): Promise<void>;
  updateMemberRole(tenantId: string, userId: string, role: string): Promise<void>;
}

export interface IInvitationService {
  createInvitation(invitationData: any): Promise<any>;
  acceptInvitation(token: string, userId: string): Promise<void>;
  declineInvitation(token: string): Promise<void>;
  revokeInvitation(id: string): Promise<void>;
  resendInvitation(id: string): Promise<void>;
  findByToken(token: string): Promise<any>;
  findByTenant(tenantId: string): Promise<any[]>;
  cleanupExpiredInvitations(): Promise<void>;
}

export interface ISSOService {
  initiateSSO(provider: string, redirectUrl: string): Promise<any>;
  handleSSOCallback(provider: string, code: string, state: string, tenantId?: string): Promise<any>;
  refreshSSOToken(ssoProviderId: string): Promise<string>;
  revokeSSOToken(ssoProviderId: string): Promise<void>;
  getSSOProviders(userId: string): Promise<any[]>;
  disconnectSSOProvider(ssoProviderId: string): Promise<void>;
}

export interface IEmailService {
  sendEmailVerification(email: string, token: string): Promise<void>;
  sendPasswordReset(email: string, token: string): Promise<void>;
  sendInvitation(email: string, invitationData: any): Promise<void>;
  sendWelcomeEmail(email: string, userData: any): Promise<void>;
  sendTwoFactorCode(email: string, code: string): Promise<void>;
}

export interface IRateLimitService {
  checkLimit(key: string, limit: number, window: number): Promise<{
    allowed: boolean;
    remaining: number;
    reset: number;
  }>;
  increment(key: string, window: number): Promise<number>;
  reset(key: string): Promise<void>;
  getRemaining(key: string, limit: number): Promise<number>;
}

export interface IAuditService {
  logAction(userId: string, tenantId: string, action: string, resource: string, details?: any): Promise<void>;
  findByUser(userId: string): Promise<any[]>;
  findByTenant(tenantId: string): Promise<any[]>;
  findByAction(action: string): Promise<any[]>;
  findByResource(resource: string): Promise<any[]>;
  cleanupOldLogs(before: Date): Promise<void>;
}

export interface ISecurityService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  generateSalt(): Promise<string>;
  generateTwoFactorSecret(): Promise<{ secret: string; qrCode: string }>;
  verifyTwoFactorToken(secret: string, token: string): Promise<boolean>;
  sanitizeInput(input: string): string;
  validatePassword(password: string): { valid: boolean; errors: string[] };
  generateRandomToken(length?: number): string;
}