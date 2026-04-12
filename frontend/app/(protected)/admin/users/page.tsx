'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import BranchFilter from '@/components/ui/BranchFilter';
import { useBranches } from '@/hooks/useBranches';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  usePendingUsers,
  useApproveUser,
  useRejectUser,
} from '@/hooks/useUserManagement';
import type { Role, Position, AdminUser, CreateUserBody, UpdateUserBody } from '@/types';
import { ROLE_LABEL, POSITION_LABEL } from '@/types';

const ROLES: Role[] = ['ADMIN', 'OPERATIONS', 'QC', 'VENDOR'];
const POSITIONS: Position[] = ['TEAM_LEADER', 'DEPUTY_LEADER', 'MEMBER', 'OTHER'];

type ActiveFilterValue = 'ALL' | 'ACTIVE' | 'INACTIVE';

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('ACTIVE');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState('');

  const isActiveQuery =
    activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE';

  const { data: users, isLoading } = useUsers({
    role: roleFilter || undefined,
    branchId: branchFilter ?? undefined,
    isActive: isActiveQuery,
  });
  const { data: pending } = usePendingUsers();
  const { data: branches } = useBranches(true);
  const createMut = useCreateUser();
  const updateMut = useUpdateUser();
  const deactivateMut = useDeactivateUser();
  const approveMut = useApproveUser();
  const rejectMut = useRejectUser();

  async function handleDeactivate(user: AdminUser) {
    if (!confirm(`${user.name} 사용자를 비활성화하시겠습니까?`)) return;
    try {
      await deactivateMut.mutateAsync(user.id);
    } catch {
      setError('비활성화에 실패했습니다');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">사용자 관리</h1>
          <p className="text-xs text-gray-400 mt-0.5">전체 사용자 현황</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setError(''); }}
          className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          사용자 추가
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-4">{error}</p>
      )}

      {/* Pending Users */}
      {pending && pending.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            가입 승인 대기
            <span className="ml-1.5 text-xs bg-orange-100 text-orange-600 rounded-full px-1.5 py-0.5">
              {pending.length}
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((u) => (
              <div key={u.id} className="bg-white border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">{u.name}</span>
                  <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">대기</span>
                </div>
                <p className="text-xs text-gray-500 mb-1">{u.email}</p>
                <p className="text-xs text-gray-400">{ROLE_LABEL[u.role]}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={async () => { try { await approveMut.mutateAsync(u.id); } catch { setError('승인 실패'); } }}
                    disabled={approveMut.isPending}
                    className="flex-1 text-xs bg-blue-600 text-white py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    승인
                  </button>
                  <button
                    onClick={async () => { try { await rejectMut.mutateAsync(u.id); } catch { setError('거부 실패'); } }}
                    disabled={rejectMut.isPending}
                    className="flex-1 text-xs border border-red-300 text-red-600 py-1.5 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    거부
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | '')}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 역할</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
        <BranchFilter value={branchFilter} onChange={setBranchFilter} />
        <div className="flex border border-gray-300 rounded overflow-hidden text-sm">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as ActiveFilterValue[]).map((val) => {
            const label = val === 'ALL' ? '전체' : val === 'ACTIVE' ? '활성' : '비활성';
            return (
              <button
                key={val}
                onClick={() => setActiveFilter(val)}
                className={`px-3 py-1.5 ${activeFilter === val ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="ml-2 text-sm text-gray-400">불러오는 중...</span>
        </div>
      ) : !users?.length ? (
        <div className="text-center py-16 text-sm text-gray-400">사용자가 없습니다</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="pb-2 pr-4 font-medium">이름</th>
                <th className="pb-2 pr-4 font-medium">이메일</th>
                <th className="pb-2 pr-4 font-medium">역할</th>
                <th className="pb-2 pr-4 font-medium">직급</th>
                <th className="pb-2 pr-4 font-medium">지점</th>
                <th className="pb-2 pr-4 font-medium">활성상태</th>
                <th className="pb-2 pr-4 font-medium">가입일</th>
                <th className="pb-2 font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 pr-4 text-gray-900 font-medium">{u.name}</td>
                  <td className="py-2.5 pr-4 text-gray-500 text-xs">{u.email}</td>
                  <td className="py-2.5 pr-4">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="py-2.5 pr-4 text-gray-600">{POSITION_LABEL[u.position]}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{u.branch?.name ?? '-'}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {u.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-gray-400 text-xs">
                    {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditUser(u); setError(''); }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        수정
                      </button>
                      {u.isActive && (
                        <button
                          onClick={() => handleDeactivate(u)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          비활성화
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateUserModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        branches={branches ?? []}
        onCreate={async (body) => {
          try {
            await createMut.mutateAsync(body);
            setShowCreate(false);
          } catch (e: unknown) {
            throw e;
          }
        }}
        isPending={createMut.isPending}
      />

      {/* Edit Modal */}
      {editUser && (
        <EditUserModal
          open={!!editUser}
          onClose={() => setEditUser(null)}
          user={editUser}
          branches={branches ?? []}
          onUpdate={async (body) => {
            try {
              await updateMut.mutateAsync({ id: editUser.id, ...body });
              setEditUser(null);
            } catch (e: unknown) {
              throw e;
            }
          }}
          isPending={updateMut.isPending}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Role Badge
// ----------------------------------------------------------------

function RoleBadge({ role }: { role: Role }) {
  const colors: Record<Role, string> = {
    ADMIN: 'bg-red-50 text-red-700',
    OPERATIONS: 'bg-green-50 text-green-700',
    QC: 'bg-blue-50 text-blue-700',
    VENDOR: 'bg-orange-50 text-orange-700',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[role]}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}

// ----------------------------------------------------------------
// Create User Modal
// ----------------------------------------------------------------

function CreateUserModal({
  open,
  onClose,
  branches,
  onCreate,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  branches: { id: string; name: string }[];
  onCreate: (body: CreateUserBody) => Promise<void>;
  isPending: boolean;
}) {
  const [form, setForm] = useState<CreateUserBody>({
    email: '',
    password: '',
    name: '',
    role: 'QC',
    position: 'MEMBER',
    branchId: '',
  });
  const [err, setErr] = useState('');

  function reset() {
    setForm({ email: '', password: '', name: '', role: 'QC', position: 'MEMBER', branchId: '' });
    setErr('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password || !form.name) {
      setErr('필수 항목을 입력하세요');
      return;
    }
    setErr('');
    try {
      await onCreate({ ...form, branchId: form.branchId || undefined });
      reset();
    } catch {
      setErr('사용자 생성에 실패했습니다');
    }
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="사용자 추가" wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Field label="이메일 *">
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <Field label="비밀번호 *">
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <Field label="이름 *">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="역할">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </Field>
          <Field label="직급">
            <select
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value as Position })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}
            </select>
          </Field>
        </div>
        <Field label="소속 지점">
          <select
            value={form.branchId ?? ''}
            onChange={(e) => setForm({ ...form, branchId: e.target.value || undefined })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">미지정</option>
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
// Edit User Modal
// ----------------------------------------------------------------

function EditUserModal({
  open,
  onClose,
  user,
  branches,
  onUpdate,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  user: AdminUser;
  branches: { id: string; name: string }[];
  onUpdate: (body: UpdateUserBody) => Promise<void>;
  isPending: boolean;
}) {
  const [form, setForm] = useState<UpdateUserBody>({
    name: user.name,
    role: user.role,
    position: user.position,
    branchId: user.branchId,
    isActive: user.isActive,
  });
  const [err, setErr] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      await onUpdate(form);
    } catch {
      setErr('수정에 실패했습니다');
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="사용자 수정" wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Field label="이름">
          <input
            value={form.name ?? ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="역할">
            <select
              value={form.role ?? user.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </Field>
          <Field label="직급">
            <select
              value={form.position ?? user.position}
              onChange={(e) => setForm({ ...form, position: e.target.value as Position })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABEL[p]}</option>)}
            </select>
          </Field>
        </div>
        <Field label="소속 지점">
          <select
            value={form.branchId ?? ''}
            onChange={(e) => setForm({ ...form, branchId: e.target.value || null })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">미지정</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="상태">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive ?? user.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
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
