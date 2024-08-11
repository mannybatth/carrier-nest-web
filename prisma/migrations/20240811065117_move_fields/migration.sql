/*
  Warnings:

  - You are about to drop the column `routeDistance` on the `Route` table. All the data in the column will be lost.
  - You are about to drop the column `routeDuration` on the `Route` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Route" DROP COLUMN "routeDistance",
DROP COLUMN "routeDuration";

-- AlterTable
ALTER TABLE "RouteLeg" ADD COLUMN     "routeDistance" DECIMAL(65,30),
ADD COLUMN     "routeDuration" DECIMAL(65,30);
