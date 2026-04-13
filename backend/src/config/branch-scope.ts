import type { Department } from '@prisma/client';

// ================================================================
// 부서별 담당 지점 코드 목록
//
// 팀장/부팀장 → 회원가입 시 자동 고정, 알림 수신 범위
// 팀원(OPS)  → 회원가입 시 수동 선택, 본인 branchIds 범위
// QC 전체    → 회원가입 시 자동 고정
//
// 호점이 추가될 경우 해당 부서 배열에 code만 추가하면 됩니다.
// ================================================================

export const DEPARTMENT_BRANCH_CODES: Record<Department, string[]> = {
  // 운영 1팀: 명동1,2,3 / 종로1,2 / 사당 / 카와우소1,2 / 국도빌딩 / SOA
  OPERATIONS_1: [
    'MYEONGDONG1', 'MYEONGDONG2', 'MYEONGDONG3',
    'JONGNO', 'JONGNO2',
    'SADANG',
    'KAWAUSO1', 'KAWAUSO2',
    'GUKDO', 'SOA',
  ],

  // 운영 2팀: 더서울 / 덕수궁 / 스퀘어 / 센트럴 / 카와우소3
  OPERATIONS_2: [
    'THESEOUL', 'DEOKSUGUNG', 'SQUARE', 'CENTRAL',
    'KAWAUSO3',
  ],

  // 운영 3팀: 강남 / 코엑스(본관,별관) / 신사 단델리온 / 선릉
  OPERATIONS_3: [
    'GANGNAM', 'COEX_B', 'COEX_A', 'DANDELION', 'SEOLLEUNG',
  ],

  // QC 1팀: 운영1팀 + 운영2팀 전체
  QC_1: [
    'MYEONGDONG1', 'MYEONGDONG2', 'MYEONGDONG3',
    'JONGNO', 'JONGNO2',
    'SADANG',
    'THESEOUL', 'DEOKSUGUNG', 'SQUARE', 'CENTRAL',
    'KAWAUSO1', 'KAWAUSO2', 'KAWAUSO3',
    'GUKDO', 'SOA',
  ],

  // QC 3팀: 운영3팀과 동일
  QC_3: [
    'GANGNAM', 'COEX_B', 'COEX_A', 'DANDELION', 'SEOLLEUNG',
  ],

  // 소속 없음
  NONE: [],
};
