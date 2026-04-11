// ================================================================
// 공유 타입 — 백엔드 응답 구조와 1:1 매핑
// ================================================================

export type Role = 'ADMIN' | 'OPERATIONS' | 'QC';
export type Position = 'TEAM_LEADER' | 'DEPUTY_LEADER' | 'MEMBER' | 'OTHER';
export type LocationType = 'ROOM' | 'PUBLIC_AREA' | 'OFFICE' | 'BACK_OF_HOUSE';

// STEP 6: 확장된 상태 (기존 PENDING/RECEIVED/IN_PROGRESS/COMPLETED 유지)
export type FacilityRequestStatus =
  | 'PENDING'             // 레거시
  | 'REQUESTED'           // STEP 6 기본 초기 상태
  | 'REVIEW_REQUIRED'     // QC 검토 필요
  | 'RECEIVED'            // QC 수령
  | 'SCHEDULED'           // 일정 등록됨
  | 'IN_PROGRESS'         // 작업 진행중
  | 'DONE_BY_QC'          // QC 작업 완료
  | 'QC_VERIFIED'         // QC 최종 검토 완료
  | 'OPERATIONS_CONFIRMED'// 운영팀 확인 완료
  | 'CLOSED'              // 완전 종료
  | 'REOPENED'            // 재오픈
  | 'CANCELLED'           // 취소
  | 'COMPLETED';          // 레거시

// STEP 6: 우선순위
export type Priority = 'NORMAL' | 'HIGH' | 'URGENT';

export type RequestCategory =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'HVAC'
  | 'FURNITURE'
  | 'CLEANING'
  | 'STRUCTURAL'
  | 'SAFETY'
  | 'OTHER';

export type MediaPhase = 'BEFORE' | 'AFTER';

// ----------------------------------------------------------------
// 레이블 맵
// ----------------------------------------------------------------

export const LOCATION_TYPE_LABEL: Record<LocationType, string> = {
  ROOM: '객실',
  PUBLIC_AREA: '공용공간',
  OFFICE: '사무실',
  BACK_OF_HOUSE: '백오브하우스',
};

export const REQUEST_CATEGORY_LABEL: Record<RequestCategory, string> = {
  PLUMBING: '배관/수도',
  ELECTRICAL: '전기',
  HVAC: '냉난방',
  FURNITURE: '가구/비품',
  CLEANING: '청소/위생',
  STRUCTURAL: '구조/건축',
  SAFETY: '안전/보안',
  OTHER: '기타',
};

export const REQUEST_STATUS_LABEL: Record<FacilityRequestStatus, string> = {
  PENDING: '접수 대기',
  REQUESTED: '신규 요청',
  REVIEW_REQUIRED: '판단 필요',
  RECEIVED: '수령 완료',
  SCHEDULED: '일정 등록',
  IN_PROGRESS: '처리 중',
  DONE_BY_QC: 'QC 완료',
  QC_VERIFIED: 'QC 검토 완료',
  OPERATIONS_CONFIRMED: '운영팀 확인',
  CLOSED: '종료',
  REOPENED: '재오픈',
  CANCELLED: '취소',
  COMPLETED: '완료',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  NORMAL: '보통',
  HIGH: '높음',
  URGENT: '긴급',
};

// ----------------------------------------------------------------
// Auth
// ----------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  position: Position;
  branchId: string | null;
  isActive: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

// ----------------------------------------------------------------
// Branch
// ----------------------------------------------------------------

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number; locations: number };
}

// ----------------------------------------------------------------
// Location
// ----------------------------------------------------------------

export interface Location {
  id: string;
  name: string;
  code: string | null;
  type: LocationType;
  isActive: boolean;
  branchId: string;
  branch?: { id: string; name: string; code: string };
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------------------
// Media
// ----------------------------------------------------------------

export interface Media {
  id: string;
  url: string;
  filename: string;
  phase: MediaPhase;
  type: string;
}

// ----------------------------------------------------------------
// StatusLog (STEP 6)
// ----------------------------------------------------------------

export interface StatusLog {
  id: string;
  fromStatus: FacilityRequestStatus | null;
  toStatus: FacilityRequestStatus;
  reason: string | null;
  changedBy: { id: string; name: string; role: string };
  createdAt: string;
}

// ----------------------------------------------------------------
// FacilityRequest
// ----------------------------------------------------------------

export interface FacilityRequest {
  id: string;
  title: string;
  description: string;
  category: RequestCategory;
  status: FacilityRequestStatus;
  branchId: string;
  locationId: string | null;
  branch: { id: string; name: string; code: string };
  location: { id: string; name: string; code: string | null; type: LocationType } | null;
  createdAt: string;
  updatedAt: string;
}

// STEP 6: QC 큐 카드용 — 긴급/우선순위/일정 포함
export interface FacilityRequestCard extends FacilityRequest {
  isEmergency: boolean;
  priority: Priority;
  plannedWorkDate: string | null;
  scheduleChangeCount: number;
  createdBy: { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
}

// STEP 6: 요청 상세 — StatusLog, media, emergencySetBy 포함
export interface FacilityRequestDetail extends FacilityRequestCard {
  emergencyReason: string | null;
  emergencySetAt: string | null;
  emergencySetBy: { id: string; name: string } | null;
  assignedToId: string | null;
  createdById: string;
  media: Media[];
  statusLogs: StatusLog[];
}

// STEP 6: QC 큐 응답
export interface QcQueue {
  newRequests: FacilityRequestCard[];
  reviewRequired: FacilityRequestCard[];
  inProgress: FacilityRequestCard[];
}

// STEP 6: QC 판단 body
export type QcReviewAction = 'MARK_REVIEW' | 'RECEIVE' | 'CANCEL';

export interface QcReviewBody {
  action?: QcReviewAction;
  isEmergency?: boolean;
  emergencyReason?: string;
  priority?: Priority;
  reason?: string;
}

// STEP 6: 담당자 후보
export interface AssignableUser {
  id: string;
  name: string;
  role: string;
  position: string;
  email: string;
}

/** duplicate-check 응답 */
export interface DuplicateCheckResult {
  hasActiveRequest: boolean;
  count: number;
  activeRequests: Array<{
    id: string;
    title: string;
    status: FacilityRequestStatus;
    category: RequestCategory;
    createdAt: string;
    location: { id: string; name: string; code: string | null } | null;
  }>;
}

/** POST /facility-requests 응답 */
export interface CreateFacilityRequestResult {
  facilityRequest: FacilityRequest;
  media: Media | null;
}

// ----------------------------------------------------------------
// API 공통 응답
// ----------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  code?: string;
}
