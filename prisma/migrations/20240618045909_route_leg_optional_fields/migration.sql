/*
  Warnings:

  - You are about to drop the `Location` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Location" DROP CONSTRAINT "Location_routeLegId_fkey";

-- AlterTable
ALTER TABLE "RouteLeg" ALTER COLUMN "scheduledAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "startedAt" DROP NOT NULL;

-- DropTable
DROP TABLE "Location";

-- CreateTable
CREATE TABLE "_LoadStopToRouteLeg" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_LoadStopToRouteLeg_AB_unique" ON "_LoadStopToRouteLeg"("A", "B");

-- CreateIndex
CREATE INDEX "_LoadStopToRouteLeg_B_index" ON "_LoadStopToRouteLeg"("B");

-- AddForeignKey
ALTER TABLE "_LoadStopToRouteLeg" ADD CONSTRAINT "_LoadStopToRouteLeg_A_fkey" FOREIGN KEY ("A") REFERENCES "LoadStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LoadStopToRouteLeg" ADD CONSTRAINT "_LoadStopToRouteLeg_B_fkey" FOREIGN KEY ("B") REFERENCES "RouteLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;
