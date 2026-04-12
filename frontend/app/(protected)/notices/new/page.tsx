'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBranches } from '@/hooks/useBranches';
import { useCreateNotice } from '@/hooks/useNotices';

export default function NewNoticePage() {
  const router = useRouter();
  const { data: branches } = useBranches(true);
  const createMut = useCreateNotice();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [branchId, setBranchId] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 입력하세요');
      return;
    }
    setError('');
    try {
      await createMut.mutateAsync({
        title,
        content,
        branchId: branchId || null,
        isPublished,
      });
      router.push('/notices');
    } catch {
      setError('공지 생성에 실패했습니다');
    }
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

      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">공지 작성</h1>
        <p className="text-xs text-gray-400 mt-0.5">새로운 공지사항을 작성합니다</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-4">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">제목 *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공지 제목을 입력하세요"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">내용 *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder="공지 내용을 입력하세요"
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

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.push('/notices')}
            className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={createMut.isPending}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {createMut.isPending ? '저장 중...' : '게시'}
          </button>
        </div>
      </form>
    </div>
  );
}
