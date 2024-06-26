/*
  Warnings:

  - You are about to drop the column `scheduledAt` on the `RouteLeg` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "LoadStopType" ADD VALUE 'LEGSTOP';

-- AlterTable
ALTER TABLE "RouteLeg" DROP COLUMN "scheduledAt",
ADD COLUMN     "scheduledDate" TIMESTAMP(3),
ADD COLUMN     "scheduledTime" TEXT;
