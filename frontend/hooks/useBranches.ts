import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, Branch } from '@/types';

// ----------------------------------------------------------------
// 목록
// ----------------------------------------------------------------

export function useBranches(isActive?: boolean) {
  return useQuery({
    queryKey: ['branches', { isActive }],
    queryFn: async () => {
      const params = isActive !== undefined ? { isActive } : {};
      const { data } = await apiClient.get<ApiResponse<Branch[]>>('/branches', { params });
      return data.data;
    },
  });
}

// ----------------------------------------------------------------
// 단건
// ----------------------------------------------------------------

export function useBranch(branchId: string) {
  return useQuery({
    queryKey: ['branches', branchId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Branch>>(`/branches/${branchId}`);
      return data.data;
    },
    enabled: !!branchId,
  });
}

// ----------------------------------------------------------------
// 생성
// ----------------------------------------------------------------

export interface CreateBranchDto {
  name: string;
  code: string;
  address?: string;
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateBranchDto) => {
      const { data } = await apiClient.post<ApiResponse<Branch>>('/branches', dto);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

// ----------------------------------------------------------------
// 수정
// ----------------------------------------------------------------

export interface UpdateBranchDto {
  name?: string;
  address?: string;
  isActive?: boolean;
}

export function useUpdateBranch(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateBranchDto) => {
      const { data } = await apiClient.patch<ApiResponse<Branch>>(`/branches/${branchId}`, dto);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}
