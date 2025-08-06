-- CreateEnum
CREATE TYPE "DriverType" AS ENUM ('DRIVER', 'OWNER_OPERATOR');

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "type" "DriverType" NOT NULL DEFAULT 'DRIVER';
