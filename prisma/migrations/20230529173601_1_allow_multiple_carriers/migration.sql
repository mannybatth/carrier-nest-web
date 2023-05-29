/*
  Warnings:

  - You are about to drop the column `carrierId` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_carrierId_fkey";

-- DropIndex
DROP INDEX "User_name_email_carrierId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN "default_carrier_id" TEXT;
UPDATE "User" SET "default_carrier_id" = "carrierId";
ALTER TABLE "User" DROP COLUMN "carrierId";

-- CreateTable
CREATE TABLE "_CarrierToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CarrierToUser_AB_unique" ON "_CarrierToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_CarrierToUser_B_index" ON "_CarrierToUser"("B");

-- CreateIndex
CREATE INDEX "User_name_email_default_carrier_id_idx" ON "User"("name", "email", "default_carrier_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_default_carrier_id_fkey" FOREIGN KEY ("default_carrier_id") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CarrierToUser" ADD CONSTRAINT "_CarrierToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Carrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CarrierToUser" ADD CONSTRAINT "_CarrierToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
