-- CreateTable
CREATE TABLE "public"."storage_usage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER NOT NULL,
    "storageType" TEXT NOT NULL,
    "bucket" TEXT,
    "key" TEXT,
    "mimeType" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_usage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "requestId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "storage_usage_tenantId_createdAt_idx" ON "public"."storage_usage"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "storage_usage_tenantId_resourceType_idx" ON "public"."storage_usage"("tenantId", "resourceType");

-- CreateIndex
CREATE INDEX "api_usage_tenantId_createdAt_idx" ON "public"."api_usage"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "api_usage_tenantId_endpoint_idx" ON "public"."api_usage"("tenantId", "endpoint");

-- CreateIndex
CREATE INDEX "api_usage_tenantId_method_idx" ON "public"."api_usage"("tenantId", "method");

-- AddForeignKey
ALTER TABLE "public"."storage_usage" ADD CONSTRAINT "storage_usage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_usage" ADD CONSTRAINT "api_usage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
