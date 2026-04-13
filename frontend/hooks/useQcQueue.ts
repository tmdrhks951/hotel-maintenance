import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  ApiResponse,
  QcQueue,
  QcCompletedQueue,
  QcHistoryCard,
  OperationsPendingQueue,
  OperationsDashboard,
  WorkHistoryItem,
  FacilityRequestDetail,
  QcReviewBody,
  QcVerifyBody,
  OperationsConfirmBody,
  ReopenBody,
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
    refetchInterval: 15_000,            // 15초 폴링 (SSE 보조)
    refetchIntervalInBackground: true,  // 탭이 비활성 상태여도 폴링 유지
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
      qc.invalidateQueries({ queryKey: ['operations-dashboard'] });
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
      qc.invalidateQueries({ queryKey: ['operations-dashboard'] });
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

// ================================================================
// STEP 8: QC 완료 큐 조회
// ================================================================

export function useQcCompleted(branchId?: string | null) {
  return useQuery({
    queryKey: ['qc-completed', branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : '';
      const { data } = await apiClient.get<ApiResponse<QcCompletedQueue>>(
        `/facility-requests/qc-completed${params}`,
      );
      return data.data;
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });
}

// ================================================================
// STEP 8: QC 최종 검토
// ================================================================

export function useQcVerify(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: QcVerifyBody) => {
      const { data } = await apiClient.patch<ApiResponse<FacilityRequestDetail>>(
        `/facility-requests/${requestId}/qc-verify`,
        body,
      );
      return data.data;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['qc-queue'] });
      qc.invalidateQueries({ queryKey: ['qc-completed'] });
      qc.invalidateQueries({ queryKey: ['operations-dashboard'] });
      qc.setQueryData(['facility-request', requestId], updated);
    },
  });
}

// ================================================================
// STEP 8: 운영팀 확인 큐 조회
// ================================================================

export function useOperationsPending(branchId?: string | null) {
  return useQuery({
    queryKey: ['operations-pending', branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : '';
      const { data } = await apiClient.get<ApiResponse<OperationsPendingQueue>>(
        `/facility-requests/operations-pending${params}`,
      );
      return data.data;
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });
}

// ================================================================
// 작업 이력 조회 (달력·키워드 검색)
// ================================================================

export interface WorkHistoryParams {
  date?: string;       // YYYY-MM-DD 특정일
  startDate?: string;  // YYYY-MM-DD 월 범위 시작
  endDate?: string;    // YYYY-MM-DD 월 범위 끝
  keyword?: string;    // 키워드
  branchId?: string;
}

export function useWorkHistory(
  params: WorkHistoryParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['work-history', params],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.date)      sp.set('date',      params.date);
      if (params.startDate) sp.set('startDate', params.startDate);
      if (params.endDate)   sp.set('endDate',   params.endDate);
      if (params.keyword)   sp.set('keyword',   params.keyword);
      if (params.branchId)  sp.set('branchId',  params.branchId);
      const { data } = await apiClient.get<ApiResponse<WorkHistoryItem[]>>(
        `/facility-requests/work-history?${sp.toString()}`,
      );
      return data.data;
    },
    enabled: options?.enabled !== false,
    staleTime: 60_000,
  });
}

// ================================================================
// 운영팀 대시보드 (4개 섹션)
// ================================================================

export function useOperationsDashboard(branchId?: string | null) {
  return useQuery({
    queryKey: ['operations-dashboard', branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : '';
      const { data } = await apiClient.get<ApiResponse<OperationsDashboard>>(
        `/facility-requests/operations-dashboard${params}`,
      );
      return data.data;
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });
}

// ================================================================
// STEP 8: 운영팀 확인 처리
// ================================================================

export function useOperationsConfirm(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: OperationsConfirmBody) => {
      const { data } = await apiClient.patch<ApiResponse<FacilityRequestDetail>>(
        `/facility-requests/${requestId}/operations-confirm`,
        body,
      );
      return data.data;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['operations-pending'] });
      qc.invalidateQueries({ queryKey: ['operations-dashboard'] });
      qc.setQueryData(['facility-request', requestId], updated);
    },
  });
}

// ================================================================
// STEP 7: 작업 완료 등록
// ================================================================

export function useCompleteWork(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await apiClient.post<ApiResponse<FacilityRequestDetail>>(
        `/facility-requests/${requestId}/complete`,
        formData,
        { headers: { 'Content-Type': undefined } },
      );
      return data.data;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['qc-queue'] });
      qc.invalidateQueries({ queryKey: ['qc-completed'] });
      qc.invalidateQueries({ queryKey: ['operations-dashboard'] });
      qc.setQueryData(['facility-request', requestId], updated);
    },
  });
}

// ================================================================
// STEP 9: QC 완료 이력
// ================================================================

export function useQcHistory(branchId?: string | null) {
  return useQuery({
    queryKey: ['qc-history', branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : '';
      const { data } = await apiClient.get<ApiResponse<QcHistoryCard[]>>(
        `/facility-requests/qc-history${params}`,
      );
      return data.data;
    },
  });
}

// ================================================================
// STEP 11: 재오픈
// ================================================================

export function useReopenFacilityRequest(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: ReopenBody) => {
      const { data } = await apiClient.patch<ApiResponse<FacilityRequestDetail>>(
        `/facility-requests/${requestId}/reopen`,
        body,
      );
      return data.data;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['qc-queue'] });
      qc.invalidateQueries({ queryKey: ['qc-completed'] });
      qc.invalidateQueries({ queryKey: ['operations-pending'] });
      qc.invalidateQueries({ queryKey: ['operations-dashboard'] });
      qc.setQueryData(['facility-request', requestId], updated);
    },
  });
}

// ================================================================
// 시설 요청 수정
// ================================================================

export function useUpdateFacilityRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: { title?: string; description?: string; category?: string; locationId?: string | null } }) => {
      const { data } = await apiClient.patch<ApiResponse<FacilityRequestDetail>>(
        `/facility-requests/${id}`,
        body,
      );
      return data.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['qc-queue'] });
      qc.invalidateQueries({ queryKey: ['operations-dashboard'] });
      qc.invalidateQueries({ queryKey: ['facility-request', variables.id] });
    },
  });
}

// ================================================================
// 시설 요청 삭제
// ================================================================

export function useDeleteFacilityRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/facility-requests/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qc-queue'] });
      qc.invalidateQueries({ queryKey: ['operations-dashboard'] });
      qc.invalidateQueries({ queryKey: ['operations-pending'] });
    },
  });
}
