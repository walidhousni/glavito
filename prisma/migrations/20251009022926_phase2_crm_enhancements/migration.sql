-- AlterTable
ALTER TABLE "public"."leads" ADD COLUMN     "conversionProbability" DOUBLE PRECISION,
ADD COLUMN     "predictedValue" DECIMAL(65,30),
ADD COLUMN     "scoreHistory" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "scoringModelId" TEXT;

-- AlterTable
ALTER TABLE "public"."sales_pipelines" ADD COLUMN     "avgDealCycleTime" INTEGER,
ADD COLUMN     "avgDealValue" DECIMAL(65,30),
ADD COLUMN     "conversionRate" DOUBLE PRECISION,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "stageAutomation" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "totalDeals" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wonDeals" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."lead_scoring_models" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rules" JSONB NOT NULL DEFAULT '[]',
    "weightConfig" JSONB NOT NULL DEFAULT '{}',
    "thresholds" JSONB NOT NULL DEFAULT '{}',
    "mlModelType" TEXT,
    "mlModelPath" TEXT,
    "mlFeatures" JSONB,
    "mlAccuracy" DOUBLE PRECISION,
    "mlTrainedAt" TIMESTAMP(3),
    "totalLeadsScored" INTEGER NOT NULL DEFAULT 0,
    "avgScore" DOUBLE PRECISION,
    "conversionRate" DOUBLE PRECISION,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_scoring_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quotes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dealId" TEXT,
    "leadId" TEXT,
    "customerId" TEXT,
    "quoteNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "assignedTo" TEXT,
    "terms" TEXT,
    "notes" TEXT,
    "templateId" TEXT,
    "pdfUrl" TEXT,
    "signatureRequired" BOOLEAN NOT NULL DEFAULT false,
    "signatureUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "signedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentQuoteId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_line_items" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "discount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "quote_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "industry" TEXT,
    "headerHtml" TEXT,
    "footerHtml" TEXT,
    "termsHtml" TEXT,
    "styles" JSONB NOT NULL DEFAULT '{}',
    "defaultTerms" TEXT,
    "defaultNotes" TEXT,
    "defaultValidityDays" INTEGER NOT NULL DEFAULT 30,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_activities" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_scoring_models_tenantId_industry_idx" ON "public"."lead_scoring_models"("tenantId", "industry");

-- CreateIndex
CREATE INDEX "lead_scoring_models_tenantId_isDefault_idx" ON "public"."lead_scoring_models"("tenantId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "lead_scoring_models_tenantId_name_key" ON "public"."lead_scoring_models"("tenantId", "name");

-- CreateIndex
CREATE INDEX "quotes_tenantId_status_idx" ON "public"."quotes"("tenantId", "status");

-- CreateIndex
CREATE INDEX "quotes_tenantId_dealId_idx" ON "public"."quotes"("tenantId", "dealId");

-- CreateIndex
CREATE INDEX "quotes_tenantId_customerId_idx" ON "public"."quotes"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "quotes_tenantId_createdBy_idx" ON "public"."quotes"("tenantId", "createdBy");

-- CreateIndex
CREATE INDEX "quotes_tenantId_createdAt_idx" ON "public"."quotes"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "quotes_tenantId_validUntil_idx" ON "public"."quotes"("tenantId", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_tenantId_quoteNumber_key" ON "public"."quotes"("tenantId", "quoteNumber");

-- CreateIndex
CREATE INDEX "quote_line_items_quoteId_sortOrder_idx" ON "public"."quote_line_items"("quoteId", "sortOrder");

-- CreateIndex
CREATE INDEX "quote_templates_tenantId_industry_idx" ON "public"."quote_templates"("tenantId", "industry");

-- CreateIndex
CREATE UNIQUE INDEX "quote_templates_tenantId_name_key" ON "public"."quote_templates"("tenantId", "name");

-- CreateIndex
CREATE INDEX "quote_activities_quoteId_createdAt_idx" ON "public"."quote_activities"("quoteId", "createdAt");

-- CreateIndex
CREATE INDEX "leads_tenantId_scoringModelId_idx" ON "public"."leads"("tenantId", "scoringModelId");

-- CreateIndex
CREATE INDEX "sales_pipelines_tenantId_industry_idx" ON "public"."sales_pipelines"("tenantId", "industry");

-- CreateIndex
CREATE INDEX "sales_pipelines_tenantId_isDefault_idx" ON "public"."sales_pipelines"("tenantId", "isDefault");

-- AddForeignKey
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_scoringModelId_fkey" FOREIGN KEY ("scoringModelId") REFERENCES "public"."lead_scoring_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."lead_scoring_models" ADD CONSTRAINT "lead_scoring_models_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "public"."deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."quote_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_parentQuoteId_fkey" FOREIGN KEY ("parentQuoteId") REFERENCES "public"."quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_line_items" ADD CONSTRAINT "quote_line_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "public"."quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_line_items" ADD CONSTRAINT "quote_line_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_templates" ADD CONSTRAINT "quote_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_activities" ADD CONSTRAINT "quote_activities_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "public"."quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_activities" ADD CONSTRAINT "quote_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
