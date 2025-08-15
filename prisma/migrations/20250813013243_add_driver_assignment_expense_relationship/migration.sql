-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "driverAssignmentId" TEXT;

-- CreateIndex
CREATE INDEX "Expense_driverAssignmentId_idx" ON "Expense"("driverAssignmentId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_driverAssignmentId_fkey" FOREIGN KEY ("driverAssignmentId") REFERENCES "DriverAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
