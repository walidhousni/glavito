# 🚀 Glavito Workspace

A comprehensive, enterprise-grade customer support platform built with modern technologies including Next.js, NestJS, and microservices architecture. Glavito provides multi-channel communication, AI-powered automation, CRM capabilities, and advanced analytics.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)

## 🏗️ Architecture Overview

Glavito is built on a modern microservices architecture with event-driven communication, real-time processing, and intelligent automation.

### 🎯 Core Applications

- **Admin Dashboard** (`apps/admin-dashboard`) - Next.js 15 admin interface with modern UI/UX
- **API Gateway** (`api-gateway`) - NestJS backend API with comprehensive microservices

### 🔧 Infrastructure Stack

- **PostgreSQL 15** - Primary database with Prisma ORM
- **Redis 7** - Caching, session storage, and real-time features
- **Apache Kafka** - Message queuing and event streaming
- **N8N** - Workflow automation and integration platform
- **Elasticsearch** - Advanced search and analytics
- **Docker & Docker Compose** - Containerization and orchestration

### 📚 Shared Libraries (`libs/shared/`)

- **AI Intelligence** (`ai`) - OpenAI/Anthropic integration, NLP, sentiment analysis
- **Analytics** (`analytics`) - Real-time metrics, reporting, and insights
- **Authentication** (`auth`) - JWT, OAuth, SSO, and permission management
- **Conversation** (`conversation`) - Multi-channel message orchestration
- **Database** (`database`) - Prisma service and database utilities
- **Kafka** (`kafka`) - Event streaming and message bus
- **Redis** (`redis`) - Caching and session management
- **Types** (`types`) - Shared TypeScript interfaces and types
- **Workflow** (`workflow`) - N8N integration and automation

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **Docker** and **Docker Compose**
- **Git**

### 🛠️ Local Development Setup

#### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd glavito-workspace

# Install dependencies
npm install

# Run automated setup
npm run dev:setup

# Start all services
npm run dev:docker
```

#### Option 2: Manual Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd glavito-workspace
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.development.local
   # Edit .env.development.local with your configuration
   ```

3. **Start infrastructure services**
   ```bash
   docker-compose up -d postgres redis kafka zookeeper n8n
   ```

4. **Set up database**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start applications**
   ```bash
   # Terminal 1: API Gateway
   npm run dev:api
   
   # Terminal 2: Admin Dashboard
   npm run dev:admin
   ```

### 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Admin Dashboard** | http://localhost:3000 | Main admin interface |
| **API Gateway** | http://localhost:3001 | REST API |
| **API Documentation** | http://localhost:3001/api | Swagger/OpenAPI docs |
| **N8N Workflows** | http://localhost:5678 | Workflow automation |
| **Prisma Studio** | http://localhost:5555 | Database management |
| **Grafana** | http://localhost:3005 | Monitoring dashboards |
| **Kibana** | http://localhost:5601 | Search analytics |
| **MinIO Console** | http://localhost:9001 | Object storage |

## 📁 Project Structure

```
glavito-workspace/
├── 📱 apps/
│   └── admin-dashboard/          # Next.js 15 admin interface
│       ├── src/
│       │   ├── app/              # App Router pages
│       │   ├── components/       # Reusable UI components
│       │   ├── lib/              # Utilities and stores
│       │   └── messages/         # i18n translations
│       ├── Dockerfile
│       └── next.config.js
├── 🚪 api-gateway/               # NestJS API Gateway
│   ├── src/
│   │   ├── app/                  # Feature modules
│   │   │   ├── auth/             # Authentication & authorization
│   │   │   ├── crm/              # CRM features (leads, deals, pipelines)
│   │   │   ├── channels/         # Multi-channel communication
│   │   │   ├── customers/        # Customer management
│   │   │   ├── tickets/          # Ticket system
│   │   │   ├── analytics/        # Analytics & reporting
│   │   │   ├── ai/               # AI intelligence
│   │   │   ├── onboarding/       # User onboarding
│   │   │   └── marketing/        # Marketing automation
│   │   ├── common/               # Shared utilities
│   │   └── main.ts
│   └── Dockerfile
├── 📚 libs/shared/               # Shared libraries
│   ├── ai/                       # AI intelligence service
│   ├── analytics/                # Analytics and reporting
│   ├── auth/                     # Authentication utilities
│   ├── conversation/             # Conversation orchestration
│   ├── database/                 # Database utilities
│   ├── kafka/                    # Event streaming
│   ├── redis/                    # Caching service
│   ├── types/                    # Shared TypeScript types
│   └── workflow/                 # N8N integration
├── 🗄️ prisma/                    # Database schema and migrations
│   ├── schema.prisma             # Database schema
│   ├── migrations/               # Database migrations
│   └── seed.js                   # Database seeding
├── 🐳 docker-compose.yml         # Development environment
├── 📋 package.json               # Root package configuration
└── 📖 README.md                  # This file
```

## 🎯 Key Features

### 🎫 Advanced Ticket Management
- **Multi-channel support**: WhatsApp, Instagram, Email, Web
- **AI-powered routing**: Intelligent ticket assignment and prioritization
- **SLA monitoring**: Automatic escalation and deadline tracking
- **Collaboration tools**: Internal notes, mentions, and team collaboration
- **Bulk operations**: Mass ticket updates and actions

### 🤖 AI Intelligence
- **Sentiment analysis**: Real-time emotion and sentiment detection
- **Intent classification**: Automatic categorization of customer requests
- **Response suggestions**: AI-generated response recommendations
- **Knowledge suggestions**: Relevant FAQ and knowledge base articles
- **Escalation prediction**: Proactive escalation recommendations
- **Sales coaching**: AI-powered sales performance analysis

### 📊 CRM & Analytics
- **Lead management**: Complete lead lifecycle with scoring
- **Deal pipelines**: Visual pipeline management with drag-and-drop
- **Customer segmentation**: Dynamic customer grouping
- **Marketing campaigns**: Multi-channel campaign management
- **Advanced analytics**: Real-time dashboards and reporting
- **Predictive analytics**: Churn prediction and customer health scoring

### 🔄 Workflow Automation
- **N8N integration**: Visual workflow builder
- **Multi-channel automation**: Cross-platform automation rules
- **Custom triggers**: Event-based workflow execution
- **Template library**: Pre-built workflow templates
- **Conditional logic**: Complex business rule automation

### 👥 Team Management
- **Role-based permissions**: Granular access control
- **Team collaboration**: Internal messaging and channels
- **Performance tracking**: Agent performance metrics
- **Coaching tools**: Sales coaching and feedback system
- **Availability management**: Shift scheduling and availability

### 🌐 Multi-Tenant Architecture
- **White-labeling**: Custom branding and themes
- **Tenant isolation**: Secure multi-tenant data separation
- **Custom domains**: Tenant-specific domain support
- **Feature toggles**: Per-tenant feature control
- **API keys**: Tenant-scoped API access

## 🛠️ Development Commands

### 🏗️ Build & Development
```bash
# Build all applications
npm run build

# Build specific application
npx nx build admin-dashboard
npx nx build api-gateway

# Start development servers
npm run dev              # Both API and Dashboard
npm run dev:api          # API Gateway only
npm run dev:admin        # Admin Dashboard only
```

### 🧪 Testing
```bash
# Run all tests
npm run test:all

# Run tests for specific app
npx nx test admin-dashboard
npx nx test api-gateway

# Run tests with coverage
npx nx test admin-dashboard --coverage
```

### 🔍 Code Quality
```bash
# Lint all code
npm run lint:all

# Lint specific app
npx nx lint admin-dashboard
npx nx lint api-gateway

# Type checking
npm run typecheck:all
```

### 🗄️ Database Operations
```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Reset database
npm run db:reset

# Seed database with sample data
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

### 🐳 Docker Operations
```bash
# Start all services
npm run dev:docker

# Start in detached mode
npm run dev:docker:detached

# Build Docker images
npm run docker:build

# Stop all services
npm run docker:down

# Clean up (remove volumes)
npm run docker:clean
```

### 🤖 N8N Workflow Automation
```bash
# Setup N8N
npm run n8n:setup

# Start N8N service
npm run n8n:start

# Stop N8N service
npm run n8n:stop

# Test N8N integration
npm run n8n:test

# View N8N logs
npm run n8n:logs
```

## 🔧 Configuration

### 🌍 Environment Variables

Create `.env.development.local` with the following variables:

```env
# Database
DATABASE_URL="postgresql://walid:elder@localhost:5432/glavito"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Authentication
JWT_SECRET="your-jwt-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"

# API Configuration
NODE_ENV="development"
PORT=3001

# AI Services
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"

# N8N Integration
N8N_BASE_URL="http://localhost:5678"
N8N_API_KEY="your-n8n-api-key"

# Email Configuration (Brevo SMTP)
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_USER="your-brevo-email"
SMTP_PASS="your-brevo-password"

# File Storage
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="your-aws-region"
AWS_S3_BUCKET="your-s3-bucket"

# Monitoring
JAEGER_ENDPOINT="http://localhost:14268/api/traces"
PROMETHEUS_PORT=9464
```

### 🗄️ Database Schema

The project uses Prisma ORM with PostgreSQL. Key entities include:

- **Tenants**: Multi-tenant organization management
- **Users**: Authentication and user management
- **Customers**: Customer profiles and data
- **Tickets**: Support ticket management
- **Conversations**: Multi-channel message threads
- **Channels**: Communication channel configurations
- **Teams**: Team management and collaboration
- **Analytics**: Metrics and reporting data
- **AI Analysis**: AI-generated insights and predictions

## 📊 API Documentation

### 🔐 Authentication Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Password reset

### 👥 User Management
- `GET /api/users` - List users with pagination
- `GET /api/users/:id` - Get user details
- `POST /api/users` - Create new user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### 🎫 Ticket Management
- `GET /api/tickets` - List tickets with filters
- `GET /api/tickets/:id` - Get ticket details
- `POST /api/tickets` - Create new ticket
- `PATCH /api/tickets/:id` - Update ticket
- `DELETE /api/tickets/:id` - Delete ticket
- `POST /api/tickets/:id/assign` - Assign ticket
- `POST /api/tickets/:id/escalate` - Escalate ticket

### 👤 Customer Management
- `GET /api/customers` - List customers
- `GET /api/customers/:id` - Get customer profile
- `POST /api/customers` - Create customer
- `PATCH /api/customers/:id` - Update customer
- `GET /api/customers/:id/history` - Customer interaction history

### 💼 CRM Endpoints
- `GET /api/crm/leads` - List leads
- `POST /api/crm/leads` - Create lead
- `GET /api/crm/deals` - List deals
- `POST /api/crm/deals` - Create deal
- `GET /api/crm/pipelines` - List sales pipelines

### 📊 Analytics
- `GET /api/analytics/overview` - Dashboard overview
- `GET /api/analytics/tickets` - Ticket analytics
- `GET /api/analytics/customers` - Customer analytics
- `GET /api/analytics/performance` - Agent performance

### 🤖 AI Intelligence
- `POST /api/ai/analyze` - Analyze content
- `GET /api/ai/insights` - Get AI insights
- `POST /api/ai/coaching` - Sales coaching analysis

### 🔄 Workflows
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `POST /api/workflows/:id/execute` - Execute workflow

## 🚢 Deployment

### 🐳 Docker Deployment

1. **Build production images**
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```

2. **Deploy with Docker Compose**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### ☁️ Cloud Deployment

#### Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy to Railway
railway login
railway init
railway up
```

#### Docker Swarm
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml glavito
```

### 🔧 Production Configuration

Create `.env.production` with production values:

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@prod-db:5432/glavito"
REDIS_URL="redis://prod-redis:6379"
JWT_SECRET="your-production-jwt-secret"
```

## 🧪 Testing

### 🔬 Unit Tests
```bash
# Run all unit tests
npm run test:all

# Run tests with coverage
npm run test:coverage
```

### 🧪 Integration Tests
```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:e2e
```

### 📊 Performance Tests
```bash
# Smoke tests
npm run perf:smoke

# Baseline performance
npm run perf:baseline
```

## 📈 Monitoring & Observability

### 📊 Metrics & Monitoring
- **Prometheus**: Metrics collection at http://localhost:9090
- **Grafana**: Dashboards at http://localhost:3005
- **Health Checks**: `/health`, `/health/ready`, `/health/live`

### 🔍 Logging & Tracing
- **Structured Logging**: JSON-formatted logs with request IDs
- **Distributed Tracing**: OpenTelemetry with Jaeger
- **Error Tracking**: Comprehensive error logging and monitoring

### 📋 Available Dashboards
- **System Overview**: CPU, memory, disk usage
- **Application Metrics**: Request rates, response times
- **Business Metrics**: Ticket volumes, resolution times
- **AI Performance**: Model accuracy, processing times

## 🤝 Contributing

### 📝 Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests and linting**
   ```bash
   npm run test:all
   npm run lint:all
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### 📋 Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for code quality
- **Prettier**: Consistent code formatting
- **Conventional Commits**: Standardized commit messages
- **Testing**: Comprehensive test coverage required

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### 📚 Documentation
- **API Documentation**: http://localhost:3001/api (Swagger UI)
- **Database Schema**: See `prisma/schema.prisma`
- **Component Library**: See `apps/admin-dashboard/src/components`

### 🐛 Issue Reporting
- **Bug Reports**: Use GitHub Issues
- **Feature Requests**: Use GitHub Discussions
- **Security Issues**: Email security@glavito.com

### 💬 Community
- **Discord**: Join our community server
- **GitHub Discussions**: Ask questions and share ideas
- **Documentation**: Comprehensive guides and tutorials

---

## 🎉 Getting Started Checklist

- [ ] Clone the repository
- [ ] Install dependencies (`npm install`)
- [ ] Set up environment variables
- [ ] Start infrastructure services (`docker-compose up -d`)
- [ ] Run database migrations (`npm run db:migrate`)
- [ ] Seed the database (`npm run db:seed`)
- [ ] Start the applications (`npm run dev`)
- [ ] Visit http://localhost:3000 to access the admin dashboard
- [ ] Visit http://localhost:3001/api to explore the API documentation

**Happy coding! 🚀**