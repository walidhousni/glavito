-- AlterTable
ALTER TABLE "public"."ai_models" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "public"."bot_agents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "operatingMode" TEXT NOT NULL DEFAULT 'draft',
    "minConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "allowedChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "guardrails" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bot_channel_bindings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "botAgentId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "routingHints" JSONB NOT NULL DEFAULT '{}',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_channel_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."integration_field_mappings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sourceEntity" TEXT NOT NULL,
    "targetEntity" TEXT,
    "mappings" JSONB NOT NULL DEFAULT '{}',
    "direction" TEXT NOT NULL DEFAULT 'both',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_field_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."retention_campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "campaignType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "successMetrics" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."model_training_jobs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "trainingDataSize" INTEGER NOT NULL,
    "hyperparameters" JSONB NOT NULL DEFAULT '{}',
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "logs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_training_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."model_ab_tests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "models" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "results" JSONB NOT NULL DEFAULT '[]',
    "winner" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_ab_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."model_retraining_schedules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "schedule" JSONB NOT NULL DEFAULT '{}',
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_retraining_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."model_monitoring_alerts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "model_monitoring_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bot_agents_tenantId_isActive_idx" ON "public"."bot_agents"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "bot_channel_bindings_tenantId_channelType_isEnabled_idx" ON "public"."bot_channel_bindings"("tenantId", "channelType", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "bot_channel_bindings_tenantId_botAgentId_channelId_key" ON "public"."bot_channel_bindings"("tenantId", "botAgentId", "channelId");

-- CreateIndex
CREATE INDEX "integration_field_mappings_tenantId_provider_sourceEntity_idx" ON "public"."integration_field_mappings"("tenantId", "provider", "sourceEntity");

-- CreateIndex
CREATE INDEX "retention_campaigns_tenantId_customerId_idx" ON "public"."retention_campaigns"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "retention_campaigns_tenantId_status_idx" ON "public"."retention_campaigns"("tenantId", "status");

-- CreateIndex
CREATE INDEX "retention_campaigns_tenantId_campaignType_idx" ON "public"."retention_campaigns"("tenantId", "campaignType");

-- CreateIndex
CREATE INDEX "model_training_jobs_tenantId_modelId_idx" ON "public"."model_training_jobs"("tenantId", "modelId");

-- CreateIndex
CREATE INDEX "model_training_jobs_tenantId_status_idx" ON "public"."model_training_jobs"("tenantId", "status");

-- CreateIndex
CREATE INDEX "model_ab_tests_tenantId_status_idx" ON "public"."model_ab_tests"("tenantId", "status");

-- CreateIndex
CREATE INDEX "model_retraining_schedules_tenantId_modelId_idx" ON "public"."model_retraining_schedules"("tenantId", "modelId");

-- CreateIndex
CREATE INDEX "model_retraining_schedules_tenantId_isActive_idx" ON "public"."model_retraining_schedules"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "model_monitoring_alerts_tenantId_modelId_idx" ON "public"."model_monitoring_alerts"("tenantId", "modelId");

-- CreateIndex
CREATE INDEX "model_monitoring_alerts_tenantId_status_idx" ON "public"."model_monitoring_alerts"("tenantId", "status");

-- CreateIndex
CREATE INDEX "model_monitoring_alerts_tenantId_severity_idx" ON "public"."model_monitoring_alerts"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "ai_models_tenantId_type_idx" ON "public"."ai_models"("tenantId", "type");

-- CreateIndex
CREATE INDEX "ai_models_tenantId_status_idx" ON "public"."ai_models"("tenantId", "status");

-- CreateIndex
CREATE INDEX "customer_segments_tenantId_isActive_idx" ON "public"."customer_segments"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "customer_segments_tenantId_isDynamic_idx" ON "public"."customer_segments"("tenantId", "isDynamic");

-- CreateIndex
CREATE INDEX "customer_segments_tenantId_createdAt_idx" ON "public"."customer_segments"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "customer_segments_tenantId_updatedAt_idx" ON "public"."customer_segments"("tenantId", "updatedAt");

-- CreateIndex
CREATE INDEX "customer_segments_tenantId_name_idx" ON "public"."customer_segments"("tenantId", "name");

-- CreateIndex
CREATE INDEX "deals_tenantId_pipelineId_idx" ON "public"."deals"("tenantId", "pipelineId");

-- CreateIndex
CREATE INDEX "deals_tenantId_customerId_idx" ON "public"."deals"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "deals_tenantId_createdAt_idx" ON "public"."deals"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "deals_tenantId_updatedAt_idx" ON "public"."deals"("tenantId", "updatedAt");

-- CreateIndex
CREATE INDEX "deals_tenantId_actualCloseDate_idx" ON "public"."deals"("tenantId", "actualCloseDate");

-- CreateIndex
CREATE INDEX "deals_tenantId_name_idx" ON "public"."deals"("tenantId", "name");

-- CreateIndex
CREATE INDEX "deals_tenantId_value_idx" ON "public"."deals"("tenantId", "value");

-- CreateIndex
CREATE INDEX "deals_tenantId_tags_idx" ON "public"."deals"("tenantId", "tags");

-- CreateIndex
CREATE INDEX "deals_tenantId_probability_idx" ON "public"."deals"("tenantId", "probability");

-- CreateIndex
CREATE INDEX "leads_tenantId_email_idx" ON "public"."leads"("tenantId", "email");

-- CreateIndex
CREATE INDEX "leads_tenantId_company_idx" ON "public"."leads"("tenantId", "company");

-- CreateIndex
CREATE INDEX "leads_tenantId_createdAt_idx" ON "public"."leads"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "leads_tenantId_updatedAt_idx" ON "public"."leads"("tenantId", "updatedAt");

-- CreateIndex
CREATE INDEX "leads_tenantId_score_idx" ON "public"."leads"("tenantId", "score");

-- CreateIndex
CREATE INDEX "leads_tenantId_source_idx" ON "public"."leads"("tenantId", "source");

-- CreateIndex
CREATE INDEX "leads_tenantId_firstName_lastName_idx" ON "public"."leads"("tenantId", "firstName", "lastName");

-- CreateIndex
CREATE INDEX "leads_tenantId_tags_idx" ON "public"."leads"("tenantId", "tags");

-- CreateIndex
CREATE INDEX "leads_tenantId_lastActivityAt_idx" ON "public"."leads"("tenantId", "lastActivityAt");

-- AddForeignKey
ALTER TABLE "public"."bot_agents" ADD CONSTRAINT "bot_agents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bot_channel_bindings" ADD CONSTRAINT "bot_channel_bindings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bot_channel_bindings" ADD CONSTRAINT "bot_channel_bindings_botAgentId_fkey" FOREIGN KEY ("botAgentId") REFERENCES "public"."bot_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bot_channel_bindings" ADD CONSTRAINT "bot_channel_bindings_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "public"."channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."integration_field_mappings" ADD CONSTRAINT "integration_field_mappings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."retention_campaigns" ADD CONSTRAINT "retention_campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."model_training_jobs" ADD CONSTRAINT "model_training_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."model_ab_tests" ADD CONSTRAINT "model_ab_tests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."model_retraining_schedules" ADD CONSTRAINT "model_retraining_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."model_monitoring_alerts" ADD CONSTRAINT "model_monitoring_alerts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
