-- Add notifications tables
-- This should be added to your schema.prisma file

-- Notification types enum
CREATE TYPE "NotificationType" AS ENUM (
  'ASSIGNMENT_STARTED',
  'ASSIGNMENT_COMPLETED',
  'DOCUMENT_UPLOADED',
  'INVOICE_APPROVED',
  'ASSIGNMENT_UPDATED',
  'LOCATION_UPDATE',
  'STATUS_CHANGE',
  'INVOICE_SUBMITTED',
  'PAYMENT_STATUS_CHANGE',
  'INVOICE_DISPUTED',
  'INVOICE_ATTENTION_REQUIRED',
  'PAYMENT_PROCESSED',
  'DEADLINE_APPROACHING',
  'INVOICE_OVERDUE'
);

-- Notification priority enum
CREATE TYPE "NotificationPriority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

-- Main notifications table
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "carrierId" TEXT NOT NULL,
    "userId" TEXT,
    "driverId" TEXT,
    "loadId" TEXT,
    "assignmentId" TEXT,
    "routeLegId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- User notification preferences
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- Notification delivery tracking
CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL, -- 'in_app', 'email', 'sms', 'push'
    "status" TEXT NOT NULL, -- 'pending', 'sent', 'delivered', 'failed'
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for performance
CREATE INDEX "Notification_carrierId_createdAt_idx" ON "Notification"("carrierId", "createdAt" DESC);
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX "Notification_type_carrierId_idx" ON "Notification"("type", "carrierId");
CREATE INDEX "NotificationPreference_userId_carrierId_idx" ON "NotificationPreference"("userId", "carrierId");
CREATE UNIQUE INDEX "NotificationPreference_userId_carrierId_type_key" ON "NotificationPreference"("userId", "carrierId", "type");
