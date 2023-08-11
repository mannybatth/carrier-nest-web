/*
  Warnings:

  - You are about to drop the column `distance` on the `Load` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Load" DROP COLUMN "distance",
ADD COLUMN     "routeDistance" DECIMAL(65,30),
ADD COLUMN     "routeDuration" DECIMAL(65,30);
