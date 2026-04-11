-- CreateEnum
CREATE TYPE "RequestCategory" AS ENUM ('PLUMBING', 'ELECTRICAL', 'HVAC', 'FURNITURE', 'CLEANING', 'STRUCTURAL', 'SAFETY', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaPhase" AS ENUM ('BEFORE', 'AFTER');

-- AlterTable
ALTER TABLE "facility_requests" ADD COLUMN     "category" "RequestCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "phase" "MediaPhase" NOT NULL DEFAULT 'BEFORE';

-- CreateIndex
CREATE INDEX "facility_requests_locationId_idx" ON "facility_requests"("locationId");

-- AddForeignKey
ALTER TABLE "facility_requests" ADD CONSTRAINT "facility_requests_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
