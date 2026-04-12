'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useBranches } from '@/hooks/useBranches';
import { useNotice, useUpdateNotice, useDeleteNotice } from '@/hooks/useNotices';
import type { Position } from '@/types';

const LEADER_POSITIONS: Position[] = ['TEAM_LEADER', 'DEPUTY_LEADER'];

export default function NoticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);

  const { data: notice, isLoading } = useNotice(id);
  const updateMut = useUpdateNotice();
  const deleteMut = useDeleteNotice();
  const { data: branches } = useBranches(true);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [branchId, setBranchId] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [error, setError] = useState('');

  const isAuthor = user?.id === notice?.author.id;
  const isAdmin = user?.role === 'ADMIN';
  const canEdit = isAuthor || isAdmin;

  function startEdit() {
    if (!notice) return;
    setTitle(notice.title);
    setContent(notice.content);
    setBranchId(notice.branchId ?? '');
    setIsPublished(notice.isPublished);
    setEditing(true);
    setError('');
  }

  async function handleSave() {
    if (!title.trim()) { setError('제목을 입력하세요'); return; }
    setError('');
    try {
      await updateMut.mutateAsync({
        id,
        title,
        content,
        branchId: branchId || null,
        isPublished,
      });
      setEditing(false);
    } catch {
      setError('수정에 실패했습니다');
    }
  }

  async function handleDelete() {
    if (!confirm('이 공지를 삭제하시겠습니까?')) return;
    try {
      await deleteMut.mutateAsync(id);
      router.push('/notices');
    } catch {
      setError('삭제에 실패했습니다');
    }
  }

  if (isLoading) {
    return <div className="text-center py-16 text-sm text-gray-400">불러오는 중...</div>;
  }

  if (!notice) {
    return <div className="text-center py-16 text-sm text-gray-400">공지를 찾을 수 없습니다</div>;
  }

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => router.push('/notices')}
        className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block"
      >
        &larr; 공지사항 목록
      </button>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-4">{error}</p>
      )}

      {editing ? (
        /* Edit Mode */
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">대상 지점</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">전체</option>
                {(branches ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">게시 여부</label>
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">게시</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setEditing(false)}
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={updateMut.isPending}
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {updateMut.isPending ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        /* View Mode */
        <div className="bg-white border border-gray-200 rounded-lg">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-lg font-bold text-gray-900">{notice.title}</h1>
                  {notice.isPublished ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      게시
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      비공개
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                  <span>작성자: {notice.author.name}</span>
                  <span>대상: {notice.branch?.name ?? '전체'}</span>
                  <span>{new Date(notice.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={startEdit}
                    className="text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50"
                  >
                    수정
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteMut.isPending}
                    className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {notice.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
