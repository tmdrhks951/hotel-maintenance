'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  useRecurringSchedules,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
  useGenerateSchedules,
} from '@/hooks/useRecurringSchedules';
import { useBranches } from '@/hooks/useBranches';
import { useLocations } from '@/hooks/useLocations';
import { useEscKey } from '@/hooks/useEscKey';
import { useAppStore } from '@/stores/appStore';
import type {
  RecurringSchedule,
  RequestCategory,
  RecurrenceType,
  CreateScheduleBody,
} from '@/types';
import {
  REQUEST_CATEGORY_LABEL,
  RECURRENCE_LABEL,
  DAY_OF_WEEK_LABEL,
} from '@/types';

// ================================================================
// 주기 표시 헬퍼
// ================================================================

function recurrenceText(s: RecurringSchedule): string {
  if (s.recurrence === 'DAILY') return '매일';
  if (s.recurrence === 'WEEKLY' && s.recurrenceDay !== null)
    return `매주 ${DAY_OF_WEEK_LABEL[s.recurrenceDay]}요일`;
  if (s.recurrence === 'MONTHLY' && s.recurrenceDay !== null)
    return `매월 ${s.recurrenceDay}일`;
  return RECURRENCE_LABEL[s.recurrence];
}

// ================================================================
// 스케줄 폼 패널
// ================================================================

interface FormPanelProps {
  editing: RecurringSchedule | null;
  onClose: () => void;
}

function ScheduleFormPanel({ editing, onClose }: FormPanelProps) {
  const { user } = useAppStore();
  const { data: branches = [] } = useBranches(true);

  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [category, setCategory] = useState<RequestCategory>(editing?.category ?? 'OTHER');
  const [recurrence, setRecurrence] = useState<RecurrenceType>(editing?.recurrence ?? 'WEEKLY');
  const [recurrenceDay, setRecurrenceDay] = useState<number>(editing?.recurrenceDay ?? 1);
  const [recurrenceTime, setRecurrenceTime] = useState(editing?.recurrenceTime ?? '09:00');
  const [branchId, setBranchId] = useState(editing?.branchId ?? user?.branchId ?? '');
  const [locationId, setLocationId] = useState(editing?.locationId ?? '');

  const { data: locations = [] } = useLocations(branchId);
  const createMut = useCreateSchedule();
  const updateMut = useUpdateSchedule();

  useEscKey(onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: CreateScheduleBody = {
      title,
      description: description || undefined,
      category,
      recurrence,
      recurrenceDay: recurrence === 'DAILY' ? undefined : recurrenceDay,
      recurrenceTime,
      branchId,
      locationId: locationId || undefined,
    };

    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, body });
    } else {
      await createMut.mutateAsync(body);
    }
    onClose();
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <h2 className="text-lg font-bold mb-4">{editing ? '예약 일정 수정' : '예약 일정 등록'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="예: 소방 설비 월간 점검"
              />
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
              <textarea
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="점검 내용 상세"
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as RequestCategory)}
              >
                {Object.entries(REQUEST_CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* 지점 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">지점 *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={branchId}
                onChange={(e) => { setBranchId(e.target.value); setLocationId(''); }}
                required
              >
                <option value="">선택</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* 위치 */}
            {branchId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">위치 (선택)</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                >
                  <option value="">전체 (미지정)</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 반복 주기 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">반복 주기 *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
              >
                {Object.entries(RECURRENCE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* 요일 (WEEKLY) */}
            {recurrence === 'WEEKLY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">요일</label>
                <div className="flex gap-1">
                  {DAY_OF_WEEK_LABEL.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRecurrenceDay(i)}
                      className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                        recurrenceDay === i
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 일자 (MONTHLY) */}
            {recurrence === 'MONTHLY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">매월 일자</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={recurrenceDay}
                  onChange={(e) => setRecurrenceDay(Number(e.target.value))}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}일</option>
                  ))}
                </select>
              </div>
            )}

            {/* 시간 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">생성 시각</label>
              <input
                type="time"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={recurrenceTime}
                onChange={(e) => setRecurrenceTime(e.target.value)}
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isPending || !title || !branchId}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? '저장 중...' : editing ? '수정' : '등록'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// 스케줄 테이블
// ================================================================

function ScheduleTable({
  schedules,
  canModify,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  schedules: RecurringSchedule[];
  canModify: boolean;
  onEdit: (s: RecurringSchedule) => void;
  onDelete: (id: string) => void;
  onToggleActive: (s: RecurringSchedule) => void;
}) {
  if (schedules.length === 0) {
    return <p className="text-sm text-gray-400 py-6 text-center">등록된 예약 일정이 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2 px-2 font-medium">상태</th>
            <th className="py-2 px-2 font-medium">제목</th>
            <th className="py-2 px-2 font-medium">카테고리</th>
            <th className="py-2 px-2 font-medium">지점</th>
            <th className="py-2 px-2 font-medium">위치</th>
            <th className="py-2 px-2 font-medium">주기</th>
            <th className="py-2 px-2 font-medium">시각</th>
            <th className="py-2 px-2 font-medium">마지막 생성</th>
            {canModify && <th className="py-2 px-2 font-medium"></th>}
          </tr>
        </thead>
        <tbody>
          {schedules.map((s) => (
            <tr
              key={s.id}
              className={`border-b border-gray-100 hover:bg-gray-50 ${!s.isActive ? 'opacity-50' : ''}`}
            >
              <td className="py-2.5 px-2">
                {canModify ? (
                  <button
                    onClick={() => onToggleActive(s)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {s.isActive ? '활성' : '비활성'}
                  </button>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {s.isActive ? '활성' : '비활성'}
                  </span>
                )}
              </td>
              <td className="py-2.5 px-2 font-medium text-gray-900">{s.title}</td>
              <td className="py-2.5 px-2 text-gray-600">{REQUEST_CATEGORY_LABEL[s.category]}</td>
              <td className="py-2.5 px-2 text-gray-600">{s.branch.name}</td>
              <td className="py-2.5 px-2 text-gray-500">{s.location?.name ?? '-'}</td>
              <td className="py-2.5 px-2 text-gray-600">{recurrenceText(s)}</td>
              <td className="py-2.5 px-2 text-gray-500">{s.recurrenceTime}</td>
              <td className="py-2.5 px-2 text-gray-400 text-xs">
                {s.lastGeneratedAt
                  ? new Date(s.lastGeneratedAt).toLocaleDateString('ko-KR')
                  : '-'}
              </td>
              {canModify && (
                <td className="py-2.5 px-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(s)}
                      className="text-xs text-blue-600 hover:text-blue-800 px-1"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => onDelete(s.id)}
                      className="text-xs text-red-500 hover:text-red-700 px-1"
                    >
                      삭제
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ================================================================
// 메인 페이지
// ================================================================

export default function RecurringSchedulesPage() {
  const { user } = useAppStore();
  const [filterBranch, setFilterBranch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecurringSchedule | null>(null);

  const { data: schedules = [], isLoading } = useRecurringSchedules(filterBranch || undefined);
  const { data: branches = [] } = useBranches(true);
  const deleteMut = useDeleteSchedule();
  const updateMut = useUpdateSchedule();
  const generateMut = useGenerateSchedules();

  const isAdmin = user?.role === 'ADMIN';
  const isTeamLeader = user?.position === 'TEAM_LEADER' || user?.position === 'DEPUTY_LEADER';
  // 등록: QC/OPERATIONS 전원 가능
  const canCreate = user?.role === 'QC' || user?.role === 'OPERATIONS';
  // 수정/삭제: QC/OPERATIONS 팀장급만
  const canModify = canCreate && isTeamLeader;

  // 내 지점이 먼저 오도록 정렬
  const sortedSchedules = useMemo(() => {
    if (!user?.branchId) return schedules;
    return [...schedules].sort((a, b) => {
      const aIsMine = a.branchId === user.branchId ? 0 : 1;
      const bIsMine = b.branchId === user.branchId ? 0 : 1;
      return aIsMine - bIsMine;
    });
  }, [schedules, user?.branchId]);

  // QC/OPERATIONS 별로 분리 — 내 지점 vs 타 지점
  const myBranchSchedules = useMemo(
    () => user?.branchId ? sortedSchedules.filter((s) => s.branchId === user.branchId) : [],
    [sortedSchedules, user?.branchId],
  );
  const otherBranchSchedules = useMemo(
    () => user?.branchId ? sortedSchedules.filter((s) => s.branchId !== user.branchId) : sortedSchedules,
    [sortedSchedules, user?.branchId],
  );

  const handleEdit = useCallback((s: RecurringSchedule) => {
    setEditing(s);
    setShowForm(true);
  }, []);

  const handleToggleActive = useCallback(async (s: RecurringSchedule) => {
    await updateMut.mutateAsync({ id: s.id, body: { isActive: !s.isActive } });
  }, [updateMut]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('이 예약 일정을 삭제하시겠습니까?')) return;
    await deleteMut.mutateAsync(id);
  }, [deleteMut]);

  const handleGenerate = useCallback(async () => {
    const result = await generateMut.mutateAsync();
    alert(`${result.checkedCount}개 스케줄 확인, ${result.createdCount}개 요청 생성됨`);
  }, [generateMut]);

  // 역할 표시
  const roleLabel = user?.role === 'QC' ? 'QC' : user?.role === 'OPERATIONS' ? '운영팀' : '관리자';

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">예약 일정</h1>
          <p className="text-xs text-gray-400 mt-0.5">{roleLabel} 뷰</p>
        </div>
        <div className="flex gap-2">
          {canModify && (
            <button
              onClick={handleGenerate}
              disabled={generateMut.isPending}
              className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 disabled:opacity-50"
            >
              {generateMut.isPending ? '생성 중...' : '수동 생성 실행'}
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              + 일정 등록
            </button>
          )}
        </div>
      </div>

      {/* 필터 — ADMIN 또는 팀장급 */}
      {(isAdmin || isTeamLeader) && (
        <div className="flex gap-2">
          <select
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
          >
            <option value="">전체 지점</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* 로딩 */}
      {isLoading && (
        <p className="text-sm text-gray-400 py-8 text-center">로딩 중...</p>
      )}

      {/* ADMIN: 전체 목록 (조회만) */}
      {!isLoading && isAdmin && (
        <ScheduleTable
          schedules={sortedSchedules}
          canModify={false}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      )}

      {/* QC/OPERATIONS: 내 지점 + 타 지점 분리 */}
      {!isLoading && !isAdmin && (
        <div className="space-y-6">
          {/* 내 지점 */}
          {user?.branchId && (
            <section>
              <h2 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                내 지점
                <span className="text-xs text-gray-400 font-normal">
                  {branches.find((b) => b.id === user.branchId)?.name}
                </span>
              </h2>
              <ScheduleTable
                schedules={myBranchSchedules}
                canModify={canModify}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
              />
            </section>
          )}

          {/* 타 지점 (팀장급만 볼 수 있음) */}
          {isTeamLeader && otherBranchSchedules.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 mb-2">타 지점</h2>
              <ScheduleTable
                schedules={otherBranchSchedules}
                canModify={false}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
              />
            </section>
          )}
        </div>
      )}

      {/* 폼 패널 */}
      {showForm && (
        <ScheduleFormPanel
          editing={editing}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
