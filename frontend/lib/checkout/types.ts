// 객실 체크아웃 조회 — 예약 시트 해석 타입
// (UHC QC1 스케줄 관리표에서 이식, 체크아웃 기능만 발췌)

// ─── 시트 raw ─────────────────────────────────
export type RawSheet = {
  values: (string | number | null)[][];
  notes: string[][];
  backgrounds: string[][];
  rows: number;
  cols: number;
};

// ─── 지점 ─────────────────────────────────────
export type CheckoutBranchKey =
  | 'myeongdong-1' | 'myeongdong-2' | 'myeongdong-3'
  | 'jongno-1' | 'jongno-2'
  | 'seoul' | 'seoul-square' | 'seoul-central' | 'deoksugung'
  | 'sadang' | 'kawauso-1' | 'kawauso-2' | 'kawauso-3'
  | 'gwanghwamun' | 'sinsa' | 'gangnam-1'
  | 'gangnam-coex-main' | 'gangnam-coex-annex'
  | 'seolleung';

export type CheckoutBranch = {
  key: CheckoutBranchKey;
  label: string;
  color: string;
  hasCheckout: boolean; // 체크아웃 시트에 존재하는 지점만 true
};

// ─── 예약 (1점유셀 = 1예약) ─────────────────────
export type Reservation = {
  branchKey: CheckoutBranchKey;
  roomNumber: string;
  cellDate: string; // YYYY-MM-DD (체크인 후보)
  cellKind: 'PRICE' | 'OOO' | 'SPECIAL';
  cellRaw: string | number;

  parsed: {
    name?: string;
    bookingId?: string;
    nights?: number;
    contact?: string;
    nationality?: string;
    memoCheckIn?: string;
    memoCheckOut?: string;
    cleanAll?: number;
  };

  resolved: {
    checkIn: string; // YYYY-MM-DD
    checkOut: string | null;
    confidence: 'high' | 'medium' | 'low';
    warnings: string[];
  };

  rawMemo: string;
};
