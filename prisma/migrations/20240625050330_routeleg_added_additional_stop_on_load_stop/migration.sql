-- AlterTable
ALTER TABLE "LoadStop" ADD COLUMN     "loadIdAsAddStop" TEXT;

-- AddForeignKey
ALTER TABLE "LoadStop" ADD CONSTRAINT "LoadStop_loadIdAsAddStop_fkey" FOREIGN KEY ("loadIdAsAddStop") REFERENCES "Load"("id") ON DELETE SET NULL ON UPDATE CASCADE;
