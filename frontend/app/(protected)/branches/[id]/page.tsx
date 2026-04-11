'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBranch, useUpdateBranch } from '@/hooks/useBranches';
import { useLocations, useCreateLocation, useUpdateLocation } from '@/hooks/useLocations';
import { useAppStore } from '@/stores/appStore';
import { canManageBranch, canManageLocation } from '@/lib/auth';
import { LOCATION_TYPE_LABEL } from '@/types';
import type { Location, LocationType } from '@/types';

const LOCATION_TYPES: LocationType[] = ['ROOM', 'PUBLIC_AREA', 'OFFICE', 'BACK_OF_HOUSE'];

// ================================================================
// Branch 수정 폼 (ADMIN 전용)
// ================================================================

function EditBranchForm({
  branchId,
  initial,
  onClose,
}: {
  branchId: string;
  initial: { name: string; address: string | null; isActive: boolean };
  onClose: () => void;
}) {
  const { mutateAsync, isPending } = useUpdateBranch(branchId);
  const [name, setName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address ?? '');
  const [isActive, setIsActive] = useState(initial.isActive);
  const [formError, setFormError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    try {
      await mutateAsync({ name, address: address || undefined, isActive });
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '수정에 실패했습니다';
      setFormError(msg);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-yellow-50 mb-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">지점 정보 수정</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">지점명</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">활성 상태</label>
            <select
              value={isActive ? 'true' : 'false'}
              onChange={(e) => setIsActive(e.target.value === 'true')}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none"
            >
              <option value="true">활성</option>
              <option value="false">비활성</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">주소</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
        {formError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
            {formError}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50">취소</button>
          <button type="submit" disabled={isPending} className="text-sm px-3 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50">
            {isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ================================================================
// Location 생성 폼 (ADMIN 전용)
// ================================================================

function CreateLocationForm({ branchId, onClose }: { branchId: string; onClose: () => void }) {
  const { mutateAsync, isPending } = useCreateLocation(branchId);
  const [name, setName] = useState('');
  const [type, setType] = useState<LocationType>('ROOM');
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    try {
      await mutateAsync({ name, type, code: code || undefined });
      setName(''); setCode('');
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '생성에 실패했습니다';
      setFormError(msg);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-green-50 mb-3">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">위치 등록</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">타입 <span className="text-red-500">*</span></label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LocationType)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none"
            >
              {LOCATION_TYPES.map((t) => (
                <option key={t} value={t}>{LOCATION_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">이름 <span className="text-red-500">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'ROOM' ? '101호' : '로비'}
              required
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              코드 <span className="text-gray-400">(선택)</span>
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={type === 'ROOM' ? '101' : 'LOBBY-1'}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
        {formError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">{formError}</p>
        )}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50">취소</button>
          <button type="submit" disabled={isPending} className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            {isPending ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ================================================================
// Location 행 (인라인 수정)
// ================================================================

function LocationRow({
  location,
  branchId,
  canEdit,
}: {
  location: Location;
  branchId: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(location.name);
  const [code, setCode] = useState(location.code ?? '');
  const [isActive, setIsActive] = useState(location.isActive);
  const { mutateAsync, isPending } = useUpdateLocation(branchId, location.id);

  async function handleSave() {
    try {
      await mutateAsync({ name, code: code || undefined, isActive });
      setEditing(false);
    } catch {
      // 에러는 그대로 유지
    }
  }

  if (editing) {
    return (
      <tr className="bg-yellow-50">
        <td className="px-3 py-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none"
          />
        </td>
        <td className="px-3 py-2">
          <span className="text-xs font-mono text-gray-500">{LOCATION_TYPE_LABEL[location.type]}</span>
        </td>
        <td className="px-3 py-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="코드 없음"
            className="w-24 border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none"
          />
        </td>
        <td className="px-3 py-2">
          <select
            value={isActive ? 'true' : 'false'}
            onChange={(e) => setIsActive(e.target.value === 'true')}
            className="border border-gray-300 rounded px-2 py-1 text-xs"
          >
            <option value="true">활성</option>
            <option value="false">비활성</option>
          </select>
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button onClick={handleSave} disabled={isPending} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {isPending ? '...' : '저장'}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50">
              취소
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-2 text-sm text-gray-900">{location.name}</td>
      <td className="px-3 py-2">
        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {LOCATION_TYPE_LABEL[location.type]}
        </span>
      </td>
      <td className="px-3 py-2 text-xs font-mono text-gray-400">{location.code ?? '—'}</td>
      <td className="px-3 py-2">
        <span className={`text-xs px-1.5 py-0.5 rounded ${location.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {location.isActive ? '활성' : '비활성'}
        </span>
      </td>
      <td className="px-3 py-2">
        {canEdit && (
          <button onClick={() => setEditing(true)} className="text-xs text-blue-500 hover:underline">
            수정
          </button>
        )}
      </td>
    </tr>
  );
}

// ================================================================
// 페이지
// ================================================================

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.id as string;
  const user = useAppStore((s) => s.user);

  const [showEditBranch, setShowEditBranch] = useState(false);
  const [showCreateLocation, setShowCreateLocation] = useState(false);
  const [typeFilter, setTypeFilter] = useState<LocationType | ''>('');

  const { data: branch, isLoading: branchLoading } = useBranch(branchId);
  const {
    data: locations,
    isLoading: locationsLoading,
  } = useLocations(branchId, typeFilter || undefined);

  const canEditBranch = canManageBranch(user);
  const canEditLocation = canManageLocation(user);

  if (branchLoading) {
    return <p className="text-sm text-gray-400 py-8 text-center">불러오는 중...</p>;
  }

  if (!branch) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600">지점을 찾을 수 없습니다.</p>
        <button onClick={() => router.push('/branches')} className="mt-2 text-xs text-blue-500 hover:underline">
          ← 목록으로
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 브레드크럼 */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <button onClick={() => router.push('/branches')} className="hover:text-blue-500">지점 목록</button>
        <span>›</span>
        <span className="text-gray-700 font-medium">{branch.name}</span>
      </div>

      {/* Branch 정보 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">{branch.name}</h1>
              <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{branch.code}</span>
              {!branch.isActive && (
                <span className="text-xs text-red-500 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">비활성</span>
              )}
            </div>
            {branch.address && <p className="text-sm text-gray-500 mt-1">{branch.address}</p>}
            <div className="flex gap-4 mt-2">
              <span className="text-xs text-gray-400">직원 {branch._count?.users ?? 0}명</span>
              <span className="text-xs text-gray-400">위치 {branch._count?.locations ?? 0}개</span>
            </div>
          </div>
          {canEditBranch && (
            <button
              onClick={() => setShowEditBranch(!showEditBranch)}
              className="text-xs px-2.5 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
            >
              {showEditBranch ? '취소' : '수정'}
            </button>
          )}
        </div>
      </div>

      {/* Branch 수정 폼 */}
      {showEditBranch && (
        <EditBranchForm
          branchId={branchId}
          initial={{ name: branch.name, address: branch.address, isActive: branch.isActive }}
          onClose={() => setShowEditBranch(false)}
        />
      )}

      {/* Location 섹션 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">위치 목록</h2>
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as LocationType | '')}
              className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none"
            >
              <option value="">전체 타입</option>
              {LOCATION_TYPES.map((t) => (
                <option key={t} value={t}>{LOCATION_TYPE_LABEL[t]}</option>
              ))}
            </select>
            {canEditLocation && (
              <button
                onClick={() => setShowCreateLocation(!showCreateLocation)}
                className="text-xs px-2.5 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {showCreateLocation ? '취소' : '+ 위치 등록'}
              </button>
            )}
          </div>
        </div>

        {/* Location 등록 폼 */}
        {showCreateLocation && (
          <CreateLocationForm branchId={branchId} onClose={() => setShowCreateLocation(false)} />
        )}

        {/* Location 테이블 */}
        {locationsLoading ? (
          <p className="text-sm text-gray-400 text-center py-6">불러오는 중...</p>
        ) : !locations || locations.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">등록된 위치가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">이름</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">타입</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">코드</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500">상태</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <LocationRow
                    key={loc.id}
                    location={loc}
                    branchId={branchId}
                    canEdit={canEditLocation}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
