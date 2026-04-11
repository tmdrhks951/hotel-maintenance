import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  ApiResponse,
  QcQueue,
  FacilityRequestDetail,
  QcReviewBody,
  AssignableUser,
} from '@/types';

// ================================================================
// QC 작업 큐 조회
// ================================================================

export function useQcQueue(branchId?: string | null) {
  return useQuery({
    queryKey: ['qc-queue', branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : '';
      const { data } = await apiClient.get<ApiResponse<QcQueue>>(
        `/facility-requests/qc-queue${params}`,
      );
      return data.data;
    },
    // 30초마다 자동 갱신
    refetchInterval: 30_000,
  });
}

// ================================================================
// 요청 상세 조회
// ================================================================

export function useFacilityRequestDetail(id: string | null) {
  return useQuery({
    queryKey: ['facility-request', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<FacilityRequestDetail>>(
        `/facility-requests/${id}`,
      );
      return data.data;
    },
    enabled: !!id,
  });
}

// ================================================================
// QC 판단 (긴급/우선순위/상태 전이)
// ================================================================

export function useQcReview(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: QcReviewBody) => {
      const { data } = await apiClient.patch<ApiResponse<FacilityRequestDetail>>(
        `/facility-requests/${requestId}/qc-review`,
        body,
      );
      return data.data;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['qc-queue'] });
      qc.setQueryData(['facility-request', requestId], updated);
    },
  });
}

// ================================================================
// 일정 등록/변경
// ================================================================

export function useUpdateSchedule(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ plannedWorkDate, reason }: { plannedWorkDate: string; reason?: string }) => {
      const { data } = await apiClient.patch<ApiResponse<FacilityRequestDetail>>(
        `/facility-requests/${requestId}/schedule`,
        { plannedWorkDate, reason },
      );
      return data.data;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['qc-queue'] });
      qc.setQueryData(['facility-request', requestId], updated);
    },
  });
}

// ================================================================
// 담당자 배정
// ================================================================

export function useAssignWorker(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignedToId: string) => {
      const { data } = await apiClient.patch<ApiResponse<FacilityRequestDetail>>(
        `/facility-requests/${requestId}/assign`,
        { assignedToId },
      );
      return data.data;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['qc-queue'] });
      qc.setQueryData(['facility-request', requestId], updated);
    },
  });
}

// ================================================================
// 담당자 후보 조회
// ================================================================

export function useAssignableUsers(branchId: string | null | undefined) {
  return useQuery({
    queryKey: ['assignable-users', branchId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<AssignableUser[]>>(
        `/users/assignable?branchId=${branchId}`,
      );
      return data.data;
    },
    enabled: !!branchId,
  });
}
