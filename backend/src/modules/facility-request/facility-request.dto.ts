import { RequestCategory, Priority } from '@prisma/client';

// ================================================================
// 기존 STEP 5 DTOs
// ================================================================

export interface CreateFacilityRequestDto {
  branchId: string;
  /// STEP 12: 위치(Location) — 필수
  locationId: string;
  /// STEP 12: 객실 번호 (예: "205호") — 필수
  roomNumber: string;
  category: RequestCategory;
  /// 한 줄 설명 — 운영팀 입력 최소화 원칙
  description: string;
}

export interface DuplicateCheckQuery {
  branchId: string;
  locationId?: string;
}

// ================================================================
// STEP 6 DTOs — QC 판단/긴급/우선순위/수령
// ================================================================

/**
 * MARK_REVIEW        : PENDING/REQUESTED → REVIEW_REQUIRED
 * RECEIVE            : PENDING/REQUESTED/REVIEW_REQUIRED → RECEIVED
 * CANCEL             : 모든 비종료 상태 → CANCELLED
 * REVERT_TO_REQUESTED: REVIEW_REQUIRED/RECEIVED → REQUESTED
 * START_WORK         : RECEIVED/SCHEDULED → IN_PROGRESS
 */
export type QcReviewAction =
  | 'MARK_REVIEW'
  | 'RECEIVE'
  | 'CANCEL'
  | 'REVERT_TO_REQUESTED'
  | 'START_WORK';

export interface QcReviewDto {
  /// 상태 전이 액션 (없으면 emergency/priority만 업데이트)
  action?: QcReviewAction;
  isEmergency?: boolean;
  /// isEmergency=true 일 때 필수
  emergencyReason?: string;
  priority?: Priority;
  /// StatusLog reason 필드
  reason?: string;
  /// STEP 12: RECEIVE 액션 시 필수 — QC 방문 예정일시 (ISO 8601)
  qcVisitScheduledAt?: string;
  /// STEP 12: RECEIVE 액션 시 필수 — 예상 소요시간 (분 단위)
  estimatedDuration?: number;
  /// STEP 12: RECEIVE 액션 시 필수 — 정비 필요 여부
  maintenanceRequired?: boolean;
}

// ================================================================
// STEP 12 DTOs — 팀장 보고 체크
// ================================================================

export interface ToggleReportDto {
  /// true: 보고 완료, false: 보고 미완료
  reported: boolean;
}

// ================================================================
// STEP 6 DTOs — 일정
// ================================================================

export interface UpdateScheduleDto {
  /// ISO 8601 date string
  plannedWorkDate: string;
  reason?: string;
}

// ================================================================
// STEP 6 DTOs — 담당자 배정
// ================================================================

export interface AssignWorkerDto {
  assignedToId: string;
}

// ================================================================
// STEP 7 DTOs — 작업 완료 등록
// ================================================================

// ================================================================
// 시설 요청 수정 DTO
// ================================================================

export interface UpdateFacilityRequestDto {
  title?: string;
  description?: string;
  category?: RequestCategory;
  locationId?: string | null;
}

// ================================================================
// STEP 8 DTOs — QC 최종 검토
// ================================================================

export type QcVerifyAction = 'VERIFY' | 'REOPEN';

export interface QcVerifyDto {
  action: QcVerifyAction;
  /// REOPEN 시 필수 사유
  note?: string;
}

// ================================================================
// STEP 8 DTOs — 운영팀 확인
// ================================================================

export interface OperationsConfirmDto {
  note?: string;
}

// ================================================================
// STEP 11 DTOs — 재오픈
// ================================================================

export interface ReopenFacilityRequestDto {
  /// 재오픈 사유 (필수)
  reason: string;
}

// ================================================================
// STEP 7 DTOs — 작업 완료 등록
// ================================================================

export interface CompleteWorkDto {
  /// 1차 작업 유형 (수리/교체/점검/임시조치/외주/보류)
  workAction: string;
  /// 2차 작업 항목
  workItem: string;
  /// 자동 생성된 완료 문구
  generatedText: string;
  /// 추가 메모 (선택)
  note?: string;
}
