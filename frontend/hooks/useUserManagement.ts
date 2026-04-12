import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  ApiResponse,
  AdminUser,
  CreateUserBody,
  UpdateUserBody,
  ListUsersQuery,
} from '@/types';

// ================================================================
// 사용자 목록 조회
// ================================================================

export function useUsers(query?: ListUsersQuery) {
  return useQuery<AdminUser[]>({
    queryKey: ['users', query],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (query?.role) params.role = query.role;
      if (query?.branchId) params.branchId = query.branchId;
      if (query?.isActive !== undefined) params.isActive = String(query.isActive);
      const { data } = await apiClient.get<ApiResponse<AdminUser[]>>('/users', { params });
      return data.data;
    },
  });
}

// ================================================================
// 사용자 생성
// ================================================================

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateUserBody) => {
      const { data } = await apiClient.post<ApiResponse<AdminUser>>('/users', body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

// ================================================================
// 사용자 수정
// ================================================================

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateUserBody & { id: string }) => {
      const { data } = await apiClient.patch<ApiResponse<AdminUser>>(`/users/${id}`, body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

// ================================================================
// 사용자 비활성화
// ================================================================

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

// ================================================================
// 가입 대기 사용자
// ================================================================

export function usePendingUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['users', 'pending'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<AdminUser[]>>('/users/pending');
      return data.data;
    },
  });
}

// ================================================================
// 가입 승인
// ================================================================

export function useApproveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<ApiResponse<AdminUser>>(`/users/${id}/approve`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

// ================================================================
// 가입 거부
// ================================================================

export function useRejectUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<ApiResponse<AdminUser>>(`/users/${id}/reject`);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
