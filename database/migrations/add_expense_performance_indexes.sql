-- Migration to add performance indexes for expenses
-- Run this as a database migration
-- Optimized set based on actual query patterns

-- ESSENTIAL: Composite indexes for most common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Expense_carrierId_approvalStatus_idx"
ON "Expense"("carrierId", "approvalStatus");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Expense_carrierId_createdAt_idx"
ON "Expense"("carrierId", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Expense_carrierId_paidBy_idx"
ON "Expense"("carrierId", "paidBy");

-- ESSENTIAL: Soft delete optimization (used in every query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Expense_deletedAt_idx"
ON "Expense"("deletedAt");

-- OPTIONAL: Simple text search indexes (much more efficient than trigram for exact/prefix matches)
-- Only create these if text search is heavily used
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Expense_description_lower_idx"
ON "Expense"(LOWER("description")) WHERE "description" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "Expense_vendorName_lower_idx"
ON "Expense"(LOWER("vendorName")) WHERE "vendorName" IS NOT NULL;

-- REMOVED: receiptDate index (redundant with createdAt, low usage)
-- REMOVED: Trigram indexes (expensive storage/maintenance, prefer alternatives)

-- Add statistics update for query planner optimization
ANALYZE "Expense";
ANALYZE "ExpenseCategory";
ANALYZE "ExpenseDocument";

-- Validation queries to check index effectiveness
-- Run these after migration to verify performance:
/*
-- Test carrierId + approvalStatus filtering
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) FROM "Expense"
WHERE "carrierId" = 'sample_id' AND "approvalStatus" = 'PENDING' AND "deletedAt" IS NULL;

-- Test date range queries
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM "Expense"
WHERE "carrierId" = 'sample_id' AND "createdAt" >= '2024-01-01'
AND "deletedAt" IS NULL ORDER BY "createdAt" DESC LIMIT 50;

-- Test payment type filtering
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) FROM "Expense"
WHERE "carrierId" = 'sample_id' AND "paidBy" = 'COMPANY' AND "deletedAt" IS NULL;
*/
