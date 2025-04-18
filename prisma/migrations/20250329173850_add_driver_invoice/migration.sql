-- CreateEnum
CREATE TYPE "DriverInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'VOIDED');

-- AlterTable
ALTER TABLE "DriverAssignment" ADD COLUMN     "invoiceId" TEXT;

-- CreateTable
CREATE TABLE "DriverInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNum" INTEGER NOT NULL,
    "carrierId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(65,30) NOT NULL,
    "status" "DriverInvoiceStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "DriverInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverInvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "chargeId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverInvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineItemCharge" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultAmount" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineItemCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverInvoice_carrierId_invoiceNum_key" ON "DriverInvoice"("carrierId", "invoiceNum");

-- CreateIndex
CREATE UNIQUE INDEX "LineItemCharge_carrierId_name_key" ON "LineItemCharge"("carrierId", "name");

-- AddForeignKey
ALTER TABLE "DriverAssignment" ADD CONSTRAINT "DriverAssignment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "DriverInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverInvoice" ADD CONSTRAINT "DriverInvoice_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverInvoice" ADD CONSTRAINT "DriverInvoice_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverInvoice" ADD CONSTRAINT "DriverInvoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverInvoiceLineItem" ADD CONSTRAINT "DriverInvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "DriverInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverInvoiceLineItem" ADD CONSTRAINT "DriverInvoiceLineItem_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverInvoiceLineItem" ADD CONSTRAINT "DriverInvoiceLineItem_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverInvoiceLineItem" ADD CONSTRAINT "DriverInvoiceLineItem_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "LineItemCharge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineItemCharge" ADD CONSTRAINT "LineItemCharge_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
