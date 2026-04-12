import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, Branch } from '@/types';

// ================================================================
// 지점 목록 조회
// ================================================================

export function useBranches(isActive?: boolean) {
  return useQuery<Branch[]>({
    queryKey: ['branches', isActive],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (isActive !== undefined) params.isActive = String(isActive);
      const { data } = await apiClient.get<ApiResponse<Branch[]>>('/branches', { params });
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
}

// ================================================================
// 단일 지점 조회
// ================================================================

export function useBranch(id: string | null) {
  return useQuery<Branch>({
    queryKey: ['branch', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Branch>>(`/branches/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

// ================================================================
// 지점 생성
// ================================================================

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; code: string; address?: string; parentId?: string }) => {
      const { data } = await apiClient.post<ApiResponse<Branch>>('/branches', body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
}

// ================================================================
// 지점 수정
// ================================================================

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; address?: string; isActive?: boolean }) => {
      const { data } = await apiClient.patch<ApiResponse<Branch>>(`/branches/${id}`, body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branches'] }),
  });
}
