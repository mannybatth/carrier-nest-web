/*
  Warnings:

  - A unique constraint covering the columns `[carrierId,invoiceNum]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "invoiceNum" DROP DEFAULT;
DROP SEQUENCE "Invoice_invoiceNum_seq";

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_carrierId_invoiceNum_key" ON "Invoice"("carrierId", "invoiceNum");
