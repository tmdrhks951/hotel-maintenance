import { RequestCategory, Priority } from '@prisma/client';

// ================================================================
// 기존 STEP 5 DTOs
// ================================================================

export interface CreateFacilityRequestDto {
  branchId: string;
  locationId?: string;
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
 * MARK_REVIEW : PENDING/REQUESTED → REVIEW_REQUIRED
 * RECEIVE     : PENDING/REQUESTED/REVIEW_REQUIRED → RECEIVED
 * CANCEL      : 모든 비종료 상태 → CANCELLED
 */
export type QcReviewAction = 'MARK_REVIEW' | 'RECEIVE' | 'CANCEL';

export interface QcReviewDto {
  /// 상태 전이 액션 (없으면 emergency/priority만 업데이트)
  action?: QcReviewAction;
  isEmergency?: boolean;
  /// isEmergency=true 일 때 필수
  emergencyReason?: string;
  priority?: Priority;
  /// StatusLog reason 필드
  reason?: string;
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
