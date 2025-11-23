-- CreateTable
CREATE TABLE "public"."channel_wallets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncStatus" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."channel_wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "referenceId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "channel_wallets_tenantId_channelType_idx" ON "public"."channel_wallets"("tenantId", "channelType");

-- CreateIndex
CREATE UNIQUE INDEX "channel_wallets_tenantId_channelType_key" ON "public"."channel_wallets"("tenantId", "channelType");

-- CreateIndex
CREATE INDEX "channel_wallet_transactions_walletId_createdAt_idx" ON "public"."channel_wallet_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "channel_wallet_transactions_tenantId_createdAt_idx" ON "public"."channel_wallet_transactions"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."channel_wallets" ADD CONSTRAINT "channel_wallets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."channel_wallet_transactions" ADD CONSTRAINT "channel_wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."channel_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."channel_wallet_transactions" ADD CONSTRAINT "channel_wallet_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
