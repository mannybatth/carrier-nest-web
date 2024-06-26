/*
  Warnings:

  - A unique constraint covering the columns `[driverId,routeLegId]` on the table `DriverAssignment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "RouteLeg" ALTER COLUMN "scheduledAt" DROP NOT NULL,
ALTER COLUMN "endedAt" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DriverAssignment_driverId_routeLegId_key" ON "DriverAssignment"("driverId", "routeLegId");
