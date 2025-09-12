-- CreateTable
CREATE TABLE "public"."stripe_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "email" TEXT,
    "country" TEXT,
    "defaultCurrency" TEXT,
    "businessType" TEXT,
    "businessProfile" JSONB,
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "requirements" JSONB,
    "capabilities" JSONB,
    "settings" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_intents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "stripePaymentId" TEXT NOT NULL,
    "customerId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL,
    "paymentMethodId" TEXT,
    "description" TEXT,
    "receiptEmail" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "clientSecret" TEXT,
    "lastPaymentError" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_methods" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "stripeMethodId" TEXT NOT NULL,
    "customerId" TEXT,
    "type" TEXT NOT NULL,
    "card" JSONB,
    "billingDetails" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_configurations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "taxRate" DOUBLE PRECISION,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "autoCharge" BOOLEAN NOT NULL DEFAULT false,
    "lateFeeRate" DOUBLE PRECISION,
    "reminderDays" INTEGER[] DEFAULT ARRAY[7, 3, 1]::INTEGER[],
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_accounts_tenantId_key" ON "public"."stripe_accounts"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_accounts_stripeAccountId_key" ON "public"."stripe_accounts"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_stripePaymentId_key" ON "public"."payment_intents"("stripePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_stripeMethodId_key" ON "public"."payment_methods"("stripeMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_configurations_tenantId_key" ON "public"."billing_configurations"("tenantId");

-- AddForeignKey
ALTER TABLE "public"."stripe_accounts" ADD CONSTRAINT "stripe_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_intents" ADD CONSTRAINT "payment_intents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_intents" ADD CONSTRAINT "payment_intents_stripeAccountId_fkey" FOREIGN KEY ("stripeAccountId") REFERENCES "public"."stripe_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_intents" ADD CONSTRAINT "payment_intents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_intents" ADD CONSTRAINT "payment_intents_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "public"."payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_methods" ADD CONSTRAINT "payment_methods_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_methods" ADD CONSTRAINT "payment_methods_stripeAccountId_fkey" FOREIGN KEY ("stripeAccountId") REFERENCES "public"."stripe_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_methods" ADD CONSTRAINT "payment_methods_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."billing_configurations" ADD CONSTRAINT "billing_configurations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
