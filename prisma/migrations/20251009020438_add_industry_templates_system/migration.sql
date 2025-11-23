-- AlterTable
ALTER TABLE "public"."custom_field_definitions" ADD COLUMN     "formula" TEXT,
ADD COLUMN     "helpText" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "lookupEntity" TEXT,
ADD COLUMN     "lookupField" TEXT,
ADD COLUMN     "placeholder" TEXT,
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."industry_templates" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "customFieldsSchema" JSONB NOT NULL DEFAULT '{}',
    "workflowTemplates" JSONB NOT NULL DEFAULT '[]',
    "slaTemplates" JSONB NOT NULL DEFAULT '[]',
    "routingRules" JSONB NOT NULL DEFAULT '{}',
    "dashboardLayouts" JSONB NOT NULL DEFAULT '{}',
    "analyticsPresets" JSONB NOT NULL DEFAULT '[]',
    "pipelineStages" JSONB NOT NULL DEFAULT '{}',
    "automationRecipes" JSONB NOT NULL DEFAULT '[]',
    "integrationPacks" JSONB NOT NULL DEFAULT '[]',
    "portalTheme" JSONB NOT NULL DEFAULT '{}',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industry_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."industry_template_applications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedBy" TEXT,
    "customizations" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "industry_template_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tenant_industry_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "primaryIndustry" TEXT,
    "subIndustries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "companySize" TEXT,
    "region" TEXT,
    "customizations" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_industry_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."custom_field_packs" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."routing_strategies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "strategy" TEXT NOT NULL,
    "configuration" JSONB NOT NULL DEFAULT '{}',
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "avgAssignmentTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routing_strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."industry_benchmarks" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "percentile25" DOUBLE PRECISION,
    "percentile50" DOUBLE PRECISION,
    "percentile75" DOUBLE PRECISION,
    "percentile90" DOUBLE PRECISION,
    "sampleSize" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "region" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industry_benchmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "industry_templates_industry_isActive_idx" ON "public"."industry_templates"("industry", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "industry_templates_industry_name_key" ON "public"."industry_templates"("industry", "name");

-- CreateIndex
CREATE INDEX "industry_template_applications_tenantId_templateId_idx" ON "public"."industry_template_applications"("tenantId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_industry_profiles_tenantId_key" ON "public"."tenant_industry_profiles"("tenantId");

-- CreateIndex
CREATE INDEX "custom_field_packs_industry_isActive_idx" ON "public"."custom_field_packs"("industry", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_packs_industry_name_key" ON "public"."custom_field_packs"("industry", "name");

-- CreateIndex
CREATE INDEX "routing_strategies_tenantId_isActive_idx" ON "public"."routing_strategies"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "routing_strategies_tenantId_name_key" ON "public"."routing_strategies"("tenantId", "name");

-- CreateIndex
CREATE INDEX "industry_benchmarks_industry_metric_periodStart_idx" ON "public"."industry_benchmarks"("industry", "metric", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "industry_benchmarks_industry_metric_period_periodStart_key" ON "public"."industry_benchmarks"("industry", "metric", "period", "periodStart");

-- CreateIndex
CREATE INDEX "custom_field_definitions_tenantId_entity_group_idx" ON "public"."custom_field_definitions"("tenantId", "entity", "group");

-- CreateIndex
CREATE INDEX "custom_field_definitions_tenantId_industry_idx" ON "public"."custom_field_definitions"("tenantId", "industry");

-- AddForeignKey
ALTER TABLE "public"."industry_template_applications" ADD CONSTRAINT "industry_template_applications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."industry_template_applications" ADD CONSTRAINT "industry_template_applications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."industry_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tenant_industry_profiles" ADD CONSTRAINT "tenant_industry_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."routing_strategies" ADD CONSTRAINT "routing_strategies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
