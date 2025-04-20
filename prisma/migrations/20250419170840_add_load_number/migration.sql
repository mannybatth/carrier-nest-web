/*
  Warnings:

  - A unique constraint covering the columns `[carrierId,refNum]` on the table `Load` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `loadNum` to the `Load` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "loadNum" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Load_carrierId_refNum_key" ON "Load"("carrierId", "refNum");
