-- CreateTable
CREATE TABLE "ai_token_wallets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_token_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_token_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "referenceId" TEXT,
    "operationType" TEXT,
    "operationId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_token_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_token_wallets_tenantId_key" ON "ai_token_wallets"("tenantId");

-- CreateIndex
CREATE INDEX "ai_token_wallets_tenantId_idx" ON "ai_token_wallets"("tenantId");

-- CreateIndex
CREATE INDEX "ai_token_transactions_walletId_createdAt_idx" ON "ai_token_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_token_transactions_tenantId_createdAt_idx" ON "ai_token_transactions"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_token_transactions_tenantId_type_createdAt_idx" ON "ai_token_transactions"("tenantId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "ai_token_transactions_operationType_operationId_idx" ON "ai_token_transactions"("operationType", "operationId");

-- AddForeignKey
ALTER TABLE "ai_token_wallets" ADD CONSTRAINT "ai_token_wallets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_token_transactions" ADD CONSTRAINT "ai_token_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "ai_token_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_token_transactions" ADD CONSTRAINT "ai_token_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
