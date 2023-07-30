/*
  Warnings:

  - You are about to drop the column `driverId` on the `Load` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Load" DROP CONSTRAINT "Load_driverId_fkey";

-- AlterTable
ALTER TABLE "Load" DROP COLUMN "driverId";

-- CreateTable
CREATE TABLE "_driverLoads" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_driverLoads_AB_unique" ON "_driverLoads"("A", "B");

-- CreateIndex
CREATE INDEX "_driverLoads_B_index" ON "_driverLoads"("B");

-- AddForeignKey
ALTER TABLE "_driverLoads" ADD CONSTRAINT "_driverLoads_A_fkey" FOREIGN KEY ("A") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_driverLoads" ADD CONSTRAINT "_driverLoads_B_fkey" FOREIGN KEY ("B") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
