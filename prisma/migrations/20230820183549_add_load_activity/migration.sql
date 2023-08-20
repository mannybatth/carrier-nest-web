-- CreateEnum
CREATE TYPE "LoadActivityAction" AS ENUM ('CHANGE_STATUS', 'UPLOAD_POD', 'REMOVE_POD', 'UPLOAD_DOCUMENT', 'REMOVE_DOCUMENT', 'ASSIGN_DRIVER', 'UNASSIGN_DRIVER');

-- CreateTable
CREATE TABLE "LoadActivity" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "loadId" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorDriverId" TEXT,
    "actorDriverName" TEXT,
    "action" "LoadActivityAction" NOT NULL,
    "fromStatus" "LoadStatus" NOT NULL,
    "toStatus" "LoadStatus" NOT NULL,
    "actionDocumentId" TEXT,
    "actionDocumentFileName" TEXT,
    "actionDriverId" TEXT,
    "actionDriverName" TEXT,
    "longitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,

    CONSTRAINT "LoadActivity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LoadActivity" ADD CONSTRAINT "LoadActivity_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadActivity" ADD CONSTRAINT "LoadActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadActivity" ADD CONSTRAINT "LoadActivity_actorDriverId_fkey" FOREIGN KEY ("actorDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadActivity" ADD CONSTRAINT "LoadActivity_actionDocumentId_fkey" FOREIGN KEY ("actionDocumentId") REFERENCES "LoadDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadActivity" ADD CONSTRAINT "LoadActivity_actionDriverId_fkey" FOREIGN KEY ("actionDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
