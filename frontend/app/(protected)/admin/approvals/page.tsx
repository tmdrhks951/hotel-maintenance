'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/appStore';
import type { PasswordResetRequest } from '@/types';
import { DEPARTMENT_LABEL, POSITION_LABEL } from '@/types';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: '관리자',
  OPERATIONS: '운영팀',
  QC: 'QC',
  VENDOR: '외부업체',
};

interface ApprovedItem {
  request: PasswordResetRequest;
  tempPassword: string;
}

function usePasswordResetRequests() {
  return useQuery({
    queryKey: ['password-reset-requests'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: PasswordResetRequest[] }>(
        '/admin/password-reset-requests',
      );
      return data.data;
    },
  });
}

function useApprovePasswordReset() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<{ success: boolean; data: { tempPassword: string } }>(
        `/admin/password-reset-requests/${id}/approve`,
      );
      return data.data;
    },
    // NOTE: invalidation은 수동으로 처리 (승인 후 카드가 사라지면 임시 비밀번호도 안 보이므로)
  });
}

function useRejectPasswordReset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/admin/password-reset-requests/${id}/reject`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['password-reset-requests'] });
    },
  });
}

export default function ApprovalsPage() {
  const { user } = useAppStore();
  const qc = useQueryClient();
  const { data: requests, isLoading } = usePasswordResetRequests();
  const approveMutation = useApprovePasswordReset();
  const rejectMutation = useRejectPasswordReset();
  // 승인 완료 후 임시 비밀번호를 보여주기 위해 별도 상태로 관리
  const [approvedItems, setApprovedItems] = useState<ApprovedItem[]>([]);
  const [error, setError] = useState('');

  if (!user || user.role !== 'ADMIN') {
    return <div className="text-center py-20 text-sm text-gray-400">ADMIN 계정만 접근 가능합니다</div>;
  }

  // 이미 승인 처리한 요청 ID 세트 (목록에서 숨기기)
  const approvedIds = new Set(approvedItems.map((a) => a.request.id));
  const pendingRequests = requests?.filter((r) => !approvedIds.has(r.id)) ?? [];

  async function handleApprove(requestId: string) {
    setError('');
    // 승인 전에 해당 요청 데이터를 저장 (목록에서 사라지기 전에)
    const targetReq = requests?.find((r) => r.id === requestId);
    if (!targetReq) return;

    try {
      const result = await approveMutation.mutateAsync(requestId);
      // 승인 완료 → 별도 섹션에서 임시 비밀번호 표시
      setApprovedItems((prev) => [...prev, { request: targetReq, tempPassword: result.tempPassword }]);
      // PENDING 목록 갱신
      qc.invalidateQueries({ queryKey: ['password-reset-requests'] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '승인 실패');
    }
  }

  async function handleReject(requestId: string) {
    if (!confirm('이 비밀번호 재설정 요청을 거부하시겠습니까?')) return;
    setError('');
    try {
      await rejectMutation.mutateAsync(requestId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '거부 실패');
    }
  }

  function handleDismissApproved(requestId: string) {
    setApprovedItems((prev) => prev.filter((a) => a.request.id !== requestId));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">비밀번호 재설정 요청</h1>
        <p className="text-xs text-gray-400 mt-0.5">승인 시 임시 비밀번호가 발급됩니다</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2 mb-4">{error}</p>
      )}

      {/* 승인 완료 — 임시 비밀번호 표시 영역 */}
      {approvedItems.length > 0 && (
        <div className="space-y-3 mb-6">
          {approvedItems.map((item) => (
            <div key={item.request.id} className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{item.request.user.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      item.request.user.role === 'QC' ? 'bg-blue-100 text-blue-700' :
                      item.request.user.role === 'VENDOR' ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {ROLE_LABEL[item.request.user.role]}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                      승인 완료
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">{item.request.user.loginId ?? item.request.user.email}</p>
                </div>
                <button
                  onClick={() => handleDismissApproved(item.request.id)}
                  className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                >
                  닫기
                </button>
              </div>
              <div className="mt-3 bg-white border border-yellow-200 rounded px-3 py-3">
                <p className="text-xs text-yellow-700 font-medium mb-1">임시 비밀번호</p>
                <p className="text-lg font-mono font-bold text-yellow-800 select-all">{item.tempPassword}</p>
                <p className="text-xs text-yellow-600 mt-2">이 비밀번호를 직접 해당 직원에게 전달해주세요. 이 페이지를 벗어나면 다시 확인할 수 없습니다.</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-sm text-gray-400">불러오는 중...</div>
      ) : !pendingRequests.length && !approvedItems.length ? (
        <div className="text-center py-16 text-sm text-gray-400">처리 대기 중인 요청이 없습니다</div>
      ) : pendingRequests.length > 0 ? (
        <div className="space-y-3">
          {pendingRequests.map((req: PasswordResetRequest) => (
            <div key={req.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{req.user.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      req.user.role === 'QC' ? 'bg-blue-100 text-blue-700' :
                      req.user.role === 'VENDOR' ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {ROLE_LABEL[req.user.role]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">{req.user.loginId ?? req.user.email}</p>
                  <p className="text-xs text-gray-400">
                    {DEPARTMENT_LABEL[req.user.department]} · {POSITION_LABEL[req.user.position]}
                  </p>
                  <p className="text-xs text-gray-400">
                    신청일: {new Date(req.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={approveMutation.isPending}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={rejectMutation.isPending}
                    className="text-xs border border-red-300 text-red-600 px-3 py-1.5 rounded hover:bg-red-50 disabled:opacity-50"
                  >
                    거부
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
