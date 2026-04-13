-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "recurring_schedules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" "RequestCategory" NOT NULL DEFAULT 'OTHER',
    "recurrence" "RecurrenceType" NOT NULL,
    "recurrenceDay" INTEGER,
    "recurrenceTime" TEXT NOT NULL DEFAULT '09:00',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "branchId" TEXT NOT NULL,
    "locationId" TEXT,
    "createdById" TEXT NOT NULL,
    "lastGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "recurring_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_schedules_branchId_idx" ON "recurring_schedules"("branchId");

-- CreateIndex
CREATE INDEX "recurring_schedules_isActive_idx" ON "recurring_schedules"("isActive");

-- AddForeignKey
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_schedules" ADD CONSTRAINT "recurring_schedules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
