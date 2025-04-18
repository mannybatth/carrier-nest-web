-- CreateTable
CREATE TABLE "DriverInvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverInvoicePayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DriverInvoicePayment" ADD CONSTRAINT "DriverInvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "DriverInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
