-- AlterTable
ALTER TABLE "public"."onboarding_sessions" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'tenant_admin',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'tenant_setup';

-- AlterTable
ALTER TABLE "public"."tenants" ADD COLUMN     "setupCompletedAt" TIMESTAMP(3),
ADD COLUMN     "setupCompletedBy" TEXT;
