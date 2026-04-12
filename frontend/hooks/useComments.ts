import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, Comment } from '@/types';

export function useComments(requestId: string | null) {
  return useQuery({
    queryKey: ['comments', requestId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Comment[]>>(
        `/facility-requests/${requestId}/comments`,
      );
      return data.data;
    },
    enabled: !!requestId,
  });
}

export function useCreateComment(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { content: string; parentId?: string }) => {
      const { data } = await apiClient.post<ApiResponse<Comment>>(
        `/facility-requests/${requestId}/comments`,
        body,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', requestId] });
    },
  });
}

export function useDeleteComment(requestId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      await apiClient.delete(`/facility-requests/${requestId}/comments/${commentId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', requestId] });
    },
  });
}
