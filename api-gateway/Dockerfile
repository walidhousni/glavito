# Use the official Node.js 20 image as base
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files (workspace-aware for faster caching)
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./
COPY api-gateway/package.json ./api-gateway/package.json
COPY apps/admin-dashboard/package.json ./apps/admin-dashboard/package.json
COPY libs ./libs/

# Remove any node_modules from internal libraries to prevent conflicts
RUN find libs -type d -name node_modules -exec rm -rf {} + || true

# Install all dependencies (including dev dependencies)
RUN npm ci --legacy-peer-deps

# Development stage
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV REDIS_HOST=redis
ENV REDIS_PORT=6379

EXPOSE 3000

# Healthcheck for dev container readiness
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -qO- http://localhost:3000/health/live || exit 1

# Use nodemon for development with hot reload
CMD ["npx", "nx", "serve", "api-gateway", "--host=0.0.0.0", "--port=3000"]

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the API Gateway (monorepo)
RUN npx nx build api-gateway

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Railway will inject environment variables at runtime
# Remove hardcoded sensitive values for security

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy package files for production install
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nestjs:nodejs /app/api-gateway/package.json ./api-gateway/

# Install only production dependencies
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy the built application
# The api-gateway build outputs to /app/api-gateway/dist (see webpack.config.js)
COPY --from=builder --chown=nestjs:nodejs /app/api-gateway/dist ./

USER nestjs

EXPOSE 3000

CMD ["node", "main.js"]