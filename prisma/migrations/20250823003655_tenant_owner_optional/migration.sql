/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,type]` on the table `channels` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."tenants" DROP CONSTRAINT "tenants_ownerId_fkey";

-- AlterTable
ALTER TABLE "public"."calls" ADD COLUMN     "direction" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "fromNumber" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "toNumber" TEXT,
ADD COLUMN     "transcriptionLanguage" TEXT,
ADD COLUMN     "transcriptionProvider" TEXT,
ADD COLUMN     "transcriptionStatus" TEXT;

-- AlterTable
ALTER TABLE "public"."knowledge_base" ADD COLUMN     "deprecated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN     "nextReviewAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."teams" ADD COLUMN     "parentTeamId" TEXT;

-- AlterTable
ALTER TABLE "public"."tenants" ADD COLUMN     "slug" TEXT,
ALTER COLUMN "ownerId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."knowledge_entities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_relations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "sourceArticleId" TEXT,
    "targetArticleId" TEXT,
    "sourceEntityId" TEXT,
    "targetEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_article_versions" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "changeSummary" TEXT,

    CONSTRAINT "knowledge_article_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_approvals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "knowledge_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_article_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT,
    "customerId" TEXT,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_article_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."internal_channels" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "teamId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."internal_channel_participants" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_channel_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."internal_messages" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."coaching_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "agentUserId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "notes" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "feedbackScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coaching_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shifts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teamId" TEXT,
    "userId" TEXT,
    "title" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."saved_searches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT,
    "filters" JSONB,
    "semantic" BOOLEAN NOT NULL DEFAULT false,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."search_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "q" TEXT,
    "filters" JSONB,
    "results" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."call_metrics" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rttMs" DOUBLE PRECISION,
    "jitterMs" DOUBLE PRECISION,
    "bitrateUp" DOUBLE PRECISION,
    "bitrateDown" DOUBLE PRECISION,
    "packetLossUp" DOUBLE PRECISION,
    "packetLossDown" DOUBLE PRECISION,

    CONSTRAINT "call_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."call_usage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "costCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."marketplace_items" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "priceCents" INTEGER,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "installCount" INTEGER NOT NULL DEFAULT 0,
    "vendorName" TEXT NOT NULL,
    "vendorUrl" TEXT,
    "repoUrl" TEXT,
    "iconUrl" TEXT,
    "screenshots" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "content" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."marketplace_reviews" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenant_installations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'installed',
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "installedBy" TEXT NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_installations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_entities_tenantId_type_name_key" ON "public"."knowledge_entities"("tenantId", "type", "name");

-- CreateIndex
CREATE INDEX "knowledge_relations_tenantId_relationType_idx" ON "public"."knowledge_relations"("tenantId", "relationType");

-- CreateIndex
CREATE INDEX "knowledge_relations_sourceArticleId_idx" ON "public"."knowledge_relations"("sourceArticleId");

-- CreateIndex
CREATE INDEX "knowledge_relations_targetArticleId_idx" ON "public"."knowledge_relations"("targetArticleId");

-- CreateIndex
CREATE INDEX "knowledge_relations_sourceEntityId_idx" ON "public"."knowledge_relations"("sourceEntityId");

-- CreateIndex
CREATE INDEX "knowledge_relations_targetEntityId_idx" ON "public"."knowledge_relations"("targetEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_article_versions_articleId_version_key" ON "public"."knowledge_article_versions"("articleId", "version");

-- CreateIndex
CREATE INDEX "knowledge_approvals_tenantId_status_idx" ON "public"."knowledge_approvals"("tenantId", "status");

-- CreateIndex
CREATE INDEX "knowledge_article_events_tenantId_eventType_createdAt_idx" ON "public"."knowledge_article_events"("tenantId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "internal_channels_tenantId_type_idx" ON "public"."internal_channels"("tenantId", "type");

-- CreateIndex
CREATE INDEX "internal_channel_participants_userId_idx" ON "public"."internal_channel_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "internal_channel_participants_channelId_userId_key" ON "public"."internal_channel_participants"("channelId", "userId");

-- CreateIndex
CREATE INDEX "internal_messages_channelId_createdAt_idx" ON "public"."internal_messages"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "coaching_sessions_tenantId_status_idx" ON "public"."coaching_sessions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "shifts_tenantId_startTime_idx" ON "public"."shifts"("tenantId", "startTime");

-- CreateIndex
CREATE INDEX "saved_searches_tenantId_userId_idx" ON "public"."saved_searches"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_searches_tenantId_userId_name_key" ON "public"."saved_searches"("tenantId", "userId", "name");

-- CreateIndex
CREATE INDEX "search_events_tenantId_createdAt_idx" ON "public"."search_events"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "call_metrics_callId_timestamp_idx" ON "public"."call_metrics"("callId", "timestamp");

-- CreateIndex
CREATE INDEX "call_usage_tenantId_createdAt_idx" ON "public"."call_usage"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "call_usage_callId_key" ON "public"."call_usage"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_items_slug_key" ON "public"."marketplace_items"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_installations_tenantId_itemId_key" ON "public"."tenant_installations"("tenantId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "channels_tenantId_type_key" ON "public"."channels"("tenantId", "type");

-- CreateIndex
CREATE INDEX "conversations_tenantId_status_idx" ON "public"."conversations"("tenantId", "status");

-- CreateIndex
CREATE INDEX "conversations_tenantId_createdAt_idx" ON "public"."conversations"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "customers_tenantId_createdAt_idx" ON "public"."customers"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "customers_tenantId_lastName_firstName_idx" ON "public"."customers"("tenantId", "lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "public"."tenants"("slug");

-- CreateIndex
CREATE INDEX "tickets_tenantId_status_priority_idx" ON "public"."tickets"("tenantId", "status", "priority");

-- CreateIndex
CREATE INDEX "tickets_tenantId_createdAt_idx" ON "public"."tickets"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "tickets_tenantId_assignedAgentId_idx" ON "public"."tickets"("tenantId", "assignedAgentId");

-- AddForeignKey
ALTER TABLE "public"."tenants" ADD CONSTRAINT "tenants_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_entities" ADD CONSTRAINT "knowledge_entities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_relations" ADD CONSTRAINT "knowledge_relations_sourceArticleId_fkey" FOREIGN KEY ("sourceArticleId") REFERENCES "public"."knowledge_base"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_relations" ADD CONSTRAINT "knowledge_relations_targetArticleId_fkey" FOREIGN KEY ("targetArticleId") REFERENCES "public"."knowledge_base"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_relations" ADD CONSTRAINT "knowledge_relations_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "public"."knowledge_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_relations" ADD CONSTRAINT "knowledge_relations_targetEntityId_fkey" FOREIGN KEY ("targetEntityId") REFERENCES "public"."knowledge_entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_relations" ADD CONSTRAINT "knowledge_relations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_article_versions" ADD CONSTRAINT "knowledge_article_versions_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."knowledge_base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_article_versions" ADD CONSTRAINT "knowledge_article_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_approvals" ADD CONSTRAINT "knowledge_approvals_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."knowledge_base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_approvals" ADD CONSTRAINT "knowledge_approvals_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_approvals" ADD CONSTRAINT "knowledge_approvals_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_approvals" ADD CONSTRAINT "knowledge_approvals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_article_events" ADD CONSTRAINT "knowledge_article_events_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."knowledge_base"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_article_events" ADD CONSTRAINT "knowledge_article_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_article_events" ADD CONSTRAINT "knowledge_article_events_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_article_events" ADD CONSTRAINT "knowledge_article_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_parentTeamId_fkey" FOREIGN KEY ("parentTeamId") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."internal_channels" ADD CONSTRAINT "internal_channels_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."internal_channels" ADD CONSTRAINT "internal_channels_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."internal_channels" ADD CONSTRAINT "internal_channels_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."internal_channel_participants" ADD CONSTRAINT "internal_channel_participants_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "public"."internal_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."internal_channel_participants" ADD CONSTRAINT "internal_channel_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."internal_messages" ADD CONSTRAINT "internal_messages_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "public"."internal_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."internal_messages" ADD CONSTRAINT "internal_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coaching_sessions" ADD CONSTRAINT "coaching_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coaching_sessions" ADD CONSTRAINT "coaching_sessions_coachUserId_fkey" FOREIGN KEY ("coachUserId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coaching_sessions" ADD CONSTRAINT "coaching_sessions_agentUserId_fkey" FOREIGN KEY ("agentUserId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shifts" ADD CONSTRAINT "shifts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shifts" ADD CONSTRAINT "shifts_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shifts" ADD CONSTRAINT "shifts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."saved_searches" ADD CONSTRAINT "saved_searches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."saved_searches" ADD CONSTRAINT "saved_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."search_events" ADD CONSTRAINT "search_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."search_events" ADD CONSTRAINT "search_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."call_metrics" ADD CONSTRAINT "call_metrics_callId_fkey" FOREIGN KEY ("callId") REFERENCES "public"."calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."call_usage" ADD CONSTRAINT "call_usage_callId_fkey" FOREIGN KEY ("callId") REFERENCES "public"."calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."call_usage" ADD CONSTRAINT "call_usage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."marketplace_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tenant_installations" ADD CONSTRAINT "tenant_installations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tenant_installations" ADD CONSTRAINT "tenant_installations_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."marketplace_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
