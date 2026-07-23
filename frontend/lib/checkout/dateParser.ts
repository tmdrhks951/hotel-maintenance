// 다양한 한국/영문 날짜 표기를 YYYY-MM-DD 로 정규화 (UHC QC1에서 이식)

const MONTHS_EN: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function pad(n: number) { return n < 10 ? '0' + n : '' + n; }
function ymd(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** ISO timestamp (UTC) → KST 날짜 */
export function isoToKstDate(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  if (!/T\d{2}:\d{2}/.test(s)) return null;
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return null;
  const kst = new Date(dt.getTime() + 9 * 3600 * 1000);
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
}

/** 자유로운 날짜 텍스트 → YYYY-MM-DD (실패시 null) */
export function parseDate(s: string | null | undefined, defaultYear = 2026): string | null {
  if (!s) return null;
  let raw = String(s).trim();
  if (!raw) return null;

  const iso = isoToKstDate(raw);
  if (iso) return iso;

  raw = raw.replace(/\s+\d{1,2}:\d{2}.*$/, '').trim();
  raw = raw.replace(/\s*\|.*$/, '').trim();
  raw = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
  raw = raw.replace(/\s*\d{1,2}\s*박\s*$/, '').trim();
  raw = raw.replace(/\s*\([일월화수목금토]\)\s*$/, '').trim();
  raw = raw.replace(/\s*[일월화수목금토]요일\s*$/, '').trim();

  if (!raw) return null;

  let m = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/.exec(raw);
  if (m) return ymd(+m[1], +m[2], +m[3]);

  m = /^(\d{1,2})[/](\d{1,2})[/](\d{4})$/.exec(raw);
  if (m) return ymd(+m[3], +m[1], +m[2]);

  m = /^(\d{2})[-./](\d{1,2})[-./](\d{1,2})$/.exec(raw);
  if (m) return ymd(2000 + +m[1], +m[2], +m[3]);

  m = /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일?\s*$/.exec(raw);
  if (m) return ymd(+m[1], +m[2], +m[3]);

  m = /^(\d{1,2})월\s*(\d{1,2})일?\s*$/.exec(raw);
  if (m) return ymd(defaultYear, +m[1], +m[2]);

  m = /^(\d{1,2})[-/](\d{1,2})$/.exec(raw);
  if (m) return ymd(defaultYear, +m[1], +m[2]);

  m = /^(?:[A-Z][a-z]+,?\s*)?([A-Z][a-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/.exec(raw);
  if (m) {
    const mo = MONTHS_EN[m[1].toLowerCase()];
    if (mo) {
      const yr = m[3] ? +m[3] : defaultYear;
      return ymd(yr, mo, +m[2]);
    }
  }

  return null;
}

/** "M/D-M/D" 또는 "M/D ~ M/D" 같은 범위 → [start, end] */
export function parseRange(s: string, defaultYear = 2026): [string, string] | null {
  if (!s) return null;
  // ISO 날짜(YYYY-MM-DD)는 하이픈을 쓰므로, 먼저 "공백이 있는 하이픈"과
  // 물결/엔대시/至는 구분자로 분리 → 날짜 내부 하이픈은 건드리지 않는다.
  //   예) "2026-07-12 - 2026-07-19" → ["2026-07-12", "2026-07-19"]
  let parts = s.split(/\s*[~∼–至]\s*|\s+-\s+/);
  if (parts.length !== 2) {
    // 폴백: 하이픈 없는 날짜(YY/MM/DD·M/D 등)를 위한 단순 하이픈 분리
    parts = s.split(/\s*-\s*/);
  }
  if (parts.length !== 2) return null;
  const a = parseDate(parts[0], defaultYear);
  const b = parseDate(parts[1], defaultYear);
  if (a && b) return [a, b];
  return null;
}

/** 두 날짜 사이의 일 수 */
export function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/** 날짜에 N일 더해서 새 ISO 날짜 */
export function addDays(d: string, n: number): string {
  const dt = new Date(d + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** 오늘 (KST 기준) YYYY-MM-DD */
export function todayKst(): string {
  const now = new Date();
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  const kst = new Date(utc.getTime() + 9 * 3600 * 1000);
  return `${kst.getFullYear()}-${pad(kst.getMonth() + 1)}-${pad(kst.getDate())}`;
}
