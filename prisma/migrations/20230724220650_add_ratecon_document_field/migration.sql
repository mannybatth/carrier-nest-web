/*
  Warnings:

  - A unique constraint covering the columns `[loadIdForRatecon]` on the table `LoadDocument` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "LoadDocument" ADD COLUMN     "loadIdForRatecon" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LoadDocument_loadIdForRatecon_key" ON "LoadDocument"("loadIdForRatecon");

-- AddForeignKey
ALTER TABLE "LoadDocument" ADD CONSTRAINT "LoadDocument_loadIdForRatecon_fkey" FOREIGN KEY ("loadIdForRatecon") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
