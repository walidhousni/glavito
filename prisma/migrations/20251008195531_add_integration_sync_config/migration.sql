-- AlterTable
ALTER TABLE "public"."integration_connectors" ADD COLUMN     "autoCreateCustomers" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoCreateTickets" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "syncInterval" INTEGER NOT NULL DEFAULT 600,
ADD COLUMN     "webhookSecret" TEXT,
ADD COLUMN     "webhookUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."dashboard_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "widgets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "theme" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."agent_goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "current" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "achievedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."agent_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeType" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "agent_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_configs_userId_key" ON "public"."dashboard_configs"("userId");

-- CreateIndex
CREATE INDEX "agent_goals_userId_type_startDate_idx" ON "public"."agent_goals"("userId", "type", "startDate");

-- CreateIndex
CREATE INDEX "agent_achievements_userId_badgeType_idx" ON "public"."agent_achievements"("userId", "badgeType");

-- CreateIndex
CREATE INDEX "integration_connectors_tenantId_syncEnabled_idx" ON "public"."integration_connectors"("tenantId", "syncEnabled");

-- AddForeignKey
ALTER TABLE "public"."dashboard_configs" ADD CONSTRAINT "dashboard_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_goals" ADD CONSTRAINT "agent_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agent_achievements" ADD CONSTRAINT "agent_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
