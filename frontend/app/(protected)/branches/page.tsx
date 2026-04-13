'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBranches, useCreateBranch } from '@/hooks/useBranches';
import { useAppStore } from '@/stores/appStore';
import { canManageBranch } from '@/lib/auth';
import type { Branch } from '@/types';

// ================================================================
// Branch 생성 폼 (ADMIN 전용)
// ================================================================

function CreateBranchForm({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useCreateBranch();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    try {
      await mutateAsync({ name, code, address: address || undefined });
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '생성에 실패했습니다';
      setFormError(msg);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">신규 지점 등록</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              지점명 <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="서울 강남점"
              required
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              코드 <span className="text-red-500">*</span>
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SEOUL_GN"
              required
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">주소</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="서울 강남구 테헤란로 123"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {formError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
            {formError}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ================================================================
// 자식 지점 카드 (들여쓰기)
// ================================================================

function ChildBranchCard({ branch, onClick }: { branch: Branch; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-gray-100 rounded-lg px-4 py-3 bg-gray-50 hover:bg-blue-50 hover:border-blue-300 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-300">└</span>
          <span className="font-medium text-gray-800">{branch.name}</span>
          {!branch.isActive && (
            <span className="text-xs text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
              비활성
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {branch._count && (
            <span className="text-xs text-gray-400">
              위치 {branch._count.locations}개
            </span>
          )}
          <span className="text-xs text-blue-500">상세 →</span>
        </div>
      </div>
    </button>
  );
}

// ================================================================
// 부모 지점 (그룹 아코디언)
// ================================================================

function ParentBranchGroup({ branch, router }: { branch: Branch; router: ReturnType<typeof useRouter> }) {
  const [expanded, setExpanded] = useState(false);
  const children = branch.children ?? [];

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-4 hover:bg-gray-50 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
            <span className="font-semibold text-gray-900">{branch.name}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {children.length}개 지점
            </span>
          </div>
        </div>
      </button>

      {expanded && children.length > 0 && (
        <div className="px-4 pb-3 space-y-2 ml-4">
          {children.map((child) => (
            <ChildBranchCard
              key={child.id}
              branch={child}
              onClick={() => router.push(`/branches/${child.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ================================================================
// 독립 지점 카드 (자식 없음)
// ================================================================

function StandaloneBranchCard({ branch, onClick }: { branch: Branch; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left border border-gray-200 rounded-lg p-4 bg-white hover:border-blue-400 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="font-semibold text-gray-900">{branch.name}</span>
          {!branch.isActive && (
            <span className="ml-2 text-xs text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
              비활성
            </span>
          )}
        </div>
        <span className="text-xs text-blue-500">상세 →</span>
      </div>
      {branch.address && (
        <p className="text-xs text-gray-400 mt-1">{branch.address}</p>
      )}
      {branch._count && (
        <div className="flex gap-3 mt-2">
          <span className="text-xs text-gray-500">직원 {branch._count.users}명</span>
          <span className="text-xs text-gray-500">위치 {branch._count.locations}개</span>
        </div>
      )}
    </button>
  );
}

// ================================================================
// 페이지
// ================================================================

export default function BranchesPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [showForm, setShowForm] = useState(false);
  const [filterActive, setFilterActive] = useState<boolean | undefined>(true);

  const { data: branches, isLoading, error } = useBranches(filterActive);
  const canCreate = canManageBranch(user);

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">지점 관리</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {user?.role === 'ADMIN'
              ? '전체 지점'
              : user?.position === 'TEAM_LEADER' || user?.position === 'DEPUTY_LEADER'
              ? '전체 지점 (팀 리더)'
              : '소속 지점'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterActive === undefined ? 'all' : filterActive ? 'active' : 'inactive'}
            onChange={(e) => {
              const v = e.target.value;
              setFilterActive(v === 'all' ? undefined : v === 'active');
            }}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 text-gray-600 focus:outline-none"
          >
            <option value="all">전체</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
          {canCreate && (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + 지점 등록
            </button>
          )}
        </div>
      </div>

      {/* 등록 폼 */}
      {showForm && <div className="mb-4"><CreateBranchForm onClose={() => setShowForm(false)} /></div>}

      {/* 목록 */}
      {isLoading && <p className="text-sm text-gray-400 py-8 text-center">불러오는 중...</p>}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          오류가 발생했습니다. 다시 시도해 주세요.
        </p>
      )}
      {branches && branches.length === 0 && (
        <p className="text-sm text-gray-400 py-8 text-center">등록된 지점이 없습니다.</p>
      )}
      <div className="grid gap-3">
        {branches?.map((branch) => {
          const hasChildren = branch.children && branch.children.length > 0;

          if (hasChildren) {
            return (
              <ParentBranchGroup
                key={branch.id}
                branch={branch}
                router={router}
              />
            );
          }

          return (
            <StandaloneBranchCard
              key={branch.id}
              branch={branch}
              onClick={() => router.push(`/branches/${branch.id}`)}
            />
          );
        })}
      </div>
    </div>
  );
}
