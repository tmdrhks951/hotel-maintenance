import type { Department } from '@prisma/client';

// ================================================================
// 부서별 알림 수신 지점 코드 목록
//
// 팀장/부팀장 → 아래 목록에 포함된 지점의 요청이면 알림 수신
// 팀원        → 본인 담당 branchId와 일치하는 지점 요청만 수신
//
// 호점이 추가될 경우 해당 부서 배열에 code만 추가하면 됩니다.
// ================================================================

export const DEPARTMENT_BRANCH_SCOPE: Record<Department, string[]> = {
  // 운영 1팀: 명동 / 종로 / 사당 / SOA / 국도빌딩 / 카와우소 1,2호점
  OPERATIONS_1: ['MYEONGDONG', 'JONGRO-P', 'SADANG', 'SOA', 'GUKDO', 'KAWAUSO', 'KAWAUSO1', 'KAWAUSO2'],

  // 운영 2팀: 센트럴 / 덕수궁 / 스퀘어 / 더서울
  OPERATIONS_2: ['CENTRAL', 'DEOKSUGUNG', 'SQUARE', 'THESEOUL'],

  // 운영 3팀: 신사 단델리온 / 강남 / 코엑스 / 선릉
  OPERATIONS_3: ['SINSA', 'GANGNAM1', 'COEX', 'SEOLLEUNG'],

  // QC 1팀: 운영 1팀 + 운영 2팀 전체 (카와우소 3호점은 덕수궁에 묶여 운영2팀 관할)
  QC_1: [
    'MYEONGDONG', 'JONGRO-P', 'SADANG', 'SOA', 'GUKDO', 'KAWAUSO', 'KAWAUSO1', 'KAWAUSO2',
    'CENTRAL', 'DEOKSUGUNG', 'SQUARE', 'THESEOUL', 'KAWAUSO3',
  ],

  // QC 3팀: 운영 3팀과 동일
  QC_3: ['SINSA', 'GANGNAM1', 'COEX', 'SEOLLEUNG'],

  // 소속 없음
  NONE: [],
};
