'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useBranches, useCreateBranch, useUpdateBranch } from '@/hooks/useBranches';
import type { Branch } from '@/types';

export default function AdminBranchesPage() {
  const { data: branches, isLoading } = useBranches();
  const createMut = useCreateBranch();
  const updateMut = useUpdateBranch();

  const [showCreate, setShowCreate] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [error, setError] = useState('');

  // Build flat rows: top-level branches first, then children indented underneath
  const rows: { branch: Branch; isChild: boolean }[] = [];
  const topLevel = (branches ?? []).filter((b) => !b.parentId);
  for (const parent of topLevel) {
    rows.push({ branch: parent, isChild: false });
    if (parent.children && parent.children.length > 0) {
      for (const child of parent.children) {
        rows.push({ branch: child, isChild: true });
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">지점 관리</h1>
          <p className="text-xs text-gray-400 mt-0.5">지점 및 하위 조직 관리</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setError(''); }}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          지점 추가
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-4">{error}</p>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-2 text-sm text-gray-400">불러오는 중...</span>
        </div>
      ) : !rows.length ? (
        <div className="text-center py-16 text-sm text-gray-400">등록된 지점이 없습니다</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="pb-2 pr-4 font-medium">지점명</th>
                <th className="pb-2 pr-4 font-medium">코드</th>
                <th className="pb-2 pr-4 font-medium">주소</th>
                <th className="pb-2 pr-4 font-medium">사용자수</th>
                <th className="pb-2 pr-4 font-medium">위치수</th>
                <th className="pb-2 pr-4 font-medium">활성상태</th>
                <th className="pb-2 pr-4 font-medium">등록일</th>
                <th className="pb-2 font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ branch, isChild }) => (
                <tr key={branch.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 pr-4 text-gray-900 font-medium">
                    <span className={isChild ? 'pl-6' : ''}>
                      {isChild && <span className="text-gray-300 mr-1">└</span>}
                      {branch.name}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500 text-xs font-mono">{branch.code}</td>
                  <td className="py-2.5 pr-4 text-gray-600 text-xs">{branch.address ?? '-'}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{branch._count?.users ?? 0}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{branch._count?.locations ?? 0}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      branch.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {branch.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-400 text-xs">
                    {new Date(branch.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="py-2.5">
                    <button
                      onClick={() => { setEditBranch(branch); setError(''); }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      수정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateBranchModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        branches={topLevel}
        onCreate={async (body) => {
          try {
            await createMut.mutateAsync(body);
            setShowCreate(false);
          } catch {
            setError('지점 생성에 실패했습니다');
          }
        }}
        isPending={createMut.isPending}
      />

      {/* Edit Modal */}
      {editBranch && (
        <EditBranchModal
          open={!!editBranch}
          onClose={() => setEditBranch(null)}
          branch={editBranch}
          onUpdate={async (body) => {
            try {
              await updateMut.mutateAsync({ id: editBranch.id, ...body });
              setEditBranch(null);
            } catch {
              setError('지점 수정에 실패했습니다');
            }
          }}
          isPending={updateMut.isPending}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Create Branch Modal
// ----------------------------------------------------------------

function CreateBranchModal({
  open,
  onClose,
  branches,
  onCreate,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  branches: Branch[];
  onCreate: (body: { name: string; code: string; address?: string; parentId?: string }) => Promise<void>;
  isPending: boolean;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [parentId, setParentId] = useState('');
  const [err, setErr] = useState('');

  function reset() {
    setName(''); setCode(''); setAddress(''); setParentId(''); setErr('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !code) { setErr('이름과 코드를 입력하세요'); return; }
    setErr('');
    try {
      await onCreate({
        name,
        code,
        address: address || undefined,
        parentId: parentId || undefined,
      });
      reset();
    } catch {
      setErr('지점 생성에 실패했습니다');
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="지점 추가">
      <form onSubmit={handleSubmit} className="space-y-4">
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Field label="지점명 *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <Field label="코드 *">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="예: MAIN, BR01"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <Field label="주소">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <Field label="상위 지점">
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">없음 (최상위)</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => { reset(); onClose(); }} className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            취소
          </button>
          <button type="submit" disabled={isPending} className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {isPending ? '생성 중...' : '생성'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ----------------------------------------------------------------
// Edit Branch Modal
// ----------------------------------------------------------------

function EditBranchModal({
  open,
  onClose,
  branch,
  onUpdate,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  branch: Branch;
  onUpdate: (body: { name?: string; address?: string; isActive?: boolean }) => Promise<void>;
  isPending: boolean;
}) {
  const [name, setName] = useState(branch.name);
  const [address, setAddress] = useState(branch.address ?? '');
  const [isActive, setIsActive] = useState(branch.isActive);
  const [err, setErr] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await onUpdate({ name, address: address || undefined, isActive });
    } catch {
      setErr('수정에 실패했습니다');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="지점 수정">
      <form onSubmit={handleSubmit} className="space-y-4">
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Field label="지점명">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <Field label="코드">
          <input value={branch.code} disabled className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-400" />
        </Field>
        <Field label="주소">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
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
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            취소
          </button>
          <button type="submit" disabled={isPending} className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {isPending ? '저장 중...' : '저장'}
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
