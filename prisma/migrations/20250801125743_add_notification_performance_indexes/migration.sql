-- CreateIndex
CREATE INDEX "notification_deduplication_idx" ON "Notification"("type", "assignmentId", "userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notification_type_carrier_idx" ON "Notification"("type", "carrierId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notification_user_read_idx" ON "Notification"("userId", "isRead", "createdAt" DESC);
