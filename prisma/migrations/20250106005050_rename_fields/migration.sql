/*
  Warnings:

  - You are about to drop the column `billedHours` on the `DriverAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `billedMiles` on the `DriverAssignment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DriverAssignment" DROP COLUMN "billedHours",
DROP COLUMN "billedMiles",
ADD COLUMN     "billedDistance" DECIMAL(65,30),
ADD COLUMN     "billedDuration" DECIMAL(65,30);
