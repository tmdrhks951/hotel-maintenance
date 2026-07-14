// 예약 시트 raw 데이터 → Reservation[] + 조회 인덱스 (UHC QC1에서 이식, 체크아웃만)

import type { CheckoutSheets } from './gas';
import type { RawSheet, Reservation } from './types';
import { resolveBranch } from './branches';
import { isoToKstDate, addDays, diffDays } from './dateParser';
import { parseReservationMemo } from './memoParser';

// ─── 헤더/호실 위치 자동 감지 ──────────────────
type SheetLayout = {
  headerRow: number;
  dateCols: Map<number, string>;
  rooms: { row: number; number: string; section: string }[];
};

function detectLayout(sheet: RawSheet): SheetLayout {
  const v = sheet.values;

  let headerRow = -1;
  for (let r = 0; r < Math.min(v.length, 20); r++) {
    const a = String(v[r][0] ?? '').trim();
    const b = String(v[r][1] ?? '').trim();
    if ((a === 'TYPE' || a === '타입') && (b === 'ROOM' || b === '룸')) {
      headerRow = r;
      break;
    }
  }
  if (headerRow < 0) headerRow = 4;

  const dateCols = new Map<number, string>();
  const headerRowVals = v[headerRow] || [];
  for (let c = 2; c < headerRowVals.length; c++) {
    const d = isoToKstDate(headerRowVals[c]);
    if (d) dateCols.set(c, d);
  }

  const rooms: SheetLayout['rooms'] = [];
  let curMain = '';
  let curSub = '';

  const EXCLUDE_RE = /^(\*|TYPE|타입|ROOM|룸|취소|STATION|NAVER|CMS|Room\s*Sold|판매|최소|금액|잔여|party\s*room|국도빌딩|업체컨텍|누수관련|장기작업|공실작업|각종검침|소방|전객실|방충망|모뎀|샤워실|복도|거울|스파|문서업무|요일|출근시|당일\s*스프|객실,|각\s*지점|스케줄에|견적|기타\s*문의|스프레드\s*최신화|지점별|월별\s*시설|작업완료|노션\s*최신화|주차별)/i;
  const SUB_RE = /^[1-9]호점$/;

  for (let r = 0; r < v.length; r++) {
    const aRaw = String(v[r][0] ?? '').trim();
    const bRaw = String(v[r][1] ?? '').trim();

    if (aRaw && !bRaw && aRaw.length < 30 && !EXCLUDE_RE.test(aRaw) && !/^[일월화수목금토]$/.test(aRaw)) {
      if (SUB_RE.test(aRaw)) {
        curSub = aRaw;
      } else {
        curMain = aRaw;
        curSub = '';
      }
    }

    if (/^[A-Z]?-?\d{2,4}(\s*\([^)]{1,10}\))?$/.test(bRaw)) {
      const section = curSub ? `${curMain} / ${curSub}` : curMain;
      rooms.push({ row: r, number: bRaw, section });
    }
  }

  return { headerRow, dateCols, rooms };
}

// ─── 셀 종류 분류 ──────────────────────────────
function classifyCellKind(val: unknown): 'EMPTY' | 'PRICE' | 'OOO' | 'SPECIAL' | 'VAC' {
  if (val === null || val === undefined || val === '') return 'EMPTY';
  if (typeof val === 'number') return 'PRICE';
  const s = String(val).trim();
  if (!s) return 'EMPTY';
  if (/^vac(ant|ancy)?$/i.test(s)) return 'VAC';
  if (/^[\d,]+$/.test(s)) return 'PRICE';
  if (/^[Oo]\.?[Oo]\.?[Oo]$/.test(s) || /^o\s*o\s*o$/i.test(s) || /^OOO$/i.test(s)) return 'OOO';
  return 'SPECIAL';
}

// ─── 체크아웃 시트 → Reservation[] ─────────────
function extractReservations(sheet: RawSheet): Reservation[] {
  const layout = detectLayout(sheet);
  const out: Reservation[] = [];

  for (const room of layout.rooms) {
    for (const [col, cellDate] of layout.dateCols) {
      const v = sheet.values[room.row]?.[col];
      const kind = classifyCellKind(v);
      if (kind === 'EMPTY' || kind === 'VAC') continue;
      const memo = sheet.notes[room.row]?.[col] ?? '';
      const branch = resolveBranch(room.section, room.number);
      if (!branch) continue;

      const parsed = parseReservationMemo(memo, 2026);

      const checkIn = parsed.memoCheckIn ?? cellDate;
      let checkOut: string | null = null;
      let confidence: 'high' | 'medium' | 'low' = 'low';
      const warnings: string[] = [];

      if (parsed.memoCheckOut) {
        checkOut = parsed.memoCheckOut;
        confidence = 'medium';
      }
      if (parsed.nights && cellDate) {
        const inferred = addDays(cellDate, parsed.nights);
        if (checkOut) {
          const d = diffDays(checkOut, inferred);
          if (Math.abs(d) <= 1) confidence = 'high';
          else {
            confidence = 'low';
            warnings.push(`memo vs cell+nights 차이 ${d}일`);
          }
        } else {
          checkOut = inferred;
          confidence = 'medium';
        }
      }
      if (!checkOut) {
        warnings.push('체크아웃 추출 실패 — 직접 확인 필요');
      }

      out.push({
        branchKey: branch,
        roomNumber: room.number,
        cellDate,
        cellKind: kind === 'PRICE' ? 'PRICE' : kind === 'OOO' ? 'OOO' : 'SPECIAL',
        cellRaw: typeof v === 'number' ? v : String(v),
        parsed: {
          name: parsed.name,
          bookingId: parsed.bookingId,
          nights: parsed.nights,
          contact: parsed.contact,
          nationality: parsed.nationality,
          memoCheckIn: parsed.memoCheckIn,
          memoCheckOut: parsed.memoCheckOut,
          cleanAll: parsed.cleanAll,
        },
        resolved: { checkIn, checkOut, confidence, warnings },
        rawMemo: memo,
      });
    }
  }

  return out;
}

// ─── 인덱스 ────────────────────────────────────
export type CheckoutIndex = {
  reservations: Reservation[];
  reservationsByCheckOut: Map<string, Reservation[]>; // YYYY-MM-DD → 그날 체크아웃
  reservationsByRoom: Map<string, Reservation[]>; // 'branchKey|number' → 그 호실 예약들
  fetchedAt: Date;
};

/** 이미 가공된 reservations로부터 인덱스 재구축 (캐시 복원용) */
export function buildIndexFromReservations(
  reservations: Reservation[],
  fetchedAt: Date,
): CheckoutIndex {
  const reservationsByCheckOut = new Map<string, Reservation[]>();
  const reservationsByRoom = new Map<string, Reservation[]>();
  const confRank = { high: 3, medium: 2, low: 1 } as const;

  for (const r of reservations) {
    if (r.resolved.checkOut) {
      const list = reservationsByCheckOut.get(r.resolved.checkOut) ?? [];
      // 같은 호실이 같은 날짜에 중복 추정되면 confidence 높은 쪽만 유지
      const dupIdx = list.findIndex(
        (x) => x.branchKey === r.branchKey && x.roomNumber === r.roomNumber,
      );
      if (dupIdx < 0) {
        list.push(r);
      } else if (confRank[r.resolved.confidence] > confRank[list[dupIdx].resolved.confidence]) {
        list[dupIdx] = r;
      }
      reservationsByCheckOut.set(r.resolved.checkOut, list);
    }
    const roomKey = r.branchKey + '|' + r.roomNumber;
    const list2 = reservationsByRoom.get(roomKey) ?? [];
    list2.push(r);
    reservationsByRoom.set(roomKey, list2);
  }

  for (const arr of reservationsByRoom.values()) {
    arr.sort((a, b) => a.cellDate.localeCompare(b.cellDate));
  }

  return { reservations, reservationsByCheckOut, reservationsByRoom, fetchedAt };
}

export function buildIndex(raw: CheckoutSheets): CheckoutIndex {
  const reservations: Reservation[] = [
    ...extractReservations(raw.checkout1),
    ...extractReservations(raw.checkout2),
  ];
  return buildIndexFromReservations(reservations, raw.fetchedAt);
}
