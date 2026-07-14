// Google Apps Script 클라이언트 — 예약(체크아웃) 시트 2개만 읽는다.
// (UHC QC1에서 이식. GAS가 CORS *를 허용하므로 일반 fetch 사용)

import type { RawSheet, Reservation } from './types';

const GAS_URL =
  'https://script.google.com/macros/s/AKfycbwrDQyPA7MyjNySlfsJv2ZqLUUY-9agQq79n5GStF1NBE_jw0b6S1K6UJzl1A33fst6/exec';
const TOKEN = 'analyze_2026';

const SHEETS = {
  checkout1: { id: '1-lNrIbaGx9hj4Aproufw2xFdtWgIj7KFX6DBnCGVYcU', name: '2026(통합)' },
  checkout2: { id: '122lYNqUxIvPn0q0QL80drJSIU-gNPzeKQBoBzv9UJcc', name: '2026' },
} as const;

export type CheckoutSheets = {
  checkout1: RawSheet;
  checkout2: RawSheet;
  fetchedAt: Date;
};

export type ProgressFn = (msg: string) => void;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── 탭 이름 자동 해석 (시트 관리자가 탭 이름을 바꾸는 경우 대비) ───
const normName = (s: string) => s.replace(/\s+/g, '').replace(/년/g, '');

async function resolveSheetName(
  spec: { id: string; name: string },
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${GAS_URL}?token=${TOKEN}&sheetId=${encodeURIComponent(spec.id)}`,
      { method: 'GET', signal, redirect: 'follow', cache: 'no-store' },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { sheets?: { name: string }[] };
    if (!Array.isArray(data?.sheets)) return null;
    const names = data.sheets.map((s) => s.name);
    const target = normName(spec.name);
    const exact = names.find((n) => normName(n) === target);
    if (exact) return exact;
    const partial = names.filter((n) => {
      const nn = normName(n);
      return nn.includes(target) || target.includes(nn);
    });
    return partial.length === 1 ? partial[0] : null;
  } catch {
    return null;
  }
}

async function fetchSheet(
  label: string,
  spec: { id: string; name: string },
  retries = 2,
  signal?: AbortSignal,
  onProgress?: ProgressFn,
): Promise<RawSheet> {
  let sheetName = spec.name;
  let nameResolved = false;
  const buildUrl = () =>
    GAS_URL +
    `?action=getSheet&token=${TOKEN}` +
    `&sheetId=${encodeURIComponent(spec.id)}` +
    `&name=${encodeURIComponent(sheetName)}`;

  let lastError: unknown;
  let totalAttempts = retries + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    if (signal?.aborted) throw new Error('aborted');
    try {
      onProgress?.(
        attempt === 1 ? `${label} 불러오는 중...` : `${label} 재시도 (${attempt}/${totalAttempts})...`,
      );

      const timeoutCtl = new AbortController();
      const timer = setTimeout(() => timeoutCtl.abort(), 90_000);
      const onAbort = () => timeoutCtl.abort();
      signal?.addEventListener('abort', onAbort);

      try {
        const res = await fetch(buildUrl(), {
          method: 'GET',
          signal: timeoutCtl.signal,
          redirect: 'follow',
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const data = (await res.json()) as RawSheet & { error?: string };
        if (data?.error) throw new Error(`GAS error: ${data.error}`);
        if (!data || !data.values) throw new Error('Invalid response (values 누락)');
        return data;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      }
    } catch (e) {
      const err = e as Error & { name?: string };
      if (err?.name === 'AbortError' && signal?.aborted) throw new Error('aborted');
      lastError = e;
      if (!nameResolved && String(err?.message ?? '').includes('sheet not found')) {
        nameResolved = true;
        onProgress?.(`${label} 탭 이름 확인 중...`);
        const fixed = await resolveSheetName({ id: spec.id, name: sheetName }, signal);
        if (fixed && fixed !== sheetName) {
          sheetName = fixed;
          totalAttempts += 1;
        }
      }
      if (attempt < totalAttempts) {
        const wait = attempt === 1 ? 3000 : 6000;
        onProgress?.(`${label} ${wait / 1000}초 후 재시도...`);
        await sleep(wait);
      }
    }
  }
  throw new Error(`[${label}] ${(lastError as Error)?.message ?? 'fetch 실패'} (${totalAttempts}회 시도)`);
}

/** 체크아웃 시트 2개 순차 fetch */
export async function fetchCheckoutSheets(
  onProgress?: ProgressFn,
  signal?: AbortSignal,
): Promise<CheckoutSheets> {
  const checkout1 = await fetchSheet('예약 시트 1 (통합)', SHEETS.checkout1, 2, signal, onProgress);
  const checkout2 = await fetchSheet('예약 시트 2', SHEETS.checkout2, 2, signal, onProgress);
  return { checkout1, checkout2, fetchedAt: new Date() };
}

// ─── 캐시 (localStorage, Stale-While-Revalidate) ─────────────────
//   - 5분 이내 재접속: 캐시 즉시 표시 (fetch 안 함)
//   - 5분 초과: 캐시 즉시 표시 + 백그라운드 새로고침
//   - 새로고침 버튼: 강제 fetch

const CACHE_KEY = 'hm-checkout-cache-v1';
const CACHE_VERSION = 1;
const CACHE_TTL_MS = 5 * 60 * 1000;

export type CachedCheckout = {
  reservations: Reservation[];
  savedAt: number;
  isStale: boolean;
};

export function loadCache(): CachedCheckout | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version !== CACHE_VERSION) return null;
    if (!Array.isArray(parsed.reservations)) return null;
    return {
      reservations: parsed.reservations as Reservation[],
      savedAt: parsed.savedAt,
      isStale: Date.now() - parsed.savedAt > CACHE_TTL_MS,
    };
  } catch {
    return null;
  }
}

export function saveCache(reservations: Reservation[]): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ version: CACHE_VERSION, savedAt: Date.now(), reservations }),
    );
  } catch {
    /* QuotaExceeded 등 — 무시 */
  }
}
