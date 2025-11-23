-- AlterTable
ALTER TABLE "public"."ConversationAdvanced" ADD COLUMN     "language" TEXT,
ADD COLUMN     "lastTriageAt" TIMESTAMP(3),
ADD COLUMN     "predictedIntent" TEXT;

-- AlterTable
ALTER TABLE "public"."tickets" ADD COLUMN     "aiTriageAt" TIMESTAMP(3),
ADD COLUMN     "assignedByAI" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "predictedCategory" TEXT,
ADD COLUMN     "predictedIntent" TEXT,
ADD COLUMN     "predictedPriority" TEXT,
ADD COLUMN     "triageConfidence" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "ConversationAdvanced_tenantId_predictedIntent_idx" ON "public"."ConversationAdvanced"("tenantId", "predictedIntent");

-- CreateIndex
CREATE INDEX "tickets_tenantId_predictedPriority_aiTriageAt_idx" ON "public"."tickets"("tenantId", "predictedPriority", "aiTriageAt");
