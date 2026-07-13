'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/authStore';
import { useBranches } from '@/hooks/useBranches';
import { useLocations } from '@/hooks/useLocations';
import {
  useSchedules,
  useCreateSchedule,
  useUpdateSchedule_,
  useDeleteSchedule,
  useGenerateSchedules,
} from '@/hooks/useRecurringSchedules';
import type {
  RecurringSchedule,
  CreateScheduleBody,
  UpdateScheduleBody,
  RecurrenceType,
  RequestCategory,
  Position,
} from '@/types';
import {
  RECURRENCE_LABEL,
  DAY_OF_WEEK_LABEL,
  REQUEST_CATEGORY_LABEL,
} from '@/types';

const CATEGORIES: RequestCategory[] = [
  'SILICONE', 'WALLPAPER', 'PAINTING', 'FURNITURE', 'LIGHTING', 'PLUMBING',
  'DOOR', 'APPLIANCE', 'HVAC', 'ELECTRICAL', 'SAFETY', 'OTHER',
];
const RECURRENCE_TYPES: RecurrenceType[] = ['DAILY', 'WEEKLY', 'MONTHLY'];
const LEADER_POSITIONS: Position[] = ['TEAM_LEADER', 'DEPUTY_LEADER'];

function formatRecurrence(s: RecurringSchedule): string {
  const time = s.recurrenceTime?.slice(0, 5) ?? '';
  if (s.recurrence === 'DAILY') return `${RECURRENCE_LABEL.DAILY} ${time}`;
  if (s.recurrence === 'WEEKLY' && s.recurrenceDay != null) {
    return `${RECURRENCE_LABEL.WEEKLY} ${DAY_OF_WEEK_LABEL[s.recurrenceDay]}요일 ${time}`;
  }
  if (s.recurrence === 'MONTHLY' && s.recurrenceDay != null) {
    return `${RECURRENCE_LABEL.MONTHLY} ${s.recurrenceDay}일 ${time}`;
  }
  return `${RECURRENCE_LABEL[s.recurrence]} ${time}`;
}

// ================================================================
// Page
// ================================================================

export default function SchedulesPage() {
  const user = useAuthStore((s) => s.user);
  // 수정/삭제/수동생성: 팀장급 이상 (백엔드 teamLeaderOnly와 일치)
  const canEdit =
    user?.role === 'ADMIN' ||
    (!!user?.position && LEADER_POSITIONS.includes(user.position));
  // 등록: QC·운영팀 전원 가능 (백엔드 POST /recurring-schedules와 일치)
  const canCreate =
    canEdit || user?.role === 'QC' || user?.role === 'OPERATIONS';

  const { data: schedules, isLoading } = useSchedules();
  const deleteMut = useDeleteSchedule();
  const generateMut = useGenerateSchedules();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<RecurringSchedule | null>(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  async function handleGenerate() {
    setError('');
    try {
      const result = await generateMut.mutateAsync();
      setToast(`${result.generated}건의 요청이 생성되었습니다`);
      setTimeout(() => setToast(''), 3000);
    } catch {
      setError('수동 생성에 실패했습니다');
    }
  }

  async function handleDelete(s: RecurringSchedule) {
    if (!confirm(`"${s.title}" 스케줄을 삭제하시겠습니까?`)) return;
    try {
      await deleteMut.mutateAsync(s.id);
    } catch {
      setError('삭제에 실패했습니다');
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">정기점검 스케줄</h1>
          <p className="text-xs text-gray-400 mt-0.5">반복 점검 일정 관리</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={handleGenerate}
              disabled={generateMut.isPending}
              className="text-sm border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {generateMut.isPending ? '생성 중...' : '수동 생성'}
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => { setShowForm(true); setEditTarget(null); setError(''); }}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              새 스케줄
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-4">{error}</p>}
      {toast && <p className="text-sm text-green-700 bg-green-50 rounded px-3 py-2 mb-4">{toast}</p>}

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-sm text-gray-400">불러오는 중...</div>
      ) : !schedules?.length ? (
        <div className="text-center py-16 text-sm text-gray-400">등록된 스케줄이 없습니다</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="pb-2 pr-4 font-medium">제목</th>
                <th className="pb-2 pr-4 font-medium">카테고리</th>
                <th className="pb-2 pr-4 font-medium">반복주기</th>
                <th className="pb-2 pr-4 font-medium">지점</th>
                <th className="pb-2 pr-4 font-medium">활성</th>
                <th className="pb-2 pr-4 font-medium">최종생성일</th>
                {canEdit && <th className="pb-2 font-medium">액션</th>}
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 pr-4 text-gray-900 font-medium">{s.title}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{REQUEST_CATEGORY_LABEL[s.category]}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{formatRecurrence(s)}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{s.branch?.name ?? '-'}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {s.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {s.lastGeneratedAt
                      ? new Date(s.lastGeneratedAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                  {canEdit && (
                    <td className="py-2.5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditTarget(s); setShowForm(true); setError(''); }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          className="text-xs text-red-500 hover:text-red-700"
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
      )}

      {/* Create Modal */}
      <ScheduleFormModal
        open={showForm && !editTarget}
        onClose={() => setShowForm(false)}
        onError={setError}
      />

      {/* Edit Modal */}
      {editTarget && (
        <ScheduleFormModal
          open={showForm && !!editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          schedule={editTarget}
          onError={setError}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Schedule Form Modal (create & edit)
// ----------------------------------------------------------------

function ScheduleFormModal({
  open,
  onClose,
  schedule,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  schedule?: RecurringSchedule;
  onError: (msg: string) => void;
}) {
  const createMut = useCreateSchedule();
  const updateMut = useUpdateSchedule_();
  const { data: branches } = useBranches(true);

  const isEdit = !!schedule;

  const [title, setTitle] = useState(schedule?.title ?? '');
  const [description, setDescription] = useState(schedule?.description ?? '');
  const [category, setCategory] = useState<RequestCategory>(schedule?.category ?? 'PLUMBING');
  const [recurrence, setRecurrence] = useState<RecurrenceType>(schedule?.recurrence ?? 'DAILY');
  const [recurrenceDay, setRecurrenceDay] = useState<number>(schedule?.recurrenceDay ?? 1);
  const [recurrenceTime, setRecurrenceTime] = useState(schedule?.recurrenceTime?.slice(0, 5) ?? '09:00');
  const [branchId, setBranchId] = useState(schedule?.branchId ?? '');
  const [locationId, setLocationId] = useState(schedule?.locationId ?? '');
  const [isActive, setIsActive] = useState(schedule?.isActive ?? true);

  const { data: locations } = useLocations(branchId || null);

  const [err, setErr] = useState('');
  const isPending = createMut.isPending || updateMut.isPending;

  function reset() {
    setTitle('');
    setDescription('');
    setCategory('PLUMBING');
    setRecurrence('DAILY');
    setRecurrenceDay(1);
    setRecurrenceTime('09:00');
    setBranchId('');
    setLocationId('');
    setIsActive(true);
    setErr('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !branchId) {
      setErr('제목과 지점을 입력하세요');
      return;
    }
    setErr('');

    try {
      if (isEdit && schedule) {
        const body: UpdateScheduleBody & { id: string } = {
          id: schedule.id,
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          recurrence,
          recurrenceDay: recurrence !== 'DAILY' ? recurrenceDay : undefined,
          recurrenceTime,
          branchId,
          locationId: locationId || undefined,
          isActive,
        };
        await updateMut.mutateAsync(body);
      } else {
        const body: CreateScheduleBody = {
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          recurrence,
          recurrenceDay: recurrence !== 'DAILY' ? recurrenceDay : undefined,
          recurrenceTime,
          branchId,
          locationId: locationId || undefined,
        };
        await createMut.mutateAsync(body);
      }
      reset();
      onClose();
    } catch {
      onError(isEdit ? '스케줄 수정에 실패했습니다' : '스케줄 생성에 실패했습니다');
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title={isEdit ? '스케줄 수정' : '새 스케줄'} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {err && <p className="text-sm text-red-600">{err}</p>}

        <Field label="제목 *">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="점검 제목"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        <Field label="설명">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="점검 내용 상세 (선택)"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="카테고리">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RequestCategory)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{REQUEST_CATEGORY_LABEL[c]}</option>
              ))}
            </select>
          </Field>

          <Field label="반복 유형">
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {RECURRENCE_TYPES.map((r) => (
                <option key={r} value={r}>{RECURRENCE_LABEL[r]}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {recurrence === 'WEEKLY' && (
            <Field label="요일">
              <select
                value={recurrenceDay}
                onChange={(e) => setRecurrenceDay(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DAY_OF_WEEK_LABEL.map((d, i) => (
                  <option key={i} value={i}>{d}요일</option>
                ))}
              </select>
            </Field>
          )}

          {recurrence === 'MONTHLY' && (
            <Field label="일자">
              <select
                value={recurrenceDay}
                onChange={(e) => setRecurrenceDay(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}일</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="시간">
            <input
              type="time"
              value={recurrenceTime}
              onChange={(e) => setRecurrenceTime(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="지점 *">
            <select
              value={branchId}
              onChange={(e) => { setBranchId(e.target.value); setLocationId(''); }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">선택</option>
              {(branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>

          <Field label="위치">
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              disabled={!branchId}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">미지정</option>
              {(locations ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Active toggle (edit only) */}
        {isEdit && (
          <Field label="상태">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">활성</span>
            </label>
          </Field>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? '저장 중...' : isEdit ? '저장' : '생성'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ----------------------------------------------------------------
// Field wrapper
// ----------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
