-- DropForeignKey
ALTER TABLE "Coordinate" DROP CONSTRAINT "Coordinate_routeId_fkey";

-- AddForeignKey
ALTER TABLE "Coordinate" ADD CONSTRAINT "Coordinate_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;
