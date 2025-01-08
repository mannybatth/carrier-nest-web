/*
  Warnings:

  - You are about to drop the column `checkNumber` on the `DriverPayment` table. All the data in the column will be lost.
  - You are about to drop the column `isCashPayment` on the `DriverPayment` table. All the data in the column will be lost.
  - You are about to drop the column `isDirectDeposit` on the `DriverPayment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DriverPayment" DROP COLUMN "checkNumber",
DROP COLUMN "isCashPayment",
DROP COLUMN "isDirectDeposit",
ADD COLUMN     "notes" TEXT;
