-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FacilityRequestStatus" ADD VALUE 'REQUESTED';
ALTER TYPE "FacilityRequestStatus" ADD VALUE 'REVIEW_REQUIRED';
ALTER TYPE "FacilityRequestStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "FacilityRequestStatus" ADD VALUE 'DONE_BY_QC';
ALTER TYPE "FacilityRequestStatus" ADD VALUE 'QC_VERIFIED';
ALTER TYPE "FacilityRequestStatus" ADD VALUE 'OPERATIONS_CONFIRMED';
ALTER TYPE "FacilityRequestStatus" ADD VALUE 'CLOSED';
ALTER TYPE "FacilityRequestStatus" ADD VALUE 'REOPENED';
ALTER TYPE "FacilityRequestStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "facility_requests" ADD COLUMN     "completedById" TEXT,
ADD COLUMN     "emergencyReason" TEXT,
ADD COLUMN     "emergencySetAt" TIMESTAMP(3),
ADD COLUMN     "emergencySetById" TEXT,
ADD COLUMN     "isEmergency" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "operationsConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "operationsConfirmedByUserId" TEXT,
ADD COLUMN     "plannedWorkDate" TIMESTAMP(3),
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "qcVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "qcVerifiedById" TEXT,
ADD COLUMN     "scheduleChangeCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "status_logs" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fromStatus" "FacilityRequestStatus",
    "toStatus" "FacilityRequestStatus" NOT NULL,
    "reason" TEXT,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "status_logs_requestId_idx" ON "status_logs"("requestId");

-- AddForeignKey
ALTER TABLE "facility_requests" ADD CONSTRAINT "facility_requests_emergencySetById_fkey" FOREIGN KEY ("emergencySetById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_requests" ADD CONSTRAINT "facility_requests_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_requests" ADD CONSTRAINT "facility_requests_qcVerifiedById_fkey" FOREIGN KEY ("qcVerifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_requests" ADD CONSTRAINT "facility_requests_operationsConfirmedByUserId_fkey" FOREIGN KEY ("operationsConfirmedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_logs" ADD CONSTRAINT "status_logs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "facility_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_logs" ADD CONSTRAINT "status_logs_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
