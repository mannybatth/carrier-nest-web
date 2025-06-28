-- Add team invitation tokens
-- This migration adds a table to track team invitation tokens that are separate from regular verification tokens

-- Create TeamInvitation table
CREATE TABLE "TeamInvitation" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "carrierName" TEXT,
    "inviterName" TEXT,
    "inviterEmail" TEXT,
    "role" TEXT,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- Create indices
CREATE UNIQUE INDEX "TeamInvitation_token_key" ON "TeamInvitation"("token");
CREATE INDEX "TeamInvitation_email_carrierId_idx" ON "TeamInvitation"("email", "carrierId");
CREATE INDEX "TeamInvitation_expires_idx" ON "TeamInvitation"("expires");

-- Add foreign key constraint
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
