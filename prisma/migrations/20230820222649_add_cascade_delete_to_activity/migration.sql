-- DropForeignKey
ALTER TABLE "LoadActivity" DROP CONSTRAINT "LoadActivity_loadId_fkey";

-- AddForeignKey
ALTER TABLE "LoadActivity" ADD CONSTRAINT "LoadActivity_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
