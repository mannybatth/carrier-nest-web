-- CreateIndex
CREATE INDEX "Expense_carrierId_approvalStatus_idx" ON "Expense"("carrierId", "approvalStatus");

-- CreateIndex
CREATE INDEX "Expense_carrierId_createdAt_idx" ON "Expense"("carrierId", "createdAt");

-- CreateIndex
CREATE INDEX "Expense_carrierId_paidBy_idx" ON "Expense"("carrierId", "paidBy");

-- CreateIndex
CREATE INDEX "Expense_deletedAt_idx" ON "Expense"("deletedAt");
