-- DropForeignKey
ALTER TABLE "public"."invitations" DROP CONSTRAINT "invitations_email_fkey";

-- DropIndex
DROP INDEX "public"."invitations_tenantId_email_key";
