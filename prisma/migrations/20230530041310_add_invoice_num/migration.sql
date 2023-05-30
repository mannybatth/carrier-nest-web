-- DropIndex
DROP INDEX "Invoice_userId_idx";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "invoiceNum" SERIAL NOT NULL;

-- CreateIndex
CREATE INDEX "Invoice_userId_invoiceNum_idx" ON "Invoice"("userId", "invoiceNum");
