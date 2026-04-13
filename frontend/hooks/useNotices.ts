import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  ApiResponse,
  NoticeListItem,
  NoticeDetail,
  CreateNoticeBody,
  UpdateNoticeBody,
} from '@/types';

// 목록
export function useNotices() {
  return useQuery({
    queryKey: ['notices'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<NoticeListItem[]>>('/notices');
      return data.data;
    },
  });
}

// 상세
export function useNotice(id: string | null) {
  return useQuery({
    queryKey: ['notices', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<NoticeDetail>>(`/notices/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

// 생성
export function useCreateNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateNoticeBody) => {
      const { data } = await apiClient.post<ApiResponse<NoticeDetail>>('/notices', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] });
    },
  });
}

// 수정
export function useUpdateNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateNoticeBody }) => {
      const { data } = await apiClient.patch<ApiResponse<NoticeDetail>>(`/notices/${id}`, body);
      return data.data;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['notices'] });
      qc.setQueryData(['notices', updated.id], updated);
    },
  });
}

// 삭제
export function useDeleteNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/notices/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] });
    },
  });
}
