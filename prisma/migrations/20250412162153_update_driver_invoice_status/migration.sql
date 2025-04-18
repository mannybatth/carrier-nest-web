/*
  Warnings:

  - The values [DRAFT,SENT,VOIDED] on the enum `DriverInvoiceStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DriverInvoiceStatus_new" AS ENUM ('PENDING', 'APPROVED', 'PARTIALLY_PAID', 'PAID');
ALTER TABLE "DriverInvoice" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DriverInvoice" ALTER COLUMN "status" TYPE "DriverInvoiceStatus_new" USING ("status"::text::"DriverInvoiceStatus_new");
ALTER TYPE "DriverInvoiceStatus" RENAME TO "DriverInvoiceStatus_old";
ALTER TYPE "DriverInvoiceStatus_new" RENAME TO "DriverInvoiceStatus";
DROP TYPE "DriverInvoiceStatus_old";
ALTER TABLE "DriverInvoice" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "DriverInvoice" ALTER COLUMN "status" SET DEFAULT 'PENDING';
