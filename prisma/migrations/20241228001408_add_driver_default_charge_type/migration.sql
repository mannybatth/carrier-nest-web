/*
  Warnings:

  - You are about to drop the column `lastFixedPay` on the `Driver` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Driver" DROP COLUMN "lastFixedPay",
ADD COLUMN     "defaultChargeType" "ChargeType";
