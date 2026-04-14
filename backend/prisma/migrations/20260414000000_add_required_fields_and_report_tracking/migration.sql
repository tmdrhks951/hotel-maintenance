-- STEP 12: 시설요청 필수 필드 추가 + 팀장 보고 체크
-- 1) 객실번호, QC 수령 시 입력 필드들 (예상 소요시간, 정비 필요 여부)
-- 2) 운영팀/QC 팀장급 보고 체크 (opsReported/qcReported)

-- AlterTable
ALTER TABLE "facility_requests" ADD COLUMN     "roomNumber" TEXT;
ALTER TABLE "facility_requests" ADD COLUMN     "estimatedDuration" INTEGER;
ALTER TABLE "facility_requests" ADD COLUMN     "maintenanceRequired" BOOLEAN;

ALTER TABLE "facility_requests" ADD COLUMN     "opsReported" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "facility_requests" ADD COLUMN     "opsReportedAt" TIMESTAMP(3);
ALTER TABLE "facility_requests" ADD COLUMN     "opsReportedById" TEXT;

ALTER TABLE "facility_requests" ADD COLUMN     "qcReported" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "facility_requests" ADD COLUMN     "qcReportedAt" TIMESTAMP(3);
ALTER TABLE "facility_requests" ADD COLUMN     "qcReportedById" TEXT;

-- AddForeignKey
ALTER TABLE "facility_requests" ADD CONSTRAINT "facility_requests_opsReportedById_fkey" FOREIGN KEY ("opsReportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "facility_requests" ADD CONSTRAINT "facility_requests_qcReportedById_fkey" FOREIGN KEY ("qcReportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
