-- DropForeignKey
ALTER TABLE "DriverAssignment" DROP CONSTRAINT "DriverAssignment_routeLegId_fkey";

-- AddForeignKey
ALTER TABLE "DriverAssignment" ADD CONSTRAINT "DriverAssignment_routeLegId_fkey" FOREIGN KEY ("routeLegId") REFERENCES "RouteLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;
