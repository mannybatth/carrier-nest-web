-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASIC', 'PRO');

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'BASIC',
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "carrierId" TEXT NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_carrierId_key" ON "Subscription"("carrierId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default subscriptions for existing carriers
INSERT INTO "Subscription" ("id", "plan", "status", "createdAt", "updatedAt", "carrierId")
SELECT
    gen_random_uuid(),
    'BASIC',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    "id"
FROM "Carrier"
WHERE "id" NOT IN (SELECT "carrierId" FROM "Subscription");
