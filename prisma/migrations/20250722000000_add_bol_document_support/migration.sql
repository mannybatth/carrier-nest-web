-- CreateEnum
ALTER TYPE "LoadActivityAction" ADD VALUE 'UPLOAD_BOL';
ALTER TYPE "LoadActivityAction" ADD VALUE 'REMOVE_BOL';

-- AlterTable
ALTER TABLE "LoadDocument" ADD COLUMN "loadIdForBolDoc" TEXT;

-- AddForeignKey
ALTER TABLE "LoadDocument" ADD CONSTRAINT "LoadDocument_loadIdForBolDoc_fkey" FOREIGN KEY ("loadIdForBolDoc") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
