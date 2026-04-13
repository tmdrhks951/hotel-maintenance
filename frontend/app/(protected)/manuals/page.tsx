'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useBranches } from '@/hooks/useBranches';
import {
  useManuals,
  useManual,
  useCreateManual,
  useUpdateManual,
  useDeleteManual,
} from '@/hooks/useManuals';
import { useEscKey } from '@/hooks/useEscKey';
import type { ManualListItem } from '@/types';

/** ADMIN 또는 팀장급이면 CRUD 가능 */
function canManage(role: string, position: string): boolean {
  if (role === 'ADMIN') return true;
  if ((role === 'QC' || role === 'OPERATIONS') &&
      (position === 'TEAM_LEADER' || position === 'DEPUTY_LEADER')) return true;
  return false;
}

// ================================================================
// 매뉴얼 상세 / 수정 패널
// ================================================================

function ManualDetailPanel({
  manualId,
  onClose,
}: {
  manualId: string;
  onClose: () => void;
}) {
  const { user } = useAppStore();
  const { data: manual, isLoading } = useManual(manualId);
  const updateMut = useUpdateManual();
  const deleteMut = useDeleteManual();
  const { data: branches = [] } = useBranches(true);

  useEscKey(onClose);

  const isManager = user ? canManage(user.role, user.position) : false;

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPublished, setEditPublished] = useState(false);
  const [editBranchId, setEditBranchId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function startEdit() {
    if (!manual) return;
    setEditTitle(manual.title);
    setEditContent(manual.content);
    setEditPublished(manual.isPublished);
    setEditBranchId(manual.branch?.id ?? '');
    setIsEditing(true);
    setError('');
  }

  async function handleSave() {
    setError('');
    try {
      await updateMut.mutateAsync({
        id: manualId,
        body: {
          title: editTitle,
          content: editContent,
          isPublished: editPublished,
          branchId: editBranchId || null,
        },
      });
      setIsEditing(false);
      setSuccess('수정되었습니다');
      setTimeout(() => setSuccess(''), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '수정 실패');
    }
  }

  async function handleDelete() {
    if (!confirm('이 매뉴얼을 삭제하시겠습니까?')) return;
    try {
      await deleteMut.mutateAsync(manualId);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '삭제 실패');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-full sm:max-w-lg bg-white shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
          <h3 className="text-sm font-semibold text-gray-900">매뉴얼 상세</h3>
          <div className="flex items-center gap-2">
            {isManager && manual && !isEditing && (
              <>
                <button onClick={startEdit} className="text-xs text-blue-600 hover:text-blue-800">수정</button>
                <button onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700">삭제</button>
              </>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
          </div>
        </div>

        {isLoading && (
          <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
        )}

        {manual && !isEditing && (
          <div className="p-5 space-y-4">
            {success && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{success}</div>
            )}
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1">{manual.title}</h2>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{manual.author.name}</span>
                <span>
                  {new Date(manual.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </span>
                {manual.branch && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{manual.branch.name}</span>}
                {!manual.isPublished && (
                  <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">비공개</span>
                )}
              </div>
            </div>
            <hr className="border-gray-100" />
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {manual.content}
            </div>
          </div>
        )}

        {/* 수정 폼 */}
        {manual && isEditing && (
          <div className="p-5 space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">제목</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">내용</label>
              <textarea
                rows={12}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">대상 지점 (선택)</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                value={editBranchId}
                onChange={(e) => setEditBranchId(e.target.value)}
              >
                <option value="">전체 (모든 지점)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editPublished}
                onChange={(e) => setEditPublished(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700">공개</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={updateMut.isPending}
                className="flex-1 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {updateMut.isPending ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// 매뉴얼 생성 모달
// ================================================================

function CreateManualModal({ onClose }: { onClose: () => void }) {
  const createMut = useCreateManual();
  const { data: branches = [] } = useBranches(true);

  useEscKey(onClose);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [branchId, setBranchId] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력해주세요');
      return;
    }
    setError('');
    try {
      await createMut.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        isPublished,
        branchId: branchId || undefined,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '생성 실패');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">새 매뉴얼 작성</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">제목 *</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="매뉴얼 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">내용 *</label>
            <textarea
              rows={10}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="매뉴얼 내용을 입력하세요"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">대상 지점 (선택)</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">전체 (모든 지점)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700">즉시 공개</span>
          </label>
          <button
            onClick={handleSubmit}
            disabled={createMut.isPending}
            className="w-full py-2.5 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createMut.isPending ? '등록 중...' : '매뉴얼 등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// 매뉴얼 목록 카드
// ================================================================

function ManualCard({
  item,
  selected,
  onClick,
}: {
  item: ManualListItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-colors ${
        selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 line-clamp-1 flex-1">{item.title}</p>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!item.isPublished && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">비공개</span>
          )}
          {item.branch && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{item.branch.name}</span>
          )}
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
        <span>{item.author.name}</span>
        <span>
          {new Date(item.updatedAt).toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'numeric', day: 'numeric',
          })}
        </span>
      </div>
    </button>
  );
}

// ================================================================
// 매뉴얼 목록 페이지 (메인)
// ================================================================

export default function ManualsPage() {
  const { user } = useAppStore();
  const { data: manuals = [], isLoading, error, refetch } = useManuals();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  if (!user) {
    return <div className="text-center py-20 text-sm text-gray-400">로그인이 필요합니다</div>;
  }

  const isManager = canManage(user.role, user.position);

  return (
    <div className="max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">운영 매뉴얼</h1>
          <p className="text-xs text-gray-400 mt-0.5">{manuals.length}건</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded px-2 py-1"
          >
            새로고침
          </button>
          {isManager && (
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700"
            >
              + 새 매뉴얼
            </button>
          )}
        </div>
      </div>

      {/* 로딩 / 에러 */}
      {isLoading && <div className="text-center py-20 text-sm text-gray-400">로딩 중...</div>}
      {error && (
        <div className="text-center py-10 text-sm text-red-500">
          데이터를 불러오지 못했습니다
        </div>
      )}

      {/* 목록 */}
      {!isLoading && manuals.length === 0 && (
        <div className="text-center py-20 text-sm text-gray-400">매뉴얼이 없습니다</div>
      )}
      {manuals.length > 0 && (
        <div className="space-y-2">
          {manuals.map((m) => (
            <ManualCard
              key={m.id}
              item={m}
              selected={selectedId === m.id}
              onClick={() => setSelectedId(m.id)}
            />
          ))}
        </div>
      )}

      {/* 상세 패널 */}
      {selectedId && (
        <ManualDetailPanel
          manualId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* 생성 모달 */}
      {showCreate && (
        <CreateManualModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
