-- AlterTable
ALTER TABLE "public"."payment_intents" ADD COLUMN     "campaignId" TEXT;

-- CreateTable
CREATE TABLE "public"."campaign_conversions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "deliveryId" TEXT,
    "channel" TEXT NOT NULL,
    "amount" INTEGER,
    "currency" TEXT DEFAULT 'usd',
    "source" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "campaign_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_conversions_tenantId_campaignId_occurredAt_idx" ON "public"."campaign_conversions"("tenantId", "campaignId", "occurredAt");

-- CreateIndex
CREATE INDEX "payment_intents_campaignId_idx" ON "public"."payment_intents"("campaignId");

-- AddForeignKey
ALTER TABLE "public"."payment_intents" ADD CONSTRAINT "payment_intents_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."marketing_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_conversions" ADD CONSTRAINT "campaign_conversions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."marketing_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_conversions" ADD CONSTRAINT "campaign_conversions_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "public"."CampaignDelivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;
