// Authentication constants

export const AUTH_CONSTANTS = {
  // JWT token expiration times
  JWT: {
    ACCESS_TOKEN_EXPIRES_IN: '24h',
    REFRESH_TOKEN_EXPIRES_IN: '7d',
    EMAIL_VERIFICATION_EXPIRES_IN: '24h',
    PASSWORD_RESET_EXPIRES_IN: '1h',
    TWO_FACTOR_EXPIRES_IN: '5m',
  },

  // Rate limiting
  RATE_LIMIT: {
    LOGIN_ATTEMPTS: 5,
    LOGIN_WINDOW: 15 * 60, // 15 minutes in seconds
    PASSWORD_RESET_ATTEMPTS: 3,
    PASSWORD_RESET_WINDOW: 60 * 60, // 1 hour in seconds
    EMAIL_VERIFICATION_ATTEMPTS: 3,
    EMAIL_VERIFICATION_WINDOW: 60 * 60, // 1 hour in seconds
    API_REQUESTS_PER_MINUTE: 100,
    API_REQUESTS_PER_HOUR: 1000,
  },

  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  },

  // Security settings
  SECURITY: {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    TWO_FACTOR_WINDOW: 30, // 30 seconds for TOTP
    TWO_FACTOR_BACKUP_CODES: 10,
    API_KEY_LENGTH: 32,
    SALT_ROUNDS: 12,
  },

  // Email verification
  EMAIL_VERIFICATION: {
    TOKEN_LENGTH: 32,
    EXPIRES_IN: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    MAX_ATTEMPTS: 3,
  },

  // Password reset
  PASSWORD_RESET: {
    TOKEN_LENGTH: 32,
    EXPIRES_IN: 60 * 60 * 1000, // 1 hour in milliseconds
    MAX_ATTEMPTS: 3,
  },

  // Invitation
  INVITATION: {
    TOKEN_LENGTH: 32,
    EXPIRES_IN: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    MAX_INVITATIONS_PER_DAY: 50,
  },

  // SSO providers
  SSO_PROVIDERS: {
    GOOGLE: {
      AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
      TOKEN_URL: 'https://oauth2.googleapis.com/token',
      USER_INFO_URL: 'https://www.googleapis.com/oauth2/v2/userinfo',
      SCOPE: 'openid email profile',
    },
    MICROSOFT: {
      AUTH_URL: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      TOKEN_URL: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      USER_INFO_URL: 'https://graph.microsoft.com/v1.0/me',
      SCOPE: 'openid email profile User.Read',
    },
    GITHUB: {
      AUTH_URL: 'https://github.com/login/oauth/authorize',
      TOKEN_URL: 'https://github.com/login/oauth/access_token',
      USER_INFO_URL: 'https://api.github.com/user',
      SCOPE: 'user:email',
    },
  },

  // Error codes
  ERROR_CODES: {
    // Authentication errors
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_REVOKED: 'TOKEN_REVOKED',
    
    // Authorization errors
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
    
    // Validation errors
    INVALID_INPUT: 'INVALID_INPUT',
    INVALID_EMAIL: 'INVALID_EMAIL',
    INVALID_PASSWORD: 'INVALID_PASSWORD',
    PASSWORD_TOO_WEAK: 'PASSWORD_TOO_WEAK',
    EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
    
    // Rate limiting errors
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
    
    // SSO errors
    SSO_PROVIDER_ERROR: 'SSO_PROVIDER_ERROR',
    SSO_INVALID_STATE: 'SSO_INVALID_STATE',
    SSO_USER_NOT_FOUND: 'SSO_USER_NOT_FOUND',
    
    // Invitation errors
    INVITATION_EXPIRED: 'INVITATION_EXPIRED',
    INVITATION_ALREADY_USED: 'INVITATION_ALREADY_USED',
    INVITATION_NOT_FOUND: 'INVITATION_NOT_FOUND',
    
    // System errors
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',
  },

  // HTTP status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    ACCEPTED: 202,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },

  // Cache keys
  CACHE_KEYS: {
    USER_SESSION: 'session:user:',
    FAILED_LOGIN: 'failed_login:',
    PASSWORD_RESET: 'password_reset:',
    EMAIL_VERIFICATION: 'email_verification:',
    INVITATION_TOKEN: 'invitation:',
    API_RATE_LIMIT: 'rate_limit:',
    BLACKLISTED_TOKEN: 'blacklist:',
    USER_CACHE: 'cache:user:',
    TENANT_CACHE: 'cache:tenant:',
  },

  // Event topics
  EVENT_TOPICS: {
    USER_EVENTS: 'user-events',
    AUTH_EVENTS: 'auth-events',
    TENANT_EVENTS: 'tenant-events',
    INVITATION_EVENTS: 'invitation-events',
    ERROR_EVENTS: 'error-events',
    AUDIT_EVENTS: 'audit-events',
  },

  // Email templates
  EMAIL_TEMPLATES: {
    WELCOME: 'welcome',
    EMAIL_VERIFICATION: 'email-verification',
    PASSWORD_RESET: 'password-reset',
    INVITATION: 'invitation',
    TWO_FACTOR_CODE: 'two-factor-code',
    ACCOUNT_LOCKED: 'account-locked',
    ACCOUNT_SUSPENDED: 'account-suspended',
  },
} as const;

// Type exports
export type AuthRole = 'admin' | 'agent' | 'super_admin';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type TenantStatus = 'active' | 'suspended' | 'trial';
export type SubscriptionPlan = 'starter' | 'professional' | 'business' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type SSOProvider = 'google' | 'microsoft' | 'github';
export type ErrorCode = typeof AUTH_CONSTANTS.ERROR_CODES[keyof typeof AUTH_CONSTANTS.ERROR_CODES];