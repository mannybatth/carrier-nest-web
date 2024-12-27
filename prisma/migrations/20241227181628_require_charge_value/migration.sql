/*
  Warnings:

  - Made the column `chargeValue` on table `DriverAssignment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "DriverAssignment" ALTER COLUMN "chargeValue" SET NOT NULL;
