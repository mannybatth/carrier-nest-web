/*
  Warnings:

  - You are about to drop the column `routeDistance` on the `RouteLeg` table. All the data in the column will be lost.
  - You are about to drop the column `routeDuration` on the `RouteLeg` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RouteLeg" DROP COLUMN "routeDistance",
DROP COLUMN "routeDuration",
ADD COLUMN     "routeLegDistance" DECIMAL(65,30),
ADD COLUMN     "routeLegDuration" DECIMAL(65,30);
