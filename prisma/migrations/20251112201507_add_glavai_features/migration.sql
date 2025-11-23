-- CreateEnum
CREATE TYPE "public"."EmailProvider" AS ENUM ('SMTP', 'SES', 'SENDGRID', 'ALIYUN_DM');

-- AlterTable
ALTER TABLE "public"."ai_settings" ADD COLUMN     "autoResolveChannels" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "autoResolveConfidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
ADD COLUMN     "autoResolveEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoResolveSendResponse" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "glavaiTheme" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "public"."email_deliveries" ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "fromEmail" TEXT,
ADD COLUMN     "fromName" TEXT,
ADD COLUMN     "journeyId" TEXT,
ADD COLUMN     "provider" "public"."EmailProvider",
ADD COLUMN     "providerMessageId" TEXT,
ADD COLUMN     "replyToEmail" TEXT,
ADD COLUMN     "stepId" TEXT,
ADD COLUMN     "unsubscribeToken" TEXT;

-- CreateTable
CREATE TABLE "public"."ai_auto_resolutions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT,
    "ticketId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "intent" TEXT,
    "category" TEXT,
    "responseSent" BOOLEAN NOT NULL DEFAULT false,
    "responseMessageId" TEXT,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_auto_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ai_insight_alerts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "conversationId" TEXT,
    "ticketId" TEXT,
    "customerId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_insight_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenant_email_provider_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "public"."EmailProvider" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "credentials" JSONB NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "replyToEmail" TEXT,
    "dkimDomain" TEXT,
    "trackingDomain" TEXT,
    "ratePerSecond" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_email_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."email_suppressions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_auto_resolutions_tenantId_createdAt_idx" ON "public"."ai_auto_resolutions"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_auto_resolutions_tenantId_conversationId_idx" ON "public"."ai_auto_resolutions"("tenantId", "conversationId");

-- CreateIndex
CREATE INDEX "ai_auto_resolutions_tenantId_ticketId_idx" ON "public"."ai_auto_resolutions"("tenantId", "ticketId");

-- CreateIndex
CREATE INDEX "ai_insight_alerts_tenantId_alertType_createdAt_idx" ON "public"."ai_insight_alerts"("tenantId", "alertType", "createdAt");

-- CreateIndex
CREATE INDEX "ai_insight_alerts_tenantId_acknowledged_createdAt_idx" ON "public"."ai_insight_alerts"("tenantId", "acknowledged", "createdAt");

-- CreateIndex
CREATE INDEX "ai_insight_alerts_tenantId_conversationId_idx" ON "public"."ai_insight_alerts"("tenantId", "conversationId");

-- CreateIndex
CREATE INDEX "ai_insight_alerts_tenantId_ticketId_idx" ON "public"."ai_insight_alerts"("tenantId", "ticketId");

-- CreateIndex
CREATE INDEX "tenant_email_provider_configs_tenantId_provider_idx" ON "public"."tenant_email_provider_configs"("tenantId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_tenantId_name_key" ON "public"."email_templates"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "email_suppressions_tenantId_email_key" ON "public"."email_suppressions"("tenantId", "email");

-- AddForeignKey
ALTER TABLE "public"."ai_auto_resolutions" ADD CONSTRAINT "ai_auto_resolutions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_insight_alerts" ADD CONSTRAINT "ai_insight_alerts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tenant_email_provider_configs" ADD CONSTRAINT "tenant_email_provider_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_templates" ADD CONSTRAINT "email_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."email_suppressions" ADD CONSTRAINT "email_suppressions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
