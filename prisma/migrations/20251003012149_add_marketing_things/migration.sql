/*
  Warnings:

  - You are about to drop the `campaign_deliveries` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."campaign_deliveries" DROP CONSTRAINT "campaign_deliveries_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "public"."campaign_deliveries" DROP CONSTRAINT "campaign_deliveries_customerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."campaign_deliveries" DROP CONSTRAINT "campaign_deliveries_variantId_fkey";

-- AlterTable
ALTER TABLE "public"."messages" ADD COLUMN     "campaign_delivery_id" TEXT;

-- AlterTable
ALTER TABLE "public"."tickets" ADD COLUMN     "campaignId" TEXT,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "customFields" DROP NOT NULL,
ALTER COLUMN "customFields" DROP DEFAULT;

-- DropTable
DROP TABLE "public"."campaign_deliveries";

-- CreateTable
CREATE TABLE "public"."CampaignDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "variantId" TEXT,
    "customerId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "messageId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_campaign_delivery_id_idx" ON "public"."messages"("campaign_delivery_id");

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_campaign_delivery_id_fkey" FOREIGN KEY ("campaign_delivery_id") REFERENCES "public"."CampaignDelivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignDelivery" ADD CONSTRAINT "CampaignDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."marketing_campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignDelivery" ADD CONSTRAINT "CampaignDelivery_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "public"."campaign_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignDelivery" ADD CONSTRAINT "CampaignDelivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
