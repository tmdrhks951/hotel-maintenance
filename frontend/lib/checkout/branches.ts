// 예약 시트의 섹션 헤더 → 지점 매핑 (UHC QC1에서 이식)
// 주의: 시트 구조(섹션 헤더)가 바뀌면 SECTION_RULES를 갱신해야 한다.

import type { CheckoutBranch, CheckoutBranchKey } from './types';

export const CHECKOUT_BRANCHES: CheckoutBranch[] = [
  // 체크아웃 시트에 존재하는 9개 지점
  { key: 'myeongdong-1', label: '명동 1호점', color: '#4f8ef7', hasCheckout: true },
  { key: 'myeongdong-2', label: '명동 2호점', color: '#7c5cfa', hasCheckout: true },
  { key: 'myeongdong-3', label: '명동 3호점', color: '#a78bfa', hasCheckout: true },
  { key: 'jongno-1', label: '종로 1호점', color: '#38bdf8', hasCheckout: true },
  { key: 'jongno-2', label: '종로 2호점', color: '#4ade80', hasCheckout: true },
  { key: 'seoul', label: '더 서울', color: '#34d399', hasCheckout: true },
  { key: 'seoul-square', label: '서울 스퀘어', color: '#fbbf24', hasCheckout: true },
  { key: 'seoul-central', label: '센트럴 서울', color: '#f472b6', hasCheckout: true },
  { key: 'deoksugung', label: '서울 덕수궁', color: '#fb923c', hasCheckout: true },
  // 체크아웃 시트에 없는 지점 (매핑 안전용)
  { key: 'sadang', label: '사당', color: '#94a3b8', hasCheckout: false },
  { key: 'kawauso-1', label: '카와우소 1호점', color: '#a3a3a3', hasCheckout: false },
  { key: 'kawauso-2', label: '카와우소 2호점', color: '#737373', hasCheckout: false },
  { key: 'kawauso-3', label: '카와우소 3호점', color: '#525252', hasCheckout: false },
  { key: 'gwanghwamun', label: '광화문', color: '#6b7280', hasCheckout: false },
  { key: 'sinsa', label: '신사 단델리온', color: '#d97706', hasCheckout: false },
  { key: 'gangnam-1', label: '강남 1호점', color: '#dc2626', hasCheckout: false },
  { key: 'gangnam-coex-main', label: '강남COEX점 본관', color: '#7c3aed', hasCheckout: false },
  { key: 'gangnam-coex-annex', label: '강남COEX점 별관', color: '#9333ea', hasCheckout: false },
  { key: 'seolleung', label: '선릉', color: '#0891b2', hasCheckout: false },
];

export const CHECKOUT_BRANCH_BY_KEY: Record<CheckoutBranchKey, CheckoutBranch> =
  CHECKOUT_BRANCHES.reduce(
    (acc, b) => ({ ...acc, [b.key]: b }),
    {} as Record<CheckoutBranchKey, CheckoutBranch>,
  );

type SectionRule = {
  match: (header: string) => boolean;
  resolve: (roomNumber: string) => CheckoutBranchKey | null;
};

export const SECTION_RULES: SectionRule[] = [
  { match: (h) => /Myeongdong\s*\/\s*1호점/i.test(h), resolve: () => 'myeongdong-1' },
  { match: (h) => /Myeongdong\s*\/\s*2호점/i.test(h), resolve: () => 'myeongdong-2' },
  { match: (h) => /Myeongdong\s*\/\s*3호점/i.test(h), resolve: () => 'myeongdong-3' },
  {
    // checkout1 시트는 명동 영역에 섹션 마커가 없거나 'UH SUITE Team 1' 팀 헤더 사용
    match: (h) => /^The\s+Myeongdong\b/i.test(h) || /UH\s*SUITE/i.test(h) || h === '명동' || h === '',
    resolve: (room) => {
      if (room.startsWith('A')) return 'myeongdong-1';
      if (room.startsWith('M')) return 'myeongdong-2';
      if (room.startsWith('N')) return 'myeongdong-3';
      return null;
    },
  },
  {
    match: (h) => /^The\s+Jongno\b/i.test(h) || h === '종로' || h === '종로점',
    resolve: (room) => (room.startsWith('A') ? 'jongno-2' : 'jongno-1'),
  },
  { match: (h) => /^The\s+Seoul\b/i.test(h) || h === '더서울' || h === '더 서울', resolve: () => 'seoul' },
  { match: (h) => /^Seoul\s+Square\b/i.test(h) || h === '서울스퀘어' || h === '서울 스퀘어', resolve: () => 'seoul-square' },
  { match: (h) => /central/i.test(h) || h === '센트럴서울' || h === '센트럴 서울', resolve: () => 'seoul-central' },
  { match: (h) => /^Deoksugung\b/i.test(h) || h === '덕수궁' || h === '덕수궁점', resolve: () => 'deoksugung' },
  { match: (h) => /SADANG/i.test(h) || h === '사당', resolve: () => 'sadang' },
  { match: (h) => /^The\s+Gwanghwamun\b/i.test(h) || h === '광화문', resolve: () => 'gwanghwamun' },
  { match: (h) => /카와우소\s*1/.test(h), resolve: () => 'kawauso-1' },
  { match: (h) => /카와우소\s*2/.test(h), resolve: () => 'kawauso-2' },
  { match: (h) => /카와우소\s*3/.test(h), resolve: () => 'kawauso-3' },
  { match: (h) => /신사/.test(h) || /단델리온/.test(h), resolve: () => 'sinsa' },
  { match: (h) => /강남\s*COEX/i.test(h) && /본관/.test(h), resolve: () => 'gangnam-coex-main' },
  { match: (h) => /강남\s*COEX/i.test(h) && /별관/.test(h), resolve: () => 'gangnam-coex-annex' },
  { match: (h) => /강남\s*COEX/i.test(h), resolve: () => 'gangnam-coex-main' },
  { match: (h) => /^강남\s*1호점/.test(h) || h === '강남 1호점', resolve: () => 'gangnam-1' },
  { match: (h) => /선릉/.test(h), resolve: () => 'seolleung' },
];

export function resolveBranch(sectionHeader: string, roomNumber: string): CheckoutBranchKey | null {
  const rule = SECTION_RULES.find((r) => r.match(sectionHeader));
  if (!rule) return null;
  return rule.resolve(roomNumber);
}
