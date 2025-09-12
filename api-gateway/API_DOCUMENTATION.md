# Glavito API Gateway Documentation

## Overview

The Glavito API Gateway is a comprehensive, production-ready NestJS application that serves as the central hub for the multi-tenant customer service platform. It includes:

- **Swagger/OpenAPI Documentation** - Interactive API documentation
- **OpenTelemetry Integration** - Distributed tracing and metrics
- **Comprehensive Health Checks** - Kubernetes-ready probes
- **Security Best Practices** - Helmet, CORS, rate limiting
- **Error Handling** - Consistent error responses with request IDs
- **Logging** - Structured logging with request tracing

## Features

### 🔍 API Documentation
- **Interactive Swagger UI**: Available at `/docs` in development
- **OpenAPI 3.0 Specification**: JSON available at `/docs-json`
- **Comprehensive Tagging**: Organized by resource type
- **Authentication Documentation**: Bearer token, OAuth2, and API key examples

### 📊 Monitoring & Observability
- **Distributed Tracing**: OpenTelemetry with Jaeger/Zipkin support
- **Metrics**: Prometheus-compatible metrics endpoint
- **Health Checks**: `/health`, `/health/ready`, `/health/live`
- **Structured Logging**: Request IDs and correlation

### 🔒 Security
- **Helmet**: Security headers
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Request throttling
- **Input Validation**: Class-validator with DTOs
- **Error Handling**: Consistent error responses

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Kafka (optional)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.development
   # Edit .env.development with your configuration
   ```

3. **Set up the database**:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

4. **Start the development server**:
   ```bash
   npm run dev:api
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `NODE_ENV` | Environment | `development` |
| `JAEGER_ENDPOINT` | Jaeger collector endpoint | `http://localhost:14268/api/traces` |
| `PROMETHEUS_PORT` | Prometheus metrics port | `9464` |

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Tenants
- `GET /api/tenants` - List tenants
- `GET /api/tenants/:id` - Get tenant by ID
- `POST /api/tenants` - Create tenant
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

### Tickets
- `GET /api/tickets` - List tickets
- `GET /api/tickets/:id` - Get ticket by ID
- `POST /api/tickets` - Create ticket
- `PUT /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket

### Customers
- `GET /api/customers` - List customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

## Response Format

### Success Response
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "uuid-12345",
    "path": "/api/users",
    "method": "GET",
    "version": "1.0.0"
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/users",
  "method": "POST",
  "requestId": "uuid-12345",
  "validationErrors": [
    {
      "property": "email",
      "constraints": {
        "isEmail": "email must be an email"
      }
    }
  ]
}
```

## Authentication

### Bearer Token
Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### API Key
Include the API key in the X-API-KEY header:
```
X-API-KEY: <your-api-key>
```

## Monitoring

### Health Checks
- **Health**: `GET /api/health` - Overall system health
- **Readiness**: `GET /api/health/ready` - Ready to serve traffic
- **Liveness**: `GET /api/health/live` - Service is alive

### Metrics
Prometheus metrics are available at `/api/health/metrics`:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration
- `active_connections` - Active connections
- `tenants_total` - Total tenants
- `users_total` - Total users

### Tracing
Distributed tracing is available via:
- **Jaeger**: http://localhost:16686
- **Zipkin**: http://localhost:9411

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Database Management
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Reset database
npm run db:reset

# Open Prisma Studio
npm run db:studio
```

### Docker Development
```bash
# Start with Docker
npm run dev:docker

# Start detached
npm run dev:docker:detached

# Stop containers
npm run docker:down

# Clean up
npm run docker:clean
```

## Production Deployment

### Environment Variables
Set production environment variables:
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@prod-db:5432/glavito
REDIS_URL=redis://prod-redis:6379
JWT_SECRET=your-production-jwt-secret
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
```

### Build and Deploy
```bash
# Build for production
npm run build

# Start production server
npm start
```

## Support

For support, please contact:
- **Email**: support@glavito.com
- **Documentation**: https://docs.glavito.com
- **Issues**: https://github.com/glavito/api-gateway/issues