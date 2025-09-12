// Shared authentication types and interfaces
export * from './types/auth.types';
export * from './interfaces/auth.interfaces';
export * from './constants/auth.constants';

// Guards (excluding conflicting exports)
export {
  AuthGuard,
  RolesGuard,
  TenantGuard,
  PermissionsGuard,
  EmailVerifiedGuard,
  TwoFactorGuard,
  ApiKeyGuard,
  ROLES_KEY,
  PERMISSIONS_KEY,
  SKIP_AUTH,
  AllowAnonymous
} from './guards/auth.guards';

export type { AuthUser } from './guards/auth.guards';

// Decorators (excluding conflicting exports)
export {
  CurrentUser,
  CurrentTenant,
  ApiKey,
  IpAddress,
  UserAgent,
  CorrelationId,
  Public,
  SkipRateLimit,
  SkipAuth,
  RequireTwoFactor,
  ValidateEmail,
  ValidatePassword,
  RateLimit,
  RateLimitByUser,
  RateLimitByIp,
  RequireTenant,
  AllowTenantAccess,
  TenantAdminOnly,
  AllowSSO,
  AuditLog,
  SkipAudit,
  ValidateRequest,
  SanitizeInput,
  CacheResult,
  InvalidateCache,
  FeatureFlag,
  BetaFeature,
  RequireHttps,
  RequireApiKey,
  RequireCsrfToken,
  RequireSubscription,
  CheckUsageLimits,
  ValidateInvitation,
  AllowInvitation,
  WebhookSignature,
  WebhookEvent
} from './decorators/auth.decorators';

// Export canonical decorator names to match existing imports
export { Roles, Permissions, SSOProvider } from './decorators/auth.decorators';

// Re-export with aliases to avoid conflicts (guard helpers)
export { Roles as RolesGuardHelper, Permissions as PermissionsGuardHelper } from './guards/auth.guards';

export * from './utils/auth.utils';