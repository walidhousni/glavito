-- AlterTable
ALTER TABLE "public"."CustomerSatisfactionSurvey" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."tickets" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "language" TEXT,
ADD COLUMN     "teamId" TEXT;

-- CreateIndex
CREATE INDEX "tickets_tenantId_teamId_idx" ON "public"."tickets"("tenantId", "teamId");

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
