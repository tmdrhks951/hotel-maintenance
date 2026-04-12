// ================================================================
// 공유 타입 — 백엔드 응답 구조와 1:1 매핑
// ================================================================

export type Role = 'ADMIN' | 'OPERATIONS' | 'QC' | 'VENDOR';

export type Department = 'OPERATIONS_1' | 'OPERATIONS_2' | 'OPERATIONS_3' | 'QC_1' | 'QC_3' | 'NONE';

export const DEPARTMENT_LABEL: Record<Department, string> = {
  OPERATIONS_1: '운영1팀',
  OPERATIONS_2: '운영2팀',
  OPERATIONS_3: '운영3팀',
  QC_1: 'QC1팀',
  QC_3: 'QC3팀',
  NONE: '해당없음',
};

export const POSITION_LABEL: Record<Position, string> = {
  TEAM_LEADER: '팀장',
  DEPUTY_LEADER: '부팀장',
  MEMBER: '팀원',
  OTHER: '기타',
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: '관리자',
  OPERATIONS: '운영팀',
  QC: 'QC',
  VENDOR: '외부업체',
};
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
  loginId: string | null;
  name: string;
  role: Role;
  position: Position;
  department: Department;
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
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number; locations: number };
  children?: Branch[];
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

// STEP 6+7+8: 요청 상세
export interface FacilityRequestDetail extends FacilityRequestCard {
  emergencyReason: string | null;
  emergencySetAt: string | null;
  emergencySetBy: { id: string; name: string } | null;
  assignedToId: string | null;
  createdById: string;
  completedAt: string | null;
  completedById: string | null;
  completedBy: { id: string; name: string } | null;
  // STEP 8
  qcVerifiedById: string | null;
  qcVerifiedAt: string | null;
  qcVerifiedBy: { id: string; name: string } | null;
  operationsConfirmedByUserId: string | null;
  operationsConfirmedAt: string | null;
  operationsConfirmedBy: { id: string; name: string } | null;
  // STEP 11
  reopenCount: number;
  media: Media[];
  statusLogs: StatusLog[];
}

// STEP 6: QC 큐 응답
export interface QcQueue {
  newRequests: FacilityRequestCard[];
  reviewRequired: FacilityRequestCard[];
  inProgress: FacilityRequestCard[];
}

// STEP 9: QC 완료 이력 카드 (완료된 요청, 댓글 수 포함)
export interface QcHistoryCard {
  id: string;
  title: string;
  status: FacilityRequestStatus;
  category: RequestCategory;
  updatedAt: string;
  completedAt: string | null;
  operationsConfirmedAt: string | null;
  branch: { id: string; name: string; code: string };
  location: { id: string; name: string; code: string | null; type: LocationType } | null;
  completedBy: { id: string; name: string } | null;
  operationsConfirmedBy: { id: string; name: string } | null;
  _count: { comments: number };
}

// STEP 8: QC 완료 큐 응답
export interface QcCompletedQueue {
  doneByQc: FacilityRequestCard[];
}

// STEP 8: 운영팀 확인 큐 카드 (timestamp 포함)
export interface OperationsCard extends FacilityRequestCard {
  completedAt: string | null;
  qcVerifiedAt: string | null;
  qcVerifiedBy: { id: string; name: string } | null;
  operationsConfirmedAt: string | null;
  operationsConfirmedBy: { id: string; name: string } | null;
}

// STEP 8: 운영팀 확인 큐 응답
export interface OperationsPendingQueue {
  pending: OperationsCard[];
  recentClosed: OperationsCard[];
}

// 작업 이력 아이템 (달력·키워드 검색용)
export interface WorkHistoryItem {
  id: string;
  title: string;
  description: string;
  status: FacilityRequestStatus;
  category: RequestCategory;
  isEmergency: boolean;
  completedAt: string | null;
  qcVerifiedAt: string | null;
  operationsConfirmedAt: string | null;
  plannedWorkDate: string | null;
  branch:   { id: string; name: string; code: string };
  location: { id: string; name: string; code: string | null } | null;
  assignedTo:            { id: string; name: string } | null;
  completedBy:           { id: string; name: string } | null;
  qcVerifiedBy:          { id: string; name: string } | null;
  operationsConfirmedBy: { id: string; name: string } | null;
}

// 운영팀 대시보드 응답 (4개 섹션)
export interface OperationsDashboard {
  requested: OperationsCard[];
  scheduled: OperationsCard[];
  today: OperationsCard[];
  completed: OperationsCard[];
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
  // item이 이미 카테고리명으로 시작하면 prefix 생략 (e.g. "기타 수리" → catLabel "기타")
  const prefix = item.startsWith(catLabel) ? '' : `${catLabel} `;
  return `${prefix}${item} 완료`;
}

// ----------------------------------------------------------------
// STEP 9: 댓글
// ----------------------------------------------------------------

export interface Comment {
  id: string;
  content: string;
  depth: number;
  requestId: string;
  parentId: string | null;
  rootId: string | null;
  author: { id: string; name: string; role: Role };
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CommentNode extends Comment {
  children: CommentNode[];
}

// STEP 8: QC 최종 검토 body
export interface QcVerifyBody {
  action: 'VERIFY' | 'REOPEN';
  note?: string;
}

// STEP 8: 운영팀 확인 body
export interface OperationsConfirmBody {
  note?: string;
}

// STEP 11: 재오픈 body
export interface ReopenBody {
  reason: string;
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
// STEP 10: 알림
// ----------------------------------------------------------------

export type NotificationType =
  | 'FACILITY_REQUEST_CREATED'
  | 'COMMENT_CREATED'
  | 'STATUS_CHANGED'
  | 'EMERGENCY_SET'
  | 'WORKER_ASSIGNED'
  | 'REQUEST_REOPENED'
  | 'OPERATIONS_CONFIRM_REQUESTED';

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  FACILITY_REQUEST_CREATED: '새 요청',
  COMMENT_CREATED: '새 댓글',
  STATUS_CHANGED: '상태 변경',
  EMERGENCY_SET: '긴급 전환',
  WORKER_ASSIGNED: '작업일정 조율',
  REQUEST_REOPENED: '재오픈',
  OPERATIONS_CONFIRM_REQUESTED: '작업완료',
};

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  requestId: string | null;
  bundleKey: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  request: { plannedWorkDate: string | null } | null;
}

// ----------------------------------------------------------------
// STEP 10: KPI / 예외관리
// ----------------------------------------------------------------

export interface KpiSummary {
  total: number;
  totalOpen: number;
  closedCount: number;
  emergencyOpen: number;
  avgClosureHours: number | null;
  reopenRate: number;
  everReopenedCount: number;
  repeatIssuesCount: number;
}

export interface AgingRequest {
  id: string;
  title: string;
  status: FacilityRequestStatus;
  category: RequestCategory;
  isEmergency: boolean;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  agingDays: number;
  branch: { id: string; name: string; code: string };
  location: { id: string; name: string; code: string | null; type: LocationType } | null;
  assignedTo: { id: string; name: string } | null;
}

export interface ReopenedResult {
  total: number;
  requests: Array<{
    id: string;
    title: string;
    status: FacilityRequestStatus;
    category: RequestCategory;
    isEmergency: boolean;
    createdAt: string;
    updatedAt: string;
    branch: { id: string; name: string; code: string };
    location: { id: string; name: string } | null;
  }>;
}

export interface RepeatIssue {
  locationId: string | null;
  location: {
    id: string;
    name: string;
    code: string | null;
    type: LocationType;
    branch: { id: string; name: string };
  } | null;
  category: RequestCategory;
  count: number;
}

export interface AdminFilters {
  branchId?: string;
  startDate?: string;
  endDate?: string;
}

// ----------------------------------------------------------------
// 사용자 관리 (ADMIN)
// ----------------------------------------------------------------

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  position: Position;
  isActive: boolean;
  branchId: string | null;
  branch: { id: string; name: string; code: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserBody {
  email: string;
  password: string;
  name: string;
  role: Role;
  position?: Position;
  branchId?: string;
}

export interface UpdateUserBody {
  name?: string;
  role?: Role;
  position?: Position;
  branchId?: string | null;
  isActive?: boolean;
}

export interface ListUsersQuery {
  role?: Role;
  branchId?: string;
  isActive?: boolean;
}

// ----------------------------------------------------------------
// 반복 점검 스케줄
// ----------------------------------------------------------------

export type RecurrenceType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export const RECURRENCE_LABEL: Record<RecurrenceType, string> = {
  DAILY: '매일',
  WEEKLY: '매주',
  MONTHLY: '매월',
};

export const DAY_OF_WEEK_LABEL = ['일', '월', '화', '수', '목', '금', '토'];

export interface RecurringSchedule {
  id: string;
  title: string;
  description: string;
  category: RequestCategory;
  recurrence: RecurrenceType;
  recurrenceDay: number | null;
  recurrenceTime: string;
  isActive: boolean;
  branchId: string;
  branch: { id: string; name: string };
  locationId: string | null;
  location: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
  lastGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleBody {
  title: string;
  description?: string;
  category: RequestCategory;
  recurrence: RecurrenceType;
  recurrenceDay?: number;
  recurrenceTime?: string;
  branchId: string;
  locationId?: string;
}

export interface UpdateScheduleBody {
  title?: string;
  description?: string;
  category?: RequestCategory;
  recurrence?: RecurrenceType;
  recurrenceDay?: number;
  recurrenceTime?: string;
  isActive?: boolean;
  branchId?: string;
  locationId?: string;
}

// ----------------------------------------------------------------
// 비밀번호 재설정 요청 (관리자 승인용)
// ----------------------------------------------------------------

export interface PasswordResetRequest {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedById: string | null;
  reviewedAt: string | null;
  note: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    loginId: string | null;
    role: Role;
    department: Department;
    position: Position;
  };
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
