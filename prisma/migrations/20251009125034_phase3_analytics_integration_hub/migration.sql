-- CreateTable
CREATE TABLE "public"."dashboard_layouts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "role" TEXT,
    "industry" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "layout" JSONB NOT NULL DEFAULT '[]',
    "widgets" JSONB NOT NULL DEFAULT '[]',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."custom_reports" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "industry" TEXT,
    "metrics" JSONB NOT NULL DEFAULT '[]',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "groupBy" JSONB NOT NULL DEFAULT '[]',
    "visualization" JSONB NOT NULL DEFAULT '{}',
    "schedule" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_schedules" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "time" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "recipients" TEXT[],
    "format" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "nextRun" TIMESTAMP(3) NOT NULL,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."analytics_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "industry" TEXT,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."integration_health" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastCheck" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSync" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastError" TEXT,
    "lastErrorAt" TIMESTAMP(3),
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "avgSyncTime" INTEGER,
    "apiCallsToday" INTEGER NOT NULL DEFAULT 0,
    "apiCallsMonth" INTEGER NOT NULL DEFAULT 0,
    "apiLimit" INTEGER,
    "rateLimitHit" BOOLEAN NOT NULL DEFAULT false,
    "rateLimitResetAt" TIMESTAMP(3),
    "uptime" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."integration_logs" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "direction" TEXT,
    "duration" INTEGER,
    "recordsProcessed" INTEGER,
    "recordsFailed" INTEGER,
    "dataSize" INTEGER,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "errorStack" TEXT,
    "requestId" TEXT,
    "userId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."integration_marketplace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "icon" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL,
    "documentation" TEXT,
    "websiteUrl" TEXT,
    "supportUrl" TEXT,
    "privacyUrl" TEXT,
    "termsUrl" TEXT,
    "publisher" TEXT NOT NULL,
    "publisherEmail" TEXT,
    "version" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "requiresAuth" BOOLEAN NOT NULL DEFAULT true,
    "authType" TEXT,
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "activeInstalls" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "configSchema" JSONB NOT NULL DEFAULT '{}',
    "features" JSONB NOT NULL DEFAULT '[]',
    "capabilities" JSONB NOT NULL DEFAULT '{}',
    "screenshots" TEXT[],
    "videoUrl" TEXT,
    "tags" TEXT[],
    "industries" TEXT[],
    "pricingType" TEXT NOT NULL DEFAULT 'free',
    "pricingUrl" TEXT,
    "dependencies" TEXT[],
    "webhookSupport" BOOLEAN NOT NULL DEFAULT false,
    "apiVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "integration_marketplace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."integration_reviews" (
    "id" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "review" TEXT NOT NULL,
    "pros" TEXT,
    "cons" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isHelpful" INTEGER NOT NULL DEFAULT 0,
    "isReported" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dashboard_layouts_tenantId_role_industry_idx" ON "public"."dashboard_layouts"("tenantId", "role", "industry");

-- CreateIndex
CREATE INDEX "dashboard_layouts_tenantId_isDefault_idx" ON "public"."dashboard_layouts"("tenantId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_layouts_tenantId_userId_name_key" ON "public"."dashboard_layouts"("tenantId", "userId", "name");

-- CreateIndex
CREATE INDEX "custom_reports_tenantId_category_idx" ON "public"."custom_reports"("tenantId", "category");

-- CreateIndex
CREATE INDEX "custom_reports_tenantId_createdBy_idx" ON "public"."custom_reports"("tenantId", "createdBy");

-- CreateIndex
CREATE INDEX "custom_reports_industry_idx" ON "public"."custom_reports"("industry");

-- CreateIndex
CREATE INDEX "report_schedules_tenantId_isActive_nextRun_idx" ON "public"."report_schedules"("tenantId", "isActive", "nextRun");

-- CreateIndex
CREATE INDEX "report_schedules_reportId_idx" ON "public"."report_schedules"("reportId");

-- CreateIndex
CREATE INDEX "analytics_snapshots_tenantId_snapshotDate_idx" ON "public"."analytics_snapshots"("tenantId", "snapshotDate");

-- CreateIndex
CREATE INDEX "analytics_snapshots_industry_snapshotDate_idx" ON "public"."analytics_snapshots"("industry", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_tenantId_snapshotDate_snapshotType_key" ON "public"."analytics_snapshots"("tenantId", "snapshotDate", "snapshotType");

-- CreateIndex
CREATE UNIQUE INDEX "integration_health_integrationId_key" ON "public"."integration_health"("integrationId");

-- CreateIndex
CREATE INDEX "integration_health_tenantId_status_idx" ON "public"."integration_health"("tenantId", "status");

-- CreateIndex
CREATE INDEX "integration_health_status_lastCheck_idx" ON "public"."integration_health"("status", "lastCheck");

-- CreateIndex
CREATE INDEX "integration_logs_integrationId_createdAt_idx" ON "public"."integration_logs"("integrationId", "createdAt");

-- CreateIndex
CREATE INDEX "integration_logs_tenantId_status_createdAt_idx" ON "public"."integration_logs"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "integration_logs_action_status_idx" ON "public"."integration_logs"("action", "status");

-- CreateIndex
CREATE UNIQUE INDEX "integration_marketplace_slug_key" ON "public"."integration_marketplace"("slug");

-- CreateIndex
CREATE INDEX "integration_marketplace_category_isActive_idx" ON "public"."integration_marketplace"("category", "isActive");

-- CreateIndex
CREATE INDEX "integration_marketplace_slug_idx" ON "public"."integration_marketplace"("slug");

-- CreateIndex
CREATE INDEX "integration_marketplace_rating_installCount_idx" ON "public"."integration_marketplace"("rating", "installCount");

-- CreateIndex
CREATE INDEX "integration_marketplace_industries_idx" ON "public"."integration_marketplace"("industries");

-- CreateIndex
CREATE INDEX "integration_reviews_marketplaceId_rating_idx" ON "public"."integration_reviews"("marketplaceId", "rating");

-- CreateIndex
CREATE INDEX "integration_reviews_tenantId_userId_idx" ON "public"."integration_reviews"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "integration_reviews_marketplaceId_tenantId_userId_key" ON "public"."integration_reviews"("marketplaceId", "tenantId", "userId");

-- AddForeignKey
ALTER TABLE "public"."dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."custom_reports" ADD CONSTRAINT "custom_reports_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."custom_reports" ADD CONSTRAINT "custom_reports_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_schedules" ADD CONSTRAINT "report_schedules_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."custom_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_schedules" ADD CONSTRAINT "report_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."integration_health" ADD CONSTRAINT "integration_health_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "public"."integration_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."integration_health" ADD CONSTRAINT "integration_health_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."integration_logs" ADD CONSTRAINT "integration_logs_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "public"."integration_connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."integration_logs" ADD CONSTRAINT "integration_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."integration_logs" ADD CONSTRAINT "integration_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."integration_reviews" ADD CONSTRAINT "integration_reviews_marketplaceId_fkey" FOREIGN KEY ("marketplaceId") REFERENCES "public"."integration_marketplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."integration_reviews" ADD CONSTRAINT "integration_reviews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."integration_reviews" ADD CONSTRAINT "integration_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
