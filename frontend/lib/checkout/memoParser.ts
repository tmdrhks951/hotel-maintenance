// 예약 메모 파싱 (UHC QC1에서 이식 — 체크아웃 기능에 필요한 예약 메모만)

import { parseDate, parseRange } from './dateParser';

const P_NAME = /(?:이름|예약자|성함|고객명|고객|Guest\s*name)\s*[:：]\s*(.+)/i;
const P_BOOKID = /(?:예약\s*번호|예약\s*ID|Booking\s*ID|Booking\s*number)\s*[:：]?\s*(\d+)/i;
const P_CHECKIN = /(?:Check\s*-?\s*in|체크인|입실|도착)\s*[:：]?\s*([^\n]+)/i;
const P_CHECKOUT = /(?:Check\s*-?\s*out|체크아웃|퇴실|출발)\s*[:：]?\s*([^\n]+)/i;
const P_STAY = /(?:투숙\s*기간|숙박\s*기간|Stay\s*dates?)\s*[:：]?\s*([^\n]+)/i;
const P_NIGHTS_LABEL = /박수\s*[:：]\s*(\d{1,2})/;
const P_NIGHTS_INLINE = /(\d{1,2})\s*박|\b(\d{1,2})\s*nights?\b/i;
const P_CONTACT = /(?:연락처|Contact(?:\s*details)?|Phone)\s*[:：]?\s*([^\n]+)/i;
const P_NATION = /(?:국적(?:\s*및\s*박수)?|residency|Nationality)\s*[:：]?\s*([^\n]+)/i;
const P_CLEAN = /전청\s*(\d+)/;

const RESERVE_HINT = /(예약\s*번호|예약\s*ID|Booking\s*ID|Booking\s*number|Check-?in|Check-?out|체크인|체크아웃|입실|퇴실|투숙\s*기간|숙박\s*기간|Stay\s*dates?|예약자|이름\s*[:：]|성함|고객명|Guest\s*name)/i;
const LONG_DIGIT = /\b\d{10,}\b/;

export type ParsedMemo = {
  isReservation: boolean;
  name?: string;
  bookingId?: string;
  nights?: number;
  contact?: string;
  nationality?: string;
  memoCheckIn?: string;
  memoCheckOut?: string;
  cleanAll?: number;
};

export function parseReservationMemo(memo: string, defaultYear = 2026): ParsedMemo {
  if (!memo || !memo.trim()) {
    return { isReservation: false };
  }

  const hasLabel = RESERVE_HINT.test(memo);
  const hasLongId = LONG_DIGIT.test(memo);
  const lineCount = memo.split('\n').filter((l) => l.trim()).length;
  const isReservation = hasLabel || (hasLongId && lineCount >= 3);

  if (!isReservation) {
    return { isReservation: false };
  }

  const out: ParsedMemo = { isReservation: true };

  let m = memo.match(P_NAME); if (m) out.name = m[1].trim();
  m = memo.match(P_BOOKID); if (m) out.bookingId = m[1].trim();
  m = memo.match(P_CONTACT); if (m) out.contact = m[1].trim();
  m = memo.match(P_NATION); if (m) out.nationality = m[1].trim();
  m = memo.match(P_CLEAN); if (m) out.cleanAll = +m[1];

  m = memo.match(P_NIGHTS_LABEL); if (m) out.nights = +m[1];
  if (out.nights === undefined) {
    m = memo.match(P_NIGHTS_INLINE);
    if (m) out.nights = +(m[1] || m[2]);
  }

  m = memo.match(P_CHECKIN);
  if (m) {
    const d = parseDate(m[1], defaultYear);
    if (d) out.memoCheckIn = d;
  }
  m = memo.match(P_CHECKOUT);
  if (m) {
    const d = parseDate(m[1], defaultYear);
    if (d) out.memoCheckOut = d;
  }

  if (!out.memoCheckIn || !out.memoCheckOut) {
    m = memo.match(P_STAY);
    if (m) {
      const r = parseRange(m[1], defaultYear);
      if (r) {
        if (!out.memoCheckIn) out.memoCheckIn = r[0];
        if (!out.memoCheckOut) out.memoCheckOut = r[1];
      }
    }
  }

  // fallback: 위치 기반 (압축식 메모)
  if (!out.bookingId || !out.name) {
    const lines = memo.split('\n').map((l) => l.trim()).filter((l) => l);
    for (const line of lines) {
      if (line.startsWith('*')) continue;
      if (!out.bookingId && /^\d{10,}$/.test(line)) {
        out.bookingId = line;
        continue;
      }
      if (!out.contact && /(\+\d|^\d{2,4}[-\s]\d{3,}[-\s])/.test(line)) {
        out.contact = line;
        continue;
      }
      if (!out.name && /[A-Za-z가-힣]/.test(line) && !/\d{4}/.test(line) && line.length < 50) {
        out.name = line;
      }
    }
  }

  return out;
}
