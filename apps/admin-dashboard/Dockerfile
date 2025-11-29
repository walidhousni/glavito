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
COPY apps/admin-dashboard/package.json ./apps/admin-dashboard/package.json
COPY api-gateway/package.json ./api-gateway/package.json
COPY libs ./libs/

# Remove any node_modules from internal libraries to prevent conflicts
RUN find libs -type d -name node_modules -exec rm -rf {} + || true

# Install all dependencies (including dev dependencies for build)
RUN npm ci --legacy-peer-deps

# Development stage
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

EXPOSE 3000

CMD ["npx", "nx", "dev", "admin-dashboard", "--host=0.0.0.0", "--port=3000"]

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=true

# Build the Next.js application using Nx
RUN npx nx build admin-dashboard

# Production stage
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Railway and other platforms can override PORT via environment variables at runtime

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-dashboard/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-dashboard/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]