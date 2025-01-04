/*
  Warnings:

  - You are about to drop the column `name` on the `Equipment` table. All the data in the column will be lost.
  - Added the required column `make` to the `Equipment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `Equipment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('AVAILABLE', 'MAINTENANCE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Equipment" DROP COLUMN "name",
ADD COLUMN     "equipmentNumber" TEXT,
ADD COLUMN     "licensePlate" TEXT,
ADD COLUMN     "make" TEXT NOT NULL,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "status" "EquipmentStatus" NOT NULL,
ADD COLUMN     "vin" TEXT,
ADD COLUMN     "year" INTEGER,
ALTER COLUMN "type" DROP NOT NULL;
