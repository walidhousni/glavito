/**
 * API Documentation Service
 * Generates comprehensive API documentation and OpenAPI specifications
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiDocsService {
  /**
   * Generate OpenAPI specification for onboarding APIs
   */
  generateOpenApiSpec(): any {
    return {
      openapi: '3.0.0',
      info: {
        title: 'Glavito Onboarding API',
        description: 'Comprehensive API for onboarding system management',
        version: '1.0.0',
        contact: {
          name: 'Glavito API Support',
          email: 'api-support@glavito.com',
          url: 'https://docs.glavito.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: 'https://api.glavito.com/v1',
          description: 'Production server',
        },
        {
          url: 'https://staging-api.glavito.com/v1',
          description: 'Staging server',
        },
        {
          url: 'http://localhost:3000/v1',
          description: 'Development server',
        },
      ],
      paths: {
        // Onboarding endpoints
        '/onboarding': {
          get: {
            tags: ['Onboarding'],
            summary: 'Get onboarding session',
            description: 'Retrieve the current onboarding session for the tenant',
            operationId: 'getOnboardingSession',
            responses: {
              '200': {
                description: 'Onboarding session retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/OnboardingSession',
                    },
                  },
                },
              },
              '404': {
                description: 'Onboarding session not found',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/ApiError',
                    },
                  },
                },
              },
            },
          },
          post: {
            tags: ['Onboarding'],
            summary: 'Start onboarding',
            description: 'Initialize a new onboarding session for the tenant',
            operationId: 'startOnboarding',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/StartOnboardingRequest',
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'Onboarding session created successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/OnboardingSession',
                    },
                  },
                },
              },
              '400': {
                description: 'Invalid request data',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/ApiError',
                    },
                  },
                },
              },
            },
          },
        },
        // Configuration endpoints
        '/onboarding/configuration/organization': {
          get: {
            tags: ['Configuration'],
            summary: 'Get organization configuration',
            description: 'Retrieve organization configuration settings',
            operationId: 'getOrganizationConfig',
            responses: {
              '200': {
                description: 'Organization configuration retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/OrganizationConfig',
                    },
                  },
                },
              },
            },
          },
          put: {
            tags: ['Configuration'],
            summary: 'Update organization configuration',
            description: 'Update organization configuration settings',
            operationId: 'updateOrganizationConfig',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/OrganizationConfigRequest',
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'Organization configuration updated successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/OrganizationConfig',
                    },
                  },
                },
              },
            },
          },
        },
        // Template endpoints
        '/onboarding/templates': {
          get: {
            tags: ['Templates'],
            summary: 'Get onboarding templates',
            description: 'Retrieve available onboarding templates with optional filtering',
            operationId: 'getTemplates',
            parameters: [
              {
                name: 'industry',
                in: 'query',
                description: 'Filter by industry',
                required: false,
                schema: {
                  type: 'string',
                  enum: ['technology', 'ecommerce', 'healthcare', 'finance', 'education'],
                },
              },
              {
                name: 'category',
                in: 'query',
                description: 'Filter by category',
                required: false,
                schema: {
                  type: 'string',
                  enum: ['complete', 'workflow', 'faq', 'email', 'dashboard'],
                },
              },
              {
                name: 'rating',
                in: 'query',
                description: 'Minimum rating filter',
                required: false,
                schema: {
                  type: 'number',
                  minimum: 0,
                  maximum: 5,
                },
              },
            ],
            responses: {
              '200': {
                description: 'Templates retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/OnboardingTemplate',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        // Analytics endpoints
        '/onboarding/analytics/dashboards': {
          get: {
            tags: ['Analytics'],
            summary: 'Get analytics dashboards',
            description: 'Retrieve analytics dashboards for the tenant',
            operationId: 'getAnalyticsDashboards',
            responses: {
              '200': {
                description: 'Dashboards retrieved successfully',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/AnalyticsDashboard',
                      },
                    },
                  },
                },
              },
            },
          },
          post: {
            tags: ['Analytics'],
            summary: 'Create analytics dashboard',
            description: 'Create a new analytics dashboard',
            operationId: 'createAnalyticsDashboard',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/DashboardRequest',
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'Dashboard created successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/AnalyticsDashboard',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          // Core schemas
          ApiError: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code',
              },
              message: {
                type: 'string',
                description: 'Error message',
              },
              field: {
                type: 'string',
                description: 'Field that caused the error (if applicable)',
              },
              details: {
                type: 'object',
                description: 'Additional error details',
              },
            },
            required: ['code', 'message'],
          },
          ApiResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                description: 'Whether the request was successful',
              },
              data: {
                description: 'Response data',
              },
              message: {
                type: 'string',
                description: 'Response message',
              },
              errors: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/ApiError',
                },
              },
              meta: {
                $ref: '#/components/schemas/ApiMeta',
              },
            },
            required: ['success'],
          },
          ApiMeta: {
            type: 'object',
            properties: {
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Response timestamp',
              },
              requestId: {
                type: 'string',
                description: 'Unique request identifier',
              },
              version: {
                type: 'string',
                description: 'API version',
              },
              pagination: {
                $ref: '#/components/schemas/PaginationMeta',
              },
            },
            required: ['timestamp', 'requestId', 'version'],
          },
          PaginationMeta: {
            type: 'object',
            properties: {
              page: {
                type: 'integer',
                minimum: 1,
                description: 'Current page number',
              },
              pageSize: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                description: 'Number of items per page',
              },
              total: {
                type: 'integer',
                minimum: 0,
                description: 'Total number of items',
              },
              totalPages: {
                type: 'integer',
                minimum: 0,
                description: 'Total number of pages',
              },
              hasNext: {
                type: 'boolean',
                description: 'Whether there is a next page',
              },
              hasPrevious: {
                type: 'boolean',
                description: 'Whether there is a previous page',
              },
            },
            required: ['page', 'pageSize', 'total', 'totalPages', 'hasNext', 'hasPrevious'],
          },
          // Onboarding schemas
          OnboardingSession: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Session identifier',
              },
              tenantId: {
                type: 'string',
                description: 'Tenant identifier',
              },
              status: {
                type: 'string',
                enum: ['not_started', 'in_progress', 'paused', 'completed', 'failed'],
                description: 'Session status',
              },
              currentStep: {
                type: 'string',
                description: 'Current step identifier',
              },
              progress: {
                type: 'number',
                minimum: 0,
                maximum: 100,
                description: 'Completion percentage',
              },
              steps: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/OnboardingStep',
                },
              },
              startedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Session start time',
              },
              completedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Session completion time',
              },
              metadata: {
                type: 'object',
                description: 'Additional session metadata',
              },
            },
            required: ['id', 'tenantId', 'status', 'progress', 'steps'],
          },
          OnboardingStep: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Step identifier',
              },
              name: {
                type: 'string',
                description: 'Step name',
              },
              description: {
                type: 'string',
                description: 'Step description',
              },
              status: {
                type: 'string',
                enum: ['not_started', 'in_progress', 'completed', 'skipped', 'failed'],
                description: 'Step status',
              },
              order: {
                type: 'integer',
                minimum: 0,
                description: 'Step order',
              },
              isRequired: {
                type: 'boolean',
                description: 'Whether the step is required',
              },
              estimatedTime: {
                type: 'integer',
                minimum: 0,
                description: 'Estimated completion time in minutes',
              },
              completedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Step completion time',
              },
            },
            required: ['id', 'name', 'status', 'order', 'isRequired'],
          },
          StartOnboardingRequest: {
            type: 'object',
            properties: {
              templateId: {
                type: 'string',
                description: 'Template to use for onboarding (optional)',
              },
              customizations: {
                type: 'object',
                description: 'Template customizations (optional)',
              },
              skipSteps: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Steps to skip (optional)',
              },
            },
          },
          // Configuration schemas
          OrganizationConfig: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Configuration identifier',
              },
              name: {
                type: 'string',
                description: 'Organization name',
              },
              website: {
                type: 'string',
                format: 'uri',
                description: 'Organization website',
              },
              industry: {
                type: 'string',
                description: 'Organization industry',
              },
              size: {
                type: 'string',
                enum: ['startup', 'small', 'medium', 'large', 'enterprise'],
                description: 'Organization size',
              },
              timezone: {
                type: 'string',
                description: 'Organization timezone',
              },
              logoUrl: {
                type: 'string',
                format: 'uri',
                description: 'Organization logo URL',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Configuration creation time',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Configuration last update time',
              },
            },
            required: ['id', 'name'],
          },
          OrganizationConfigRequest: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                minLength: 1,
                maxLength: 255,
                description: 'Organization name',
              },
              website: {
                type: 'string',
                format: 'uri',
                description: 'Organization website',
              },
              industry: {
                type: 'string',
                description: 'Organization industry',
              },
              size: {
                type: 'string',
                enum: ['startup', 'small', 'medium', 'large', 'enterprise'],
                description: 'Organization size',
              },
              timezone: {
                type: 'string',
                description: 'Organization timezone',
              },
              description: {
                type: 'string',
                maxLength: 1000,
                description: 'Organization description',
              },
            },
            required: ['name'],
          },
          // Template schemas
          OnboardingTemplate: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Template identifier',
              },
              name: {
                type: 'string',
                description: 'Template name',
              },
              description: {
                type: 'string',
                description: 'Template description',
              },
              industry: {
                type: 'string',
                description: 'Target industry',
              },
              category: {
                type: 'string',
                enum: ['complete', 'workflow', 'faq', 'email', 'dashboard'],
                description: 'Template category',
              },
              version: {
                type: 'string',
                description: 'Template version',
              },
              isOfficial: {
                type: 'boolean',
                description: 'Whether the template is official',
              },
              isPublic: {
                type: 'boolean',
                description: 'Whether the template is public',
              },
              tags: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Template tags',
              },
              rating: {
                type: 'number',
                minimum: 0,
                maximum: 5,
                description: 'Template rating',
              },
              usageCount: {
                type: 'integer',
                minimum: 0,
                description: 'Number of times template has been used',
              },
              estimatedSetupTime: {
                type: 'integer',
                minimum: 0,
                description: 'Estimated setup time in minutes',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Template creation time',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Template last update time',
              },
            },
            required: ['id', 'name', 'description', 'industry', 'category', 'version'],
          },
          // Analytics schemas
          AnalyticsDashboard: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Dashboard identifier',
              },
              name: {
                type: 'string',
                description: 'Dashboard name',
              },
              description: {
                type: 'string',
                description: 'Dashboard description',
              },
              layout: {
                $ref: '#/components/schemas/DashboardLayout',
              },
              widgets: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/DashboardWidget',
                },
              },
              isDefault: {
                type: 'boolean',
                description: 'Whether this is the default dashboard',
              },
              isPublic: {
                type: 'boolean',
                description: 'Whether the dashboard is public',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                description: 'Dashboard creation time',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                description: 'Dashboard last update time',
              },
            },
            required: ['id', 'name', 'layout', 'widgets'],
          },
          DashboardLayout: {
            type: 'object',
            properties: {
              columns: {
                type: 'integer',
                minimum: 1,
                maximum: 24,
                description: 'Number of columns',
              },
              rows: {
                type: 'integer',
                minimum: 1,
                maximum: 50,
                description: 'Number of rows',
              },
              gridSize: {
                type: 'string',
                enum: ['small', 'medium', 'large'],
                description: 'Grid size',
              },
              theme: {
                type: 'string',
                enum: ['light', 'dark', 'auto'],
                description: 'Dashboard theme',
              },
            },
            required: ['columns', 'rows', 'gridSize'],
          },
          DashboardWidget: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Widget identifier',
              },
              type: {
                type: 'string',
                enum: ['metric', 'chart', 'table', 'gauge', 'progress', 'text'],
                description: 'Widget type',
              },
              title: {
                type: 'string',
                description: 'Widget title',
              },
              position: {
                $ref: '#/components/schemas/WidgetPosition',
              },
              config: {
                type: 'object',
                description: 'Widget configuration',
              },
              refreshInterval: {
                type: 'integer',
                minimum: 0,
                description: 'Refresh interval in seconds',
              },
            },
            required: ['id', 'type', 'title', 'position'],
          },
          WidgetPosition: {
            type: 'object',
            properties: {
              x: {
                type: 'integer',
                minimum: 0,
                description: 'X position',
              },
              y: {
                type: 'integer',
                minimum: 0,
                description: 'Y position',
              },
              width: {
                type: 'integer',
                minimum: 1,
                description: 'Widget width',
              },
              height: {
                type: 'integer',
                minimum: 1,
                description: 'Widget height',
              },
            },
            required: ['x', 'y', 'width', 'height'],
          },
          DashboardRequest: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                minLength: 1,
                maxLength: 255,
                description: 'Dashboard name',
              },
              description: {
                type: 'string',
                maxLength: 1000,
                description: 'Dashboard description',
              },
              layout: {
                $ref: '#/components/schemas/DashboardLayout',
              },
              widgets: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/DashboardWidget',
                },
              },
              isPublic: {
                type: 'boolean',
                description: 'Whether the dashboard is public',
              },
            },
            required: ['name', 'layout'],
          },
        },
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token authentication',
          },
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API key authentication',
          },
        },
      },
      security: [
        {
          BearerAuth: [],
        },
        {
          ApiKeyAuth: [],
        },
      ],
      tags: [
        {
          name: 'Onboarding',
          description: 'Onboarding session management',
        },
        {
          name: 'Configuration',
          description: 'Platform configuration management',
        },
        {
          name: 'Templates',
          description: 'Onboarding template management',
        },
        {
          name: 'Analytics',
          description: 'Analytics and reporting',
        },
        {
          name: 'Integrations',
          description: 'External service integrations',
        },
        {
          name: 'Progress',
          description: 'Progress tracking and analytics',
        },
      ],
    };
  }

  /**
   * Generate API documentation in markdown format
   */
  generateMarkdownDocs(): string {
    return `
# Glavito Onboarding API Documentation

## Overview

The Glavito Onboarding API provides comprehensive endpoints for managing the onboarding process, including configuration, templates, analytics, and integrations.

## Authentication

All API endpoints require authentication using either:

1. **JWT Bearer Token**: Include in the Authorization header as \`Bearer <token>\`
2. **API Key**: Include in the X-API-Key header

## Base URL

- Production: \`https://api.glavito.com/v1\`
- Staging: \`https://staging-api.glavito.com/v1\`
- Development: \`http://localhost:3000/v1\`

## Rate Limiting

API requests are rate limited to:
- 1000 requests per hour for authenticated users
- 100 requests per hour for unauthenticated requests

## Error Handling

All errors follow a consistent format:

\`\`\`json
{
  "success": false,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input data",
      "field": "email",
      "details": {
        "expected": "valid email address",
        "received": "invalid-email"
      }
    }
  ],
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789",
    "version": "1.0.0"
  }
}
\`\`\`

## Endpoints

### Onboarding

#### GET /onboarding
Get the current onboarding session for the authenticated tenant.

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "id": "session_123",
    "tenantId": "tenant_456",
    "status": "in_progress",
    "currentStep": "organization_setup",
    "progress": 45,
    "steps": [...]
  }
}
\`\`\`

#### POST /onboarding
Start a new onboarding session.

**Request Body:**
\`\`\`json
{
  "templateId": "template_789",
  "customizations": {
    "skipPaymentSetup": true
  }
}
\`\`\`

### Configuration

#### GET /onboarding/configuration/organization
Get organization configuration settings.

#### PUT /onboarding/configuration/organization
Update organization configuration settings.

**Request Body:**
\`\`\`json
{
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "industry": "technology",
  "size": "medium",
  "timezone": "America/New_York"
}
\`\`\`

### Templates

#### GET /onboarding/templates
Get available onboarding templates with optional filtering.

**Query Parameters:**
- \`industry\`: Filter by industry (technology, ecommerce, healthcare, etc.)
- \`category\`: Filter by category (complete, workflow, faq, etc.)
- \`rating\`: Minimum rating filter (0-5)

#### POST /onboarding/templates/{templateId}/apply
Apply a template to the current tenant.

### Analytics

#### GET /onboarding/analytics/dashboards
Get analytics dashboards for the tenant.

#### POST /onboarding/analytics/dashboards
Create a new analytics dashboard.

### Integrations

#### GET /onboarding/integrations
Get all configured integrations.

#### POST /onboarding/integrations
Create a new integration.

### Progress

#### GET /onboarding/progress
Get detailed onboarding progress information.

#### POST /onboarding/progress/step/{stepId}/complete
Mark a specific step as completed.

## SDKs and Libraries

Official SDKs are available for:
- JavaScript/TypeScript
- Python
- PHP
- Ruby
- Go

## Support

For API support, contact:
- Email: api-support@glavito.com
- Documentation: https://docs.glavito.com
- Status Page: https://status.glavito.com
`;
  }

  /**
   * Get API usage statistics
   */
  getApiUsageStats(): any {
    return {
      totalEndpoints: 45,
      totalRequests: 1250000,
      averageResponseTime: 125, // ms
      uptime: 99.9,
      errorRate: 0.1,
      topEndpoints: [
        { endpoint: '/onboarding/progress', requests: 125000 },
        { endpoint: '/onboarding/configuration/organization', requests: 98000 },
        { endpoint: '/onboarding/templates', requests: 87000 },
        { endpoint: '/onboarding/analytics/dashboards', requests: 76000 },
        { endpoint: '/onboarding/integrations', requests: 65000 },
      ],
      responseTimesByEndpoint: {
        '/onboarding': 95,
        '/onboarding/configuration': 110,
        '/onboarding/templates': 140,
        '/onboarding/analytics': 180,
        '/onboarding/integrations': 160,
      },
    };
  }
}