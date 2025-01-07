/*
  Warnings:

  - You are about to drop the column `amount` on the `AssignmentPayment` table. All the data in the column will be lost.
  - You are about to drop the column `driverId` on the `AssignmentPayment` table. All the data in the column will be lost.
  - You are about to drop the column `paymentDate` on the `AssignmentPayment` table. All the data in the column will be lost.
  - You are about to drop the column `billedDistance` on the `DriverAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `billedDuration` on the `DriverAssignment` table. All the data in the column will be lost.
  - You are about to drop the column `routeDistance` on the `Load` table. All the data in the column will be lost.
  - You are about to drop the column `routeDuration` on the `Load` table. All the data in the column will be lost.
  - You are about to drop the column `routeLegDistance` on the `RouteLeg` table. All the data in the column will be lost.
  - You are about to drop the column `routeLegDuration` on the `RouteLeg` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "AssignmentPayment" DROP CONSTRAINT "AssignmentPayment_driverId_fkey";

-- AlterTable
ALTER TABLE "AssignmentPayment" DROP COLUMN "amount",
DROP COLUMN "driverId",
DROP COLUMN "paymentDate",
ADD COLUMN     "driverPaymentId" TEXT;

-- AlterTable
ALTER TABLE "DriverAssignment" DROP COLUMN "billedDistance",
DROP COLUMN "billedDuration",
ADD COLUMN     "billedDistanceMiles" DECIMAL(65,30),
ADD COLUMN     "billedDurationHours" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Load" DROP COLUMN "routeDistance",
DROP COLUMN "routeDuration",
ADD COLUMN     "routeDistanceMiles" DECIMAL(65,30),
ADD COLUMN     "routeDurationHours" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "RouteLeg" DROP COLUMN "routeLegDistance",
DROP COLUMN "routeLegDuration",
ADD COLUMN     "distanceMiles" DECIMAL(65,30),
ADD COLUMN     "durationHours" DECIMAL(65,30);

-- CreateTable
CREATE TABLE "DriverPayment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "carrierId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "checkNumber" TEXT,
    "isDirectDeposit" BOOLEAN NOT NULL DEFAULT false,
    "isCashPayment" BOOLEAN NOT NULL DEFAULT false,
    "driverId" TEXT NOT NULL,
    "isBatchPayment" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DriverPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DriverPayment" ADD CONSTRAINT "DriverPayment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentPayment" ADD CONSTRAINT "AssignmentPayment_driverPaymentId_fkey" FOREIGN KEY ("driverPaymentId") REFERENCES "DriverPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
