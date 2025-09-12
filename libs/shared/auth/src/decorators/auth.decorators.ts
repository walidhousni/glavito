// Authentication decorators

import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

// User decorator to get current user
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      return null;
    }
    
    return data ? user[data] : user;
  }
);

// Tenant decorator to get current tenant
export const CurrentTenant = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenantOrId = request.tenant || request.user?.tenant || request.user?.tenantId;

    if (!tenantOrId) {
      return null;
    }

    // If a specific field was requested, try to resolve it from object or user
    if (data) {
      if (typeof tenantOrId === 'object' && tenantOrId !== null) {
        return (tenantOrId as any)[data];
      }
      return (request.user && (request.user as any)[data]) ?? null;
    }

    // By default, return tenant id (string). If object provided, return its id
    return typeof tenantOrId === 'string' ? tenantOrId : (tenantOrId as any).id;
  }
);

// API key decorator to get API key from request
export const ApiKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-api-key'];
  }
);

// IP address decorator
export const IpAddress = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.ip || request.connection.remoteAddress;
  }
);

// User agent decorator
export const UserAgent = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['user-agent'];
  }
);

// Correlation ID decorator
export const CorrelationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.correlationId || request.headers['x-correlation-id'];
  }
);

// Metadata decorators
export const Public = () => SetMetadata('isPublic', true);
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const Permissions = (...permissions: string[]) => SetMetadata('permissions', permissions);
export const SkipRateLimit = () => SetMetadata('skipRateLimit', true);
export const SkipAuth = () => SetMetadata('skipAuth', true);
export const RequireTwoFactor = () => SetMetadata('requireTwoFactor', true);

// Validation decorators
export const ValidateEmail = () => SetMetadata('validateEmail', true);
export const ValidatePassword = () => SetMetadata('validatePassword', true);

// Rate limiting decorators
export const RateLimit = (limit: number, window: number) => SetMetadata('rateLimit', { limit, window });
export const RateLimitByUser = (limit: number, window: number) => SetMetadata('rateLimitByUser', { limit, window });
export const RateLimitByIp = (limit: number, window: number) => SetMetadata('rateLimitByIp', { limit, window });

// Tenant specific decorators
export const RequireTenant = () => SetMetadata('requireTenant', true);
export const AllowTenantAccess = () => SetMetadata('allowTenantAccess', true);
export const TenantAdminOnly = () => SetMetadata('tenantAdminOnly', true);

// SSO specific decorators
export const SSOProvider = (provider: string) => SetMetadata('ssoProvider', provider);
export const AllowSSO = () => SetMetadata('allowSSO', true);

// Audit decorators
export const AuditLog = (action: string, resource?: string) => SetMetadata('auditLog', { action, resource });
export const SkipAudit = () => SetMetadata('skipAudit', true);

// Validation decorators for request validation
export const ValidateRequest = () => SetMetadata('validateRequest', true);
export const SanitizeInput = () => SetMetadata('sanitizeInput', true);

// Caching decorators
export const CacheResult = (ttl: number) => SetMetadata('cacheResult', ttl);
export const InvalidateCache = (pattern: string) => SetMetadata('invalidateCache', pattern);

// Feature flags decorators
export const FeatureFlag = (flag: string) => SetMetadata('featureFlag', flag);
export const BetaFeature = () => SetMetadata('betaFeature', true);

// Security decorators
export const RequireHttps = () => SetMetadata('requireHttps', true);
export const RequireApiKey = () => SetMetadata('requireApiKey', true);
export const RequireCsrfToken = () => SetMetadata('requireCsrfToken', true);

// Subscription decorators
export const RequireSubscription = (plan?: string) => SetMetadata('requireSubscription', plan || true);
export const CheckUsageLimits = () => SetMetadata('checkUsageLimits', true);

// Invitation decorators
export const ValidateInvitation = () => SetMetadata('validateInvitation', true);
export const AllowInvitation = () => SetMetadata('allowInvitation', true);

// Webhook decorators
export const WebhookSignature = () => SetMetadata('webhookSignature', true);
export const WebhookEvent = (event: string) => SetMetadata('webhookEvent', event);