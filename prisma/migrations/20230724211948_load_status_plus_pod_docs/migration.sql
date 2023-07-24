/*
  Warnings:

  - Added the required column `loadIdForPodDoc` to the `LoadDocument` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'DELIVERED', 'POD_READY');

-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "status" "LoadStatus" NOT NULL DEFAULT 'CREATED';

-- AlterTable
ALTER TABLE "LoadDocument" ADD COLUMN     "loadIdForPodDoc" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "LoadDocument" ADD CONSTRAINT "LoadDocument_loadIdForPodDoc_fkey" FOREIGN KEY ("loadIdForPodDoc") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
