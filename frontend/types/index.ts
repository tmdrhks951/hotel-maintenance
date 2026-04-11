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

// STEP 6+7: 요청 상세 — StatusLog, media, emergencySetBy, completedBy 포함
export interface FacilityRequestDetail extends FacilityRequestCard {
  emergencyReason: string | null;
  emergencySetAt: string | null;
  emergencySetBy: { id: string; name: string } | null;
  assignedToId: string | null;
  createdById: string;
  completedAt: string | null;
  completedById: string | null;
  completedBy: { id: string; name: string } | null;
  media: Media[];
  statusLogs: StatusLog[];
}

// STEP 6: QC 큐 응답
export interface QcQueue {
  newRequests: FacilityRequestCard[];
  reviewRequired: FacilityRequestCard[];
  inProgress: FacilityRequestCard[];
}

// STEP 6+7: QC 판단 body
export type QcReviewAction =
  | 'MARK_REVIEW'
  | 'RECEIVE'
  | 'CANCEL'
  | 'REVERT_TO_REQUESTED'
  | 'START_WORK';

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

// ----------------------------------------------------------------
// STEP 7: 작업 완료 — 작업 유형 / 항목
// ----------------------------------------------------------------

export const WORK_ACTIONS = ['수리', '교체', '점검', '임시조치', '외주', '보류'] as const;
export type WorkAction = (typeof WORK_ACTIONS)[number];

export const WORK_ACTION_ITEMS: Record<WorkAction, Partial<Record<RequestCategory, string[]>>> = {
  수리: {
    PLUMBING: ['누수 수리', '배수관 청소', '밸브 수리', '수전 수리', '변기 수리'],
    ELECTRICAL: ['콘센트 수리', '스위치 수리', '조명 배선 수리', '차단기 점검'],
    HVAC: ['필터 청소', '배관 수리', '냉매 보충', '팬 수리'],
    FURNITURE: ['문 경첩 수리', '서랍 수리', '잠금장치 수리'],
    CLEANING: ['배수구 청소', '그리스 트랩 청소', '오물 제거'],
    STRUCTURAL: ['균열 보수', '실링 수리', '바닥 수리'],
    SAFETY: ['비상구 수리', '잠금장치 수리', '안전장비 수리'],
    OTHER: ['기타 수리'],
  },
  교체: {
    PLUMBING: ['수도꼭지', '배수 트랩', '밸브', '호스', '변기 부품', '샤워헤드'],
    ELECTRICAL: ['전구', '형광등', 'LED', '콘센트', '스위치', '차단기'],
    HVAC: ['필터', '리모컨', '배터리'],
    FURNITURE: ['경첩', '손잡이', '잠금장치', '의자 바퀴'],
    CLEANING: ['소모품'],
    STRUCTURAL: ['도어 씰', '창문 씰'],
    SAFETY: ['배터리', '화재감지기', '소화기'],
    OTHER: ['기타 교체'],
  },
  점검: {
    PLUMBING: ['전체 배관 점검', '누수 여부 확인', '수압 점검'],
    ELECTRICAL: ['전기 안전 점검', '누전 점검', '접지 확인'],
    HVAC: ['냉난방 작동 점검', '환기 점검', '필터 상태 확인'],
    FURNITURE: ['가구 상태 점검', '고정 상태 확인'],
    CLEANING: ['위생 상태 점검'],
    STRUCTURAL: ['구조물 안전 점검', '방수 점검'],
    SAFETY: ['안전장비 점검', '비상구 점검', '화재감지기 테스트'],
    OTHER: ['전체 점검'],
  },
  임시조치: {
    PLUMBING: ['지수 밸브 잠금', '임시 배관 연결', '버킷 설치'],
    ELECTRICAL: ['임시 차단 조치', '테이프 절연 처리'],
    HVAC: ['임시 운전 중단'],
    FURNITURE: ['임시 고정', '사용 제한 표시'],
    CLEANING: ['격리 조치'],
    STRUCTURAL: ['안전 테이프 설치', '통행 제한'],
    SAFETY: ['임시 경보 비활성화', '안전구역 설정'],
    OTHER: ['임시 처리'],
  },
  외주: {
    PLUMBING: ['배관 전문업체 의뢰'],
    ELECTRICAL: ['전기 전문업체 의뢰'],
    HVAC: ['냉난방 전문업체 의뢰'],
    FURNITURE: ['가구 전문업체 의뢰'],
    CLEANING: ['전문 청소업체 의뢰'],
    STRUCTURAL: ['건축 전문업체 의뢰'],
    SAFETY: ['안전 전문업체 의뢰'],
    OTHER: ['외주 의뢰'],
  },
  보류: {
    PLUMBING: ['부품 대기', '예산 검토 필요'],
    ELECTRICAL: ['부품 대기', '예산 검토 필요'],
    HVAC: ['부품 대기', '예산 검토 필요'],
    FURNITURE: ['부품 대기', '예산 검토 필요'],
    CLEANING: ['용품 대기', '예산 검토 필요'],
    STRUCTURAL: ['예산 검토 필요', '전문가 검토 필요'],
    SAFETY: ['부품 대기', '예산 검토 필요'],
    OTHER: ['보류'],
  },
};

export function generateCompletionText(
  category: RequestCategory,
  action: WorkAction,
  item: string,
): string {
  const catLabel = REQUEST_CATEGORY_LABEL[category];
  if (action === '보류') return `[보류] ${catLabel} ${item}`;
  if (action === '외주') return `[외주] ${catLabel} ${item}`;
  return `${catLabel} ${item} ${action} 완료`;
}

// STEP 7: 완료 등록 body (FormData로 전송)
export interface CompleteWorkBody {
  workAction: string;
  workItem: string;
  generatedText: string;
  note?: string;
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
