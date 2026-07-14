'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchCheckoutSheets, loadCache, saveCache } from '@/lib/checkout/gas';
import { buildIndex, buildIndexFromReservations } from '@/lib/checkout/pipeline';
import type { CheckoutIndex } from '@/lib/checkout/pipeline';
import { CHECKOUT_BRANCHES, CHECKOUT_BRANCH_BY_KEY } from '@/lib/checkout/branches';
import { todayKst } from '@/lib/checkout/dateParser';
import type { Reservation, CheckoutBranchKey } from '@/lib/checkout/types';

type Mode = 'date' | 'room';

// ================================================================
// 페이지 — 객실 체크아웃 조회
// 데이터: 예약 관리 구글 시트 (5분 캐시 + 백그라운드 갱신)
// ================================================================

export default function CheckoutPage() {
  const [index, setIndex] = useState<CheckoutIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  async function refresh(force = false) {
    if (loading) return;
    setError('');

    // 캐시 우선 (Stale-While-Revalidate)
    if (!force) {
      const cached = loadCache();
      if (cached) {
        setIndex(buildIndexFromReservations(cached.reservations, new Date(cached.savedAt)));
        if (!cached.isStale) return; // 신선한 캐시 → fetch 생략
      }
    }

    setLoading(true);
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    try {
      const raw = await fetchCheckoutSheets(setProgress, ctl.signal);
      const idx = buildIndex(raw);
      saveCache(idx.reservations);
      setIndex(idx);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== 'aborted') setError(`시트 데이터를 불러오지 못했습니다: ${msg}`);
    } finally {
      setLoading(false);
      setProgress('');
    }
  }

  useEffect(() => {
    refresh();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [mode, setMode] = useState<Mode>('date');
  const [branchKey, setBranchKey] = useState('');
  const [room, setRoom] = useState('');

  function goToRoom(b: string, r: string) {
    setBranchKey(b);
    setRoom(r);
    setMode('room');
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900">객실 체크아웃</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            예약 시트 기준 체크아웃 일정 — 방문 가능 시점 확인
            {index && (
              <span className="ml-2">
                (기준: {index.fetchedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => refresh(true)}
          disabled={loading}
          className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {loading ? '불러오는 중...' : '새로고침'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-4">{error}</p>
      )}

      {/* 최초 로딩 */}
      {!index && loading && (
        <div className="bg-white border border-gray-200 rounded-lg py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600 font-medium">{progress || '시트 데이터 불러오는 중...'}</p>
          <p className="text-xs text-gray-400 mt-1">첫 로딩은 20~40초 정도 걸립니다</p>
        </div>
      )}

      {index && (
        <>
          {/* 백그라운드 갱신 표시 */}
          {loading && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded px-3 py-1.5 mb-3">
              {progress || '최신 데이터로 갱신 중...'} (기존 데이터는 계속 사용 가능)
            </p>
          )}

          {/* 모드 토글 */}
          <div className="flex gap-2 mb-4">
            {(
              [
                { key: 'date', label: '📅 날짜별' },
                { key: 'room', label: '🚪 호실별' },
              ] as { key: Mode; label: string }[]
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setMode(t.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === t.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {mode === 'date' ? (
            <DateMode index={index} onSelectRoom={goToRoom} />
          ) : (
            <RoomMode
              index={index}
              branchKey={branchKey}
              room={room}
              onBranchChange={(k) => {
                setBranchKey(k);
                setRoom('');
              }}
              onRoomChange={setRoom}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── 날짜별 모드 ───────────────────────────────
function DateMode({
  index,
  onSelectRoom,
}: {
  index: CheckoutIndex;
  onSelectRoom: (branchKey: string, room: string) => void;
}) {
  const [date, setDate] = useState(todayKst());
  const list = index.reservationsByCheckOut.get(date) ?? [];

  const main = list.filter((r) => r.cellKind === 'PRICE');
  const special = list.filter((r) => r.cellKind !== 'PRICE');

  const byBranch = useMemo(() => {
    const m = new Map<string, Reservation[]>();
    for (const r of main) {
      const arr = m.get(r.branchKey) ?? [];
      arr.push(r);
      m.set(r.branchKey, arr);
    }
    return m;
  }, [main]);

  return (
    <div>
      {/* 날짜 선택 */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setDate(todayKst())}
          className="px-4 py-2 text-sm bg-blue-50 text-blue-700 font-medium rounded-lg border border-blue-200 hover:bg-blue-100"
        >
          오늘
        </button>
      </div>

      {/* 요약 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-sm font-medium text-gray-900">
        📅 {formatDate(date)} — 체크아웃 <span className="text-blue-700 font-bold">{main.length}개</span>
        {special.length > 0 && (
          <>
            {' '}· 직접 확인 필요 <span className="text-amber-600 font-bold">{special.length}개</span>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-3">💡 객실 번호를 누르면 그 호실의 전체 체크아웃 일정이 보입니다.</p>

      {main.length === 0 && special.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg text-center py-12 text-sm text-gray-400">
          해당 날짜에 체크아웃 객실이 없습니다
        </div>
      )}

      {/* 지점별 그룹 */}
      {Array.from(byBranch.entries()).map(([bKey, rs]) => {
        const b = CHECKOUT_BRANCH_BY_KEY[bKey as CheckoutBranchKey];
        if (!b) return null;
        return (
          <div key={bKey} className="bg-white rounded-lg border border-gray-200 mb-3 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: b.color }} />
              {b.label}
              <span className="ml-auto bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs">{rs.length}</span>
            </div>
            <div className="p-2.5 flex flex-wrap gap-2">
              {rs.map((r, i) => (
                <RoomChip key={i} r={r} onClick={() => onSelectRoom(r.branchKey, r.roomNumber)} />
              ))}
            </div>
          </div>
        );
      })}

      {/* 특수 셀 */}
      {special.length > 0 && (
        <div className="bg-white rounded-lg border border-amber-300 overflow-hidden">
          <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 text-sm font-semibold text-amber-800">
            ⚠ 직접 확인 필요 (예약 셀 해석 불확실)
          </div>
          <div className="p-2.5 flex flex-wrap gap-2">
            {special.map((r, i) => (
              <button
                key={i}
                onClick={() => onSelectRoom(r.branchKey, r.roomNumber)}
                className="px-3 py-1 bg-white border border-amber-300 rounded-full text-sm hover:bg-amber-50"
              >
                <span className="font-semibold text-gray-900">{r.roomNumber}</span>
                <span className="ml-2 text-xs text-amber-700">[{r.cellRaw}]</span>
                <span className="ml-1 text-xs text-gray-400">
                  {CHECKOUT_BRANCH_BY_KEY[r.branchKey]?.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoomChip({ r, onClick }: { r: Reservation; onClick?: () => void }) {
  const needsCheck = r.resolved.confidence === 'low';
  return (
    <button
      onClick={onClick}
      title={r.rawMemo + (r.resolved.warnings.length ? '\n\n경고: ' + r.resolved.warnings.join(', ') : '')}
      className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
        needsCheck
          ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
          : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
      }`}
    >
      {r.roomNumber}
      {needsCheck && <span className="ml-1">⚠️</span>}
    </button>
  );
}

// ─── 호실별 모드 ───────────────────────────────
function RoomMode({
  index,
  branchKey,
  room,
  onBranchChange,
  onRoomChange,
}: {
  index: CheckoutIndex;
  branchKey: string;
  room: string;
  onBranchChange: (k: string) => void;
  onRoomChange: (r: string) => void;
}) {
  const roomsByBranch = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const r of index.reservations) {
      const set = m.get(r.branchKey) ?? new Set<string>();
      set.add(r.roomNumber);
      m.set(r.branchKey, set);
    }
    return m;
  }, [index]);

  const availableBranches = CHECKOUT_BRANCHES.filter((b) => b.hasCheckout && roomsByBranch.has(b.key));
  const rooms = branchKey ? Array.from(roomsByBranch.get(branchKey) ?? []).sort() : [];

  const allList =
    branchKey && room ? index.reservationsByRoom.get(branchKey + '|' + room) ?? [] : [];

  const today = todayKst();
  const past = allList.filter((r) => (r.resolved.checkOut ?? r.cellDate) < today);
  const futureOrToday = allList.filter((r) => (r.resolved.checkOut ?? r.cellDate) >= today);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">지점</label>
          <select
            value={branchKey}
            onChange={(e) => onBranchChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">지점을 선택하세요</option>
            {availableBranches.map((b) => (
              <option key={b.key} value={b.key}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">호실</label>
          <select
            value={room}
            onChange={(e) => onRoomChange(e.target.value)}
            disabled={!branchKey}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">호실을 선택하세요</option>
            {rooms.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {branchKey && room && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-sm font-medium text-gray-900">
            🚪 {CHECKOUT_BRANCH_BY_KEY[branchKey as CheckoutBranchKey]?.label} {room} — 전체{' '}
            <span className="text-blue-700 font-bold">{allList.length}건</span> · 향후{' '}
            <span className="text-green-700 font-bold">{futureOrToday.length}건</span>
          </div>

          {allList.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg text-center py-12 text-sm text-gray-400">
              체크아웃 일정이 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {futureOrToday.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-blue-700">
                    향후 일정 ({futureOrToday.length})
                  </div>
                  {futureOrToday.map((r, i) => (
                    <ReservationRow key={i} r={r} />
                  ))}
                </div>
              )}

              {past.length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden opacity-70">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
                    지난 기록 ({past.length})
                  </div>
                  {past.map((r, i) => (
                    <ReservationRow key={i} r={r} dim />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReservationRow({ r, dim = false }: { r: Reservation; dim?: boolean }) {
  const needsCheck = r.resolved.confidence === 'low';
  const co = r.resolved.checkOut;
  const ci = r.resolved.checkIn;
  return (
    <div
      title={r.rawMemo}
      className={`flex items-center flex-wrap px-3 py-2 border-b border-gray-50 last:border-0 text-sm ${
        needsCheck ? 'bg-amber-50 ' : ''
      }${dim ? 'text-gray-400' : 'text-gray-700'}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-3 shrink-0 ${dim ? 'bg-gray-300' : 'bg-green-500'}`} />
      <span className="font-semibold w-28 shrink-0 text-gray-900">{formatDate(ci)}</span>
      <span className="text-xs text-gray-400 mr-3">→ {co ? formatDate(co) : '?'}</span>
      {r.parsed.nights !== undefined && <span className="text-xs text-gray-400">{r.parsed.nights}박</span>}
      {r.parsed.name && <span className="text-xs text-gray-500 ml-3">{r.parsed.name}</span>}
      {needsCheck && <span className="ml-auto text-xs text-amber-700">⚠️ 직접 확인</span>}
    </div>
  );
}

function formatDate(s: string): string {
  const d = new Date(s + 'T00:00:00');
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`;
}
