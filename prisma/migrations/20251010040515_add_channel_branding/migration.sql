-- CreateTable
CREATE TABLE "public"."autopilot_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT,
    "mode" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "responseMessageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "autopilot_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."channel_brandings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "logoUrl" TEXT,
    "colors" JSONB NOT NULL DEFAULT '{}',
    "customCss" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_brandings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "autopilot_runs_tenantId_conversationId_createdAt_idx" ON "public"."autopilot_runs"("tenantId", "conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "channel_brandings_tenantId_channelType_idx" ON "public"."channel_brandings"("tenantId", "channelType");

-- CreateIndex
CREATE UNIQUE INDEX "channel_brandings_tenantId_channelType_key" ON "public"."channel_brandings"("tenantId", "channelType");

-- AddForeignKey
ALTER TABLE "public"."autopilot_runs" ADD CONSTRAINT "autopilot_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."channel_brandings" ADD CONSTRAINT "channel_brandings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
