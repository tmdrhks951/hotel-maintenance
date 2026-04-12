-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'EMERGENCY_SET';
ALTER TYPE "NotificationType" ADD VALUE 'WORKER_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'REQUEST_REOPENED';
ALTER TYPE "NotificationType" ADD VALUE 'OPERATIONS_CONFIRM_REQUESTED';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "bundleKey" TEXT,
ADD COLUMN     "message" TEXT,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_bundleKey_idx" ON "notifications"("bundleKey");
