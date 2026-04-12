'use client';

import { useState } from 'react';
import { useEscKey } from '@/hooks/useEscKey';
import { useAppStore } from '@/stores/appStore';
import { useUsers, useCreateUser, useUpdateUser, useDeactivateUser } from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
import type { AdminUser, Role, Position, CreateUserBody, UpdateUserBody } from '@/types';

// ================================================================
// 레이블 맵
// ================================================================

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: '관리자',
  OPERATIONS: '운영팀',
  QC: 'QC',
};

const POSITION_LABEL: Record<Position, string> = {
  TEAM_LEADER: '팀장',
  DEPUTY_LEADER: '부팀장',
  MEMBER: '팀원',
  OTHER: '기타',
};

const ROLES: Role[] = ['ADMIN', 'OPERATIONS', 'QC'];
const POSITIONS: Position[] = ['TEAM_LEADER', 'DEPUTY_LEADER', 'MEMBER', 'OTHER'];

// ================================================================
// 사용자 행 컴포넌트
// ================================================================

function UserRow({
  user,
  onEdit,
}: {
  user: AdminUser;
  onEdit: (user: AdminUser) => void;
}) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-3 px-4 text-sm text-gray-900">{user.name}</td>
      <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
      <td className="py-3 px-4">
        <span
          className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
            user.role === 'ADMIN'
              ? 'bg-purple-100 text-purple-700'
              : user.role === 'QC'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {ROLE_LABEL[user.role]}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">{POSITION_LABEL[user.position]}</td>
      <td className="py-3 px-4 text-sm text-gray-600">{user.branch?.name ?? '—'}</td>
      <td className="py-3 px-4">
        <span
          className={`inline-block text-xs px-2 py-0.5 rounded-full ${
            user.isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-600'
          }`}
        >
          {user.isActive ? '활성' : '비활성'}
        </span>
      </td>
      <td className="py-3 px-4 text-xs text-gray-400">
        {new Date(user.createdAt).toLocaleDateString('ko-KR')}
      </td>
      <td className="py-3 px-4">
        <button
          onClick={() => onEdit(user)}
          className="text-xs text-blue-600 hover:underline"
        >
          수정
        </button>
      </td>
    </tr>
  );
}

// ================================================================
// 사용자 생성 / 수정 폼 패널
// ================================================================

function UserFormPanel({
  editingUser,
  onClose,
}: {
  editingUser: AdminUser | null; // null = 생성 모드
  onClose: () => void;
}) {
  const { data: branches } = useBranches(true);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(editingUser?.id ?? '');
  const deactivateMutation = useDeactivateUser();

  const isEdit = !!editingUser;

  useEscKey(onClose);

  // 폼 상태
  const [email,    setEmail]    = useState(editingUser?.email ?? '');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState(editingUser?.name ?? '');
  const [role,     setRole]     = useState<Role>(editingUser?.role ?? 'OPERATIONS');
  const [position, setPosition] = useState<Position>(editingUser?.position ?? 'MEMBER');
  const [branchId, setBranchId] = useState(editingUser?.branchId ?? '');
  const [isActive, setIsActive] = useState(editingUser?.isActive ?? true);

  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isEdit) {
        const body: UpdateUserBody = {
          name: name.trim() || undefined,
          role,
          position,
          branchId: branchId || null,
          isActive,
        };
        await updateMutation.mutateAsync(body);
        setSuccess('사용자 정보가 수정됐습니다');
      } else {
        if (!email.trim() || !password.trim() || !name.trim()) {
          setError('이메일, 비밀번호, 이름은 필수입니다');
          return;
        }
        const body: CreateUserBody = {
          email: email.trim(),
          password: password.trim(),
          name: name.trim(),
          role,
          position,
          branchId: branchId || undefined,
        };
        await createMutation.mutateAsync(body);
        setSuccess('계정이 생성됐습니다');
        // 폼 초기화
        setEmail(''); setPassword(''); setName('');
        setRole('OPERATIONS'); setPosition('MEMBER'); setBranchId('');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '처리 실패');
    }
  }

  async function handleDeactivate() {
    if (!editingUser) return;
    if (!confirm(`"${editingUser.name}" 계정을 비활성화(삭제)합니까?`)) return;
    try {
      await deactivateMutation.mutateAsync(editingUser.id);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '비활성화 실패');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/30"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-full sm:max-w-md bg-white shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
          <h3 className="text-sm font-semibold text-gray-900">
            {isEdit ? '사용자 수정' : '계정 생성'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              {success}
            </div>
          )}

          {/* 이름 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
              placeholder="홍길동"
            />
          </div>

          {/* 이메일 — 생성 시만 편집 가능 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">이메일 *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEdit}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              placeholder="user@hotel.com"
            />
          </div>

          {/* 비밀번호 — 생성 시만 표시 */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">비밀번호 *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                placeholder="8자 이상 권장"
              />
            </div>
          )}

          {/* 역할 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">역할 *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </div>

          {/* 직위 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">직위</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as Position)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{POSITION_LABEL[p]}</option>
              ))}
            </select>
          </div>

          {/* 소속 지점 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">소속 지점</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="">— 없음 —</option>
              {(branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {(role === 'QC' || (role === 'OPERATIONS' && position === 'MEMBER')) && !branchId && (
              <p className="mt-1 text-xs text-orange-500">이 역할/직위는 지점 배정이 필요합니다</p>
            )}
          </div>

          {/* 활성화 상태 — 수정 시만 표시 */}
          {isEdit && (
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-gray-600">계정 활성화</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  isActive ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    isActive ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <span className="text-xs text-gray-500">{isActive ? '활성' : '비활성'}</span>
            </div>
          )}

          {/* 저장 버튼 */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? '처리 중...' : isEdit ? '수정 저장' : '계정 생성'}
          </button>

          {/* 비활성화(삭제) — 수정 시만 표시 */}
          {isEdit && editingUser?.isActive && (
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={deactivateMutation.isPending}
              className="w-full py-2.5 text-sm font-medium rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              계정 비활성화 (삭제)
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// ================================================================
// 사용자 관리 메인 페이지
// ================================================================

export default function UsersPage() {
  const { user } = useAppStore();
  const { data: branches } = useBranches(true);

  const [filterRole,     setFilterRole]     = useState<Role | ''>('');
  const [filterBranchId, setFilterBranchId] = useState('');
  const [filterActive,   setFilterActive]   = useState<'all' | 'active' | 'inactive'>('active');
  const [search,         setSearch]         = useState('');

  const [showForm,    setShowForm]    = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const { data: users, isLoading, error } = useUsers({
    role:     filterRole     || undefined,
    branchId: filterBranchId || undefined,
    isActive: filterActive === 'all' ? undefined : filterActive === 'active',
  });

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="text-center py-20 text-sm text-gray-400">
        ADMIN 계정만 접근 가능합니다
      </div>
    );
  }

  // 클라이언트 측 이름/이메일 검색
  const filtered = (users ?? []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  function openCreate() {
    setEditingUser(null);
    setShowForm(true);
  }

  function openEdit(u: AdminUser) {
    setEditingUser(u);
    setShowForm(true);
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">사용자 관리</h1>
          {users && (
            <p className="text-xs text-gray-400 mt-0.5">
              총 {users.length}명
            </p>
          )}
        </div>
        <button
          onClick={openCreate}
          className="text-sm font-medium bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700"
        >
          + 계정 생성
        </button>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mb-4">
        {/* 이름/이메일 검색 */}
        <input
          type="text"
          placeholder="이름 또는 이메일 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400 w-full sm:w-48"
        />

        {/* 역할 필터 */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as Role | '')}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400"
        >
          <option value="">전체 역할</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>

        {/* 지점 필터 */}
        <select
          value={filterBranchId}
          onChange={(e) => setFilterBranchId(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-400"
        >
          <option value="">전체 지점</option>
          {(branches ?? []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {/* 활성 상태 필터 */}
        <div className="flex rounded border border-gray-200 overflow-hidden text-xs">
          {(['active', 'all', 'inactive'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilterActive(v)}
              className={`px-3 py-1.5 transition-colors ${
                filterActive === v
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v === 'active' ? '활성' : v === 'inactive' ? '비활성' : '전체'}
            </button>
          ))}
        </div>
      </div>

      {/* 로딩 / 에러 */}
      {isLoading && (
        <div className="text-center py-16 text-sm text-gray-400">불러오는 중...</div>
      )}
      {error && (
        <div className="text-center py-10 text-sm text-red-500">
          데이터를 불러오지 못했습니다:{' '}
          {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {/* 테이블 */}
      {!isLoading && !error && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-400">사용자가 없습니다</div>
          ) : (
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500">이름</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500">이메일</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500">역할</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500">직위</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500">지점</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500">상태</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500">생성일</th>
                  <th className="py-2.5 px-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <UserRow key={u.id} user={u} onEdit={openEdit} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 생성/수정 패널 */}
      {showForm && (
        <UserFormPanel
          editingUser={editingUser}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
