-- DropForeignKey
ALTER TABLE "RouteLegLocation" DROP CONSTRAINT "RouteLegLocation_loadStopId_fkey";

-- DropForeignKey
ALTER TABLE "RouteLegLocation" DROP CONSTRAINT "RouteLegLocation_locationId_fkey";

-- AddForeignKey
ALTER TABLE "RouteLegLocation" ADD CONSTRAINT "RouteLegLocation_loadStopId_fkey" FOREIGN KEY ("loadStopId") REFERENCES "LoadStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteLegLocation" ADD CONSTRAINT "RouteLegLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
