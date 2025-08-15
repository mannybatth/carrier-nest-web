-- Migration: Add optimized performance indexes for Expense table
-- Based on actual query patterns and API usage analysis

-- ESSENTIAL: Composite indexes for most common query patterns
-- These support the main filtering combinations used in the expense APIs

-- Support queries filtering by carrier and approval status (most common filter)
CREATE INDEX IF NOT EXISTS "Expense_carrierId_approvalStatus_idx"
ON "Expense"("carrierId", "approvalStatus");

-- Support date range queries and sorting (second most common pattern)
CREATE INDEX IF NOT EXISTS "Expense_carrierId_createdAt_idx"
ON "Expense"("carrierId", "createdAt");

-- Support payment type filtering (useful for driver vs company expense reports)
CREATE INDEX IF NOT EXISTS "Expense_carrierId_paidBy_idx"
ON "Expense"("carrierId", "paidBy");

-- ESSENTIAL: Soft delete optimization (used in every query to exclude deleted records)
-- This is critical since all expense queries filter by deletedAt IS NULL
CREATE INDEX IF NOT EXISTS "Expense_deletedAt_idx"
ON "Expense"("deletedAt");
