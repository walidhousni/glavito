# Authentication Module

This module provides comprehensive authentication functionality for the Glavito platform, including user registration, login, JWT token management, email verification, password reset, SSO integration, and invitation-based user onboarding.

## Architecture Overview

The authentication system is built on a layered architecture:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and data processing
- **Strategies**: Implement OAuth and JWT authentication strategies
- **Guards**: Provide route protection and authorization
- **Decorators**: Enable role-based access control

## Features

### 1. User Authentication
- **Registration**: New user registration with email verification
- **Login**: Secure email/password authentication
- **Token Management**: JWT access and refresh tokens
- **Logout**: Secure token invalidation

### 2. Email Services
- **Email Verification**: Verify user email addresses
- **Password Reset**: Secure password reset via email
- **Invitation Emails**: Send invitations to join organizations

### 3. Single Sign-On (SSO)
- **Google OAuth**: Google account integration
- **Microsoft OAuth**: Microsoft/Office 365 integration
- **GitHub OAuth**: GitHub account integration

### 4. Multi-Tenant Support
- **Tenant Isolation**: Each user belongs to a specific tenant
- **Role-Based Access**: Different roles (admin, agent, user)
- **Invitation System**: Invite users to specific tenants

### 5. Security Features
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcrypt password encryption
- **Rate Limiting**: Protection against brute force attacks
- **Account Lockout**: Temporary lockout after failed attempts

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | User login |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | User logout |

### Email Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/verify-email` | Verify email address |

### Password Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/password-reset` | Send password reset email |
| POST | `/auth/password-reset/confirm` | Reset password with token |

### SSO Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/sso/initiate` | Initiate SSO flow |
| POST | `/auth/sso/callback` | Handle SSO callback |

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/me` | Get current user profile |
| POST | `/auth/invitations` | Create invitation (admin only) |
| GET | `/auth/invitations/:token` | Get invitation details |
| POST | `/auth/invitations/:token/accept` | Accept invitation |

## Environment Variables

### JWT Configuration
```bash
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d
JWT_VERIFY_SECRET=your-verify-secret
JWT_VERIFY_EXPIRES_IN=24h
JWT_RESET_SECRET=your-reset-secret
JWT_RESET_EXPIRES_IN=1h
```

### Email Configuration
```bash
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Your App Name
```

### SSO Configuration
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Security Configuration
```bash
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30
FRONTEND_URL=https://yourapp.com
```

## Usage Examples

### User Registration
```javascript
const response = await fetch('/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securePassword123',
    firstName: 'John',
    lastName: 'Doe',
  }),
});
```

### User Login
```javascript
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securePassword123',
  }),
});
```

### Token Refresh
```javascript
const response = await fetch('/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: 'your-refresh-token',
  }),
});
```

### SSO Login (Google)
```javascript
// Step 1: Initiate SSO
const initiateResponse = await fetch('/auth/sso/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google',
    redirectUrl: 'https://yourapp.com/auth/callback',
  }),
});

// Step 2: Redirect user to SSO provider
const { url } = await initiateResponse.json();
window.location.href = url;

// Step 3: Handle callback
const callbackResponse = await fetch('/auth/sso/callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google',
    code: 'oauth-code-from-callback',
    state: 'state-from-callback',
  }),
});
```

### Password Reset
```javascript
// Step 1: Request password reset
await fetch('/auth/password-reset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
  }),
});

// Step 2: Reset password with token
await fetch('/auth/password-reset/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'reset-token-from-email',
    newPassword: 'newSecurePassword123',
  }),
});
```

### Invitation System
```javascript
// Create invitation (admin only)
const response = await fetch('/auth/invitations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer admin-access-token',
  },
  body: JSON.stringify({
    email: 'invited@example.com',
    role: 'agent',
  }),
});

// Accept invitation
await fetch('/auth/invitations/invitation-token/accept', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'Invited',
    lastName: 'User',
    password: 'securePassword123',
  }),
});
```

## Testing

Run the authentication tests:

```bash
# Run all auth tests
npm test auth

# Run specific test file
npm test auth.controller.spec.ts
npm test auth.service.spec.ts

# Run tests in watch mode
npm run test:watch -- auth
```

## Error Handling

The authentication system provides detailed error responses:

### Common Error Responses

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "email must be an email"
    }
  ]
}

{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}

{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict"
}

{
  "statusCode": 429,
  "message": "Too many login attempts",
  "error": "Too Many Requests"
}
```

## Security Best Practices

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Security
- Access tokens expire after 15 minutes
- Refresh tokens expire after 7 days
- Verification tokens expire after 24 hours
- Reset tokens expire after 1 hour

### Rate Limiting
- 5 login attempts per 15 minutes per IP
- 3 password reset attempts per hour per email
- 10 registration attempts per hour per IP

## Database Schema

### User Table
- `id` (UUID, Primary Key)
- `email` (String, Unique)
- `passwordHash` (String)
- `firstName` (String)
- `lastName` (String)
- `role` (Enum: admin, agent, user)
- `status` (Enum: active, inactive, suspended)
- `emailVerified` (Boolean)
- `tenantId` (UUID, Foreign Key)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### SSO Provider Table
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key)
- `provider` (Enum: google, microsoft, github)
- `providerId` (String)
- `email` (String)
- `createdAt` (DateTime)

### Invitation Table
- `id` (UUID, Primary Key)
- `email` (String)
- `token` (String, Unique)
- `role` (Enum: admin, agent, user)
- `tenantId` (UUID, Foreign Key)
- `inviterUserId` (UUID, Foreign Key)
- `status` (Enum: pending, accepted, expired)
- `expiresAt` (DateTime)
- `createdAt` (DateTime)

## Monitoring and Logging

The authentication system includes comprehensive logging:

- Failed login attempts
- Successful logins
- Password reset requests
- Email verification events
- SSO authentication events
- Security violations

## Support and Maintenance

### Regular Maintenance Tasks
- Monitor failed login attempts
- Review expired tokens
- Update email templates
- Review SSO provider configurations
- Monitor email delivery rates

### Troubleshooting
- Check application logs for errors
- Verify email service configuration
- Ensure SSO provider credentials are valid
- Check database connectivity
- Monitor token expiration issues

For additional support, please refer to the main documentation or contact the development team.