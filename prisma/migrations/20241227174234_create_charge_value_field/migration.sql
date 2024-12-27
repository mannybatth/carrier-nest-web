/*
  Warnings:

  - You are about to drop the column `chargeFixedAmount` on the `DriverAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `chargePerMileRate` on the `DriverAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `chargePercentageOfLoad` on the `DriverAssignment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DriverAssignment" DROP COLUMN "chargeFixedAmount",
DROP COLUMN "chargePerMileRate",
DROP COLUMN "chargePercentageOfLoad",
ADD COLUMN     "chargeValue" DECIMAL(65,30);
