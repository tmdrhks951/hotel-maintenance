import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  ApiResponse,
  AdminUser,
  CreateUserBody,
  UpdateUserBody,
  ListUsersQuery,
  PendingUser,
} from '@/types';

// ================================================================
// 사용자 목록 조회 (ADMIN)
// ================================================================

export function useUsers(query?: ListUsersQuery) {
  return useQuery({
    queryKey: ['users', query],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (query?.role)     sp.set('role', query.role);
      if (query?.branchId) sp.set('branchId', query.branchId);
      if (query?.isActive !== undefined) sp.set('isActive', String(query.isActive));
      const qs = sp.toString();
      const { data } = await apiClient.get<ApiResponse<AdminUser[]>>(
        `/users${qs ? `?${qs}` : ''}`,
      );
      return data.data;
    },
  });
}

// ================================================================
// 사용자 단건 조회 (ADMIN)
// ================================================================

export function useUser(id: string | null) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<AdminUser>>(`/users/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

// ================================================================
// 사용자 생성 (ADMIN)
// ================================================================

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateUserBody) => {
      const { data } = await apiClient.post<ApiResponse<AdminUser>>('/users', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ================================================================
// 사용자 수정 (ADMIN)
// ================================================================

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateUserBody) => {
      const { data } = await apiClient.patch<ApiResponse<AdminUser>>(`/users/${id}`, body);
      return data.data;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.setQueryData(['users', id], updated);
    },
  });
}

// ================================================================
// 사용자 비활성화 (soft delete, ADMIN)
// ================================================================

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ================================================================
// 승인 대기 사용자 목록
// ================================================================

export function usePendingUsers() {
  return useQuery({
    queryKey: ['users', 'pending'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<PendingUser[]>>('/users/pending');
      return data.data;
    },
  });
}

// ================================================================
// 사용자 승인
// ================================================================

export function useApproveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<ApiResponse<unknown>>(`/users/${id}/approve`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ================================================================
// 사용자 거부
// ================================================================

export function useRejectUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch<ApiResponse<unknown>>(`/users/${id}/reject`);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
