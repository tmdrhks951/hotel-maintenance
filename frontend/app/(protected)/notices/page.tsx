'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useAuthStore } from '@/stores/authStore';
import { useBranches } from '@/hooks/useBranches';
import {
  useNotices,
  useCreateNotice,
  useUpdateNotice,
  useDeleteNotice,
} from '@/hooks/useNotices';
import type { Notice, CreateNoticeBody, UpdateNoticeBody } from '@/hooks/useNotices';
import type { Position } from '@/types';

const LEADER_POSITIONS: Position[] = ['TEAM_LEADER', 'DEPUTY_LEADER'];

// ================================================================
// Page
// ================================================================

export default function NoticesPage() {
  const user = useAuthStore((s) => s.user);
  const canWrite =
    user?.role === 'ADMIN' ||
    (!!user?.position && LEADER_POSITIONS.includes(user.position));

  const { data: notices, isLoading } = useNotices();
  const deleteMut = useDeleteNotice();

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Notice | null>(null);
  const [viewTarget, setViewTarget] = useState<Notice | null>(null);
  const [error, setError] = useState('');

  async function handleDelete(n: Notice) {
    if (!confirm(`"${n.title}" 공지를 삭제하시겠습니까?`)) return;
    try {
      await deleteMut.mutateAsync(n.id);
      setViewTarget(null);
    } catch {
      setError('삭제에 실패했습니다');
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">공지사항</h1>
          <p className="text-xs text-gray-400 mt-0.5">전사 공지 및 지점별 안내</p>
        </div>
        {canWrite && (
          <button
            onClick={() => { setShowForm(true); setEditTarget(null); setError(''); }}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            새 공지
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-4">{error}</p>}

      {/* Notice list */}
      {isLoading ? (
        <div className="text-center py-16 text-sm text-gray-400">불러오는 중...</div>
      ) : !notices?.length ? (
        <div className="text-center py-16 text-sm text-gray-400">등록된 공지가 없습니다</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="pb-2 pr-4 font-medium">제목</th>
                <th className="pb-2 pr-4 font-medium">작성자</th>
                <th className="pb-2 pr-4 font-medium">지점</th>
                <th className="pb-2 pr-4 font-medium">상태</th>
                <th className="pb-2 pr-4 font-medium">작성일</th>
                {canWrite && <th className="pb-2 font-medium">관리</th>}
              </tr>
            </thead>
            <tbody>
              {notices.map((n) => (
                <tr
                  key={n.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setViewTarget(n)}
                >
                  <td className="py-2.5 pr-4 text-gray-900 font-medium">{n.title}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{n.author.name}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{n.branch?.name ?? '전체'}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      n.isPublished
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {n.isPublished ? '게시' : '비공개'}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-gray-500">
                    {new Date(n.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  {canWrite && (
                    <td className="py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditTarget(n); setShowForm(true); setError(''); }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(n)}
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

      {/* View Modal (click to expand) */}
      {viewTarget && (
        <Modal
          open={!!viewTarget}
          onClose={() => setViewTarget(null)}
          title={viewTarget.title}
          wide
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
              <span>{viewTarget.author.name}</span>
              <span>{viewTarget.branch?.name ?? '전체'}</span>
              <span>{new Date(viewTarget.createdAt).toLocaleDateString('ko-KR')}</span>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                viewTarget.isPublished
                  ? 'bg-green-50 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {viewTarget.isPublished ? '게시' : '비공개'}
              </span>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {viewTarget.content}
              </p>
            </div>
            {canWrite && (
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    setViewTarget(null);
                    setEditTarget(viewTarget);
                    setShowForm(true);
                    setError('');
                  }}
                  className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(viewTarget)}
                  className="text-sm px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Create Modal */}
      <NoticeFormModal
        open={showForm && !editTarget}
        onClose={() => setShowForm(false)}
        onError={setError}
      />

      {/* Edit Modal */}
      {editTarget && (
        <NoticeFormModal
          open={showForm && !!editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          notice={editTarget}
          onError={setError}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Notice Form Modal (create & edit)
// ----------------------------------------------------------------

function NoticeFormModal({
  open,
  onClose,
  notice,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  notice?: Notice;
  onError: (msg: string) => void;
}) {
  const createMut = useCreateNotice();
  const updateMut = useUpdateNotice();
  const { data: branches } = useBranches(true);

  const isEdit = !!notice;

  const [title, setTitle] = useState(notice?.title ?? '');
  const [content, setContent] = useState(notice?.content ?? '');
  const [branchId, setBranchId] = useState(notice?.branchId ?? '');
  const [isPublished, setIsPublished] = useState(notice?.isPublished ?? true);

  const [err, setErr] = useState('');
  const isPending = createMut.isPending || updateMut.isPending;

  function reset() {
    setTitle('');
    setContent('');
    setBranchId('');
    setIsPublished(true);
    setErr('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setErr('제목을 입력하세요'); return; }
    if (!content.trim()) { setErr('내용을 입력하세요'); return; }
    setErr('');

    try {
      if (isEdit && notice) {
        const body: UpdateNoticeBody & { id: string } = {
          id: notice.id,
          title: title.trim(),
          content: content.trim(),
          branchId: branchId || null,
          isPublished,
        };
        await updateMut.mutateAsync(body);
      } else {
        const body: CreateNoticeBody = {
          title: title.trim(),
          content: content.trim(),
          branchId: branchId || undefined,
          isPublished,
        };
        await createMut.mutateAsync(body);
      }
      reset();
      onClose();
    } catch {
      onError(isEdit ? '공지 수정에 실패했습니다' : '공지 작성에 실패했습니다');
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title={isEdit ? '공지 수정' : '새 공지'} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {err && <p className="text-sm text-red-600">{err}</p>}

        <Field label="제목 *">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공지 제목"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        <Field label="내용 *">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="공지 내용을 입력하세요"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="지점 (미선택 시 전체공지)">
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 공지</option>
              {(branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>

          <Field label="게시 여부">
            <label className="flex items-center gap-2 cursor-pointer mt-1.5">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">게시</span>
            </label>
          </Field>
        </div>

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
            {isPending ? '저장 중...' : isEdit ? '저장' : '작성'}
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
