import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  ApiResponse,
  ManualListItem,
  ManualDetail,
  CreateManualBody,
  UpdateManualBody,
} from '@/types';

// 목록
export function useManuals() {
  return useQuery({
    queryKey: ['manuals'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ManualListItem[]>>('/manuals');
      return data.data;
    },
  });
}

// 상세
export function useManual(id: string | null) {
  return useQuery({
    queryKey: ['manuals', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ManualDetail>>(`/manuals/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

// 생성
export function useCreateManual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateManualBody) => {
      const { data } = await apiClient.post<ApiResponse<ManualDetail>>('/manuals', body);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manuals'] });
    },
  });
}

// 수정
export function useUpdateManual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateManualBody }) => {
      const { data } = await apiClient.patch<ApiResponse<ManualDetail>>(`/manuals/${id}`, body);
      return data.data;
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['manuals'] });
      qc.setQueryData(['manuals', updated.id], updated);
    },
  });
}

// 삭제
export function useDeleteManual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/manuals/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['manuals'] });
    },
  });
}
