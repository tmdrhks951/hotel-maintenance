import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse } from '@/types';

// ================================================================
// 공지 타입 (로컬)
// ================================================================

export interface Notice {
  id: string;
  title: string;
  content: string;
  isPublished: boolean;
  branchId: string | null;
  branch: { id: string; name: string } | null;
  author: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoticeBody {
  title: string;
  content: string;
  branchId?: string | null;
  isPublished?: boolean;
}

export interface UpdateNoticeBody {
  title?: string;
  content?: string;
  branchId?: string | null;
  isPublished?: boolean;
}

// ================================================================
// 공지 목록
// ================================================================

export function useNotices() {
  return useQuery<Notice[]>({
    queryKey: ['notices'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Notice[]>>('/notices');
      return data.data;
    },
  });
}

// ================================================================
// 공지 상세
// ================================================================

export function useNotice(id: string | null) {
  return useQuery<Notice>({
    queryKey: ['notice', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Notice>>(`/notices/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

// ================================================================
// 공지 생성
// ================================================================

export function useCreateNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateNoticeBody) => {
      const { data } = await apiClient.post<ApiResponse<Notice>>('/notices', body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notices'] }),
  });
}

// ================================================================
// 공지 수정
// ================================================================

export function useUpdateNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateNoticeBody & { id: string }) => {
      const { data } = await apiClient.patch<ApiResponse<Notice>>(`/notices/${id}`, body);
      return data.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['notices'] });
      qc.invalidateQueries({ queryKey: ['notice', variables.id] });
    },
  });
}

// ================================================================
// 공지 삭제
// ================================================================

export function useDeleteNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/notices/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notices'] }),
  });
}
