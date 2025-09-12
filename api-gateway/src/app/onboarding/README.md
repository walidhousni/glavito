# Onboarding System Backend

This directory contains the complete backend implementation for the Glavito onboarding system. The system provides a comprehensive, step-by-step onboarding experience with real-time progress tracking, connection testing, and WebSocket-based updates.

## Architecture Overview

The onboarding system is built with a modular architecture consisting of:

- **OnboardingService**: Core business logic for managing onboarding sessions
- **ProgressTrackingService**: Handles progress calculation, milestone tracking, and analytics
- **ConnectionTestingService**: Tests various integrations and connections
- **BusinessHoursService**: Manages business hours configuration
- **OnboardingGateway**: WebSocket gateway for real-time updates
- **OnboardingController**: HTTP API endpoints

## Features

### Core Functionality
- ✅ Multi-step onboarding flow with 11 configurable steps
- ✅ Real-time progress tracking with WebSocket updates
- ✅ Step validation and dependency management
- ✅ Session pause/resume functionality
- ✅ Milestone tracking (25%, 50%, 75%, 100%)
- ✅ Comprehensive analytics and statistics

### Connection Testing
- ✅ Email (SMTP/IMAP) connection testing
- ✅ Slack API integration testing
- ✅ Microsoft Teams connection testing
- ✅ WhatsApp Business API testing
- ✅ Webhook endpoint testing
- ✅ Stripe payment integration testing
- ✅ Database connection testing
- ✅ AI provider (OpenAI, Anthropic, Google) testing

### Real-time Features
- ✅ WebSocket-based progress updates
- ✅ Live connection test results
- ✅ Step completion notifications
- ✅ Milestone achievement broadcasts
- ✅ Validation error notifications

## API Endpoints

### Session Management
- `POST /onboarding/start` - Start new onboarding session
- `GET /onboarding/session/:sessionId` - Get session details
- `GET /onboarding/progress/:sessionId` - Get progress information
- `POST /onboarding/pause/:sessionId` - Pause session
- `POST /onboarding/resume/:sessionId` - Resume session
- `POST /onboarding/complete/:sessionId` - Complete onboarding

### Step Management
- `PUT /onboarding/step/:sessionId/:stepId` - Update step progress
- `GET /onboarding/step/:stepId/configuration` - Get step configuration
- `GET /onboarding/validate-step/:stepId` - Validate step data

### Connection Testing
- `POST /onboarding/test-connections/:sessionId` - Test multiple connections
- `POST /onboarding/test-connection/:sessionId` - Test single connection
- `GET /onboarding/connection-history/:sessionId` - Get test history
- `POST /onboarding/validate-connection-config` - Validate connection config

### Analytics
- `GET /onboarding/statistics` - Get onboarding statistics
- `GET /onboarding/session-clients/:sessionId` - Get connected clients count
- `GET /onboarding/user-clients/:userId` - Get user's connected clients

## WebSocket Events

### Client → Server
- `join_session` - Join session-specific room
- `leave_session` - Leave session room
- `get_progress` - Request current progress

### Server → Client
- `connected` - Connection confirmation
- `progress_update` - Progress update notification
- `milestone_reached` - Milestone achievement
- `step_completed` - Step completion notification
- `validation_error` - Validation error notification
- `connection_test_result` - Connection test result
- `onboarding_completed` - Onboarding completion

## Onboarding Steps

1. **Welcome** - Introduction and getting started
2. **Organization Setup** - Company information and branding
3. **Channel Configuration** - Communication channels setup
4. **AI Configuration** - AI features and automation
5. **Knowledge Base** - FAQ and help content creation
6. **Payment Setup** - Stripe payment processing
7. **Team Management** - Team members and permissions
8. **Workflow Configuration** - Automated workflows and SLA
9. **Customer Portal** - Customer-facing portal customization
10. **Data Import** - Existing data migration
11. **Analytics Setup** - Reporting and analytics configuration

## Database Schema

The system uses the following main entities:

```typescript
interface OnboardingSession {
  id: string;
  userId: string;
  tenantId: string;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  stepData: Record<string, any>;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
  metadata: Record<string, any>;
}
```

## Configuration

### Environment Variables
```bash
# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=1h

# Database
DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend URL
FRONTEND_URL=http://localhost:3000

# AI Providers (optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
```

### WebSocket Configuration
The WebSocket gateway is configured to:
- Accept connections on `/onboarding` namespace
- Require JWT authentication
- Support CORS for frontend integration
- Automatically handle connection/disconnection events

## Usage Examples

### Starting Onboarding
```typescript
const session = await onboardingService.startOnboarding(
  'user-id',
  'tenant-id',
  {
    context: {
      industry: 'technology',
      companySize: '10-50',
      existingTools: ['slack', 'stripe']
    }
  }
);
```

### Updating Step Progress
```typescript
const result = await onboardingService.updateStepProgress(
  'session-id',
  OnboardingStep.ORGANIZATION_SETUP,
  {
    companyName: 'Acme Corp',
    industry: 'technology',
    primaryColor: '#007bff'
  }
);
```

### Testing Connections
```typescript
const results = await connectionTestingService.testConnections(
  'session-id',
  [
    {
      channel: 'email',
      config: {
        host: 'smtp.gmail.com',
        port: 587,
        username: 'user@example.com',
        password: 'app-password'
      }
    },
    {
      channel: 'slack',
      config: {
        botToken: 'xoxb-...'
      }
    }
  ]
);
```

## Error Handling

The system includes comprehensive error handling:

- **Validation Errors**: Step data validation with detailed error messages
- **Connection Errors**: Graceful handling of failed connection tests
- **Authentication Errors**: JWT token validation and user verification
- **Database Errors**: Transaction rollback and error recovery
- **WebSocket Errors**: Connection cleanup and error broadcasting

## Performance Considerations

- **Connection Pooling**: Database connections are pooled for efficiency
- **Async Processing**: Connection tests run in parallel when possible
- **Caching**: Step configurations and validation rules are cached
- **Rate Limiting**: Connection tests are rate-limited to prevent abuse
- **Memory Management**: WebSocket connections are properly cleaned up

## Testing

The system includes comprehensive test coverage:

- Unit tests for all services
- Integration tests for API endpoints
- WebSocket connection tests
- Connection testing validation
- Progress tracking accuracy tests

## Monitoring and Logging

- Structured logging with correlation IDs
- Performance metrics for connection tests
- Progress tracking analytics
- Error rate monitoring
- WebSocket connection metrics

## Security

- JWT-based authentication for all endpoints
- Input validation and sanitization
- Rate limiting on connection tests
- Secure WebSocket connections
- Audit logging for sensitive operations

## Deployment

The onboarding system is designed to be:
- **Scalable**: Horizontal scaling with load balancers
- **Resilient**: Graceful degradation and error recovery
- **Observable**: Comprehensive logging and metrics
- **Maintainable**: Clean architecture and documentation

## Future Enhancements

Planned improvements include:
- Advanced analytics and reporting
- Custom step configuration
- Integration with more third-party services
- Mobile app support
- Multi-language support
- Advanced workflow automation