/*
  Warnings:

  - The values [LEGSTOP] on the enum `LoadStopType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LoadStopType_new" AS ENUM ('SHIPPER', 'RECEIVER', 'STOP');
ALTER TABLE "LoadStop" ALTER COLUMN "type" TYPE "LoadStopType_new" USING ("type"::text::"LoadStopType_new");
ALTER TYPE "LoadStopType" RENAME TO "LoadStopType_old";
ALTER TYPE "LoadStopType_new" RENAME TO "LoadStopType";
DROP TYPE "LoadStopType_old";
COMMIT;
