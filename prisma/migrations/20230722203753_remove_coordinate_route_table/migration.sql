/*
  Warnings:

  - You are about to drop the column `coordinateId` on the `LoadStop` table. All the data in the column will be lost.
  - You are about to drop the `Coordinate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Route` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Coordinate" DROP CONSTRAINT "Coordinate_routeId_fkey";

-- DropForeignKey
ALTER TABLE "Load" DROP CONSTRAINT "Load_routeId_fkey";

-- DropForeignKey
ALTER TABLE "LoadStop" DROP CONSTRAINT "LoadStop_coordinateId_fkey";

-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "routeEncoded" TEXT;

-- AlterTable
ALTER TABLE "LoadStop" DROP COLUMN "coordinateId",
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- DropTable
DROP TABLE "Coordinate";

-- DropTable
DROP TABLE "Route";
