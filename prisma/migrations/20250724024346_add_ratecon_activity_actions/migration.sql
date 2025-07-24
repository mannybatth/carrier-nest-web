-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LoadActivityAction" ADD VALUE 'UPLOAD_RATECON';
ALTER TYPE "LoadActivityAction" ADD VALUE 'REMOVE_RATECON';

-- AlterTable
ALTER TABLE "TeamInvitation" ADD COLUMN     "emailCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "lastEmailSent" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "AccountDeletionCode" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountDeletionCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountDeletionCode_carrierId_key" ON "AccountDeletionCode"("carrierId");

-- CreateIndex
CREATE INDEX "TeamInvitation_lastEmailSent_idx" ON "TeamInvitation"("lastEmailSent");

-- AddForeignKey
ALTER TABLE "AccountDeletionCode" ADD CONSTRAINT "AccountDeletionCode_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
