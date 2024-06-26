-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteLeg" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startLatitude" DOUBLE PRECISION,
    "startLongitude" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endLatitude" DOUBLE PRECISION,
    "endLongitude" DOUBLE PRECISION,
    "endedAt" TIMESTAMP(3) NOT NULL,
    "driverInstructions" TEXT,

    CONSTRAINT "RouteLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverAssignment" (
    "id" TEXT NOT NULL,
    "routeLegId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "routeLegId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Route_loadId_key" ON "Route"("loadId");

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteLeg" ADD CONSTRAINT "RouteLeg_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverAssignment" ADD CONSTRAINT "DriverAssignment_routeLegId_fkey" FOREIGN KEY ("routeLegId") REFERENCES "RouteLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverAssignment" ADD CONSTRAINT "DriverAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_routeLegId_fkey" FOREIGN KEY ("routeLegId") REFERENCES "RouteLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;
