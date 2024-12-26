/*
  Warnings:

  - You are about to drop the column `loadIdAsAddStop` on the `LoadStop` table. All the data in the column will be lost.
  - Added the required column `carrierId` to the `DriverAssignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chargeType` to the `DriverAssignment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ChargeType" AS ENUM ('PER_MILE', 'FIXED_PAY', 'PERCENTAGE_OF_LOAD');

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "defaultFixedPay" DECIMAL(65,30),
ADD COLUMN     "lastFixedPay" DECIMAL(65,30),
ADD COLUMN     "perMileRate" DECIMAL(65,30),
ADD COLUMN     "takeHomePercent" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "DriverAssignment" ADD COLUMN     "carrierId" TEXT NOT NULL,
ADD COLUMN     "chargeFixedAmount" DECIMAL(65,30),
ADD COLUMN     "chargePerMileRate" DECIMAL(65,30),
ADD COLUMN     "chargePercentageOfLoad" DECIMAL(65,30),
ADD COLUMN     "chargeType" "ChargeType" NOT NULL;

-- AlterTable
ALTER TABLE "LoadStop" DROP COLUMN "loadIdAsAddStop";

-- CreateTable
CREATE TABLE "AssignmentPayment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "carrierId" TEXT NOT NULL,
    "loadId" TEXT,
    "driverId" TEXT,
    "driverAssignmentId" TEXT,

    CONSTRAINT "AssignmentPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AssignmentPayment" ADD CONSTRAINT "AssignmentPayment_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentPayment" ADD CONSTRAINT "AssignmentPayment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentPayment" ADD CONSTRAINT "AssignmentPayment_driverAssignmentId_fkey" FOREIGN KEY ("driverAssignmentId") REFERENCES "DriverAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
