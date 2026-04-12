import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  ApiResponse,
  RecurringSchedule,
  CreateScheduleBody,
  UpdateScheduleBody,
} from '@/types';

// ================================================================
// 반복 스케줄 목록
// ================================================================

export function useSchedules() {
  return useQuery<RecurringSchedule[]>({
    queryKey: ['schedules'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<RecurringSchedule[]>>('/recurring-schedules');
      return data.data;
    },
  });
}

// ================================================================
// 스케줄 생성
// ================================================================

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateScheduleBody) => {
      const { data } = await apiClient.post<ApiResponse<RecurringSchedule>>('/recurring-schedules', body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  });
}

// ================================================================
// 스케줄 수정 (이름에 _ 추가 — useUpdateSchedule 충돌 방지)
// ================================================================

export function useUpdateSchedule_() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateScheduleBody & { id: string }) => {
      const { data } = await apiClient.patch<ApiResponse<RecurringSchedule>>(`/recurring-schedules/${id}`, body);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  });
}

// ================================================================
// 스케줄 삭제
// ================================================================

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/recurring-schedules/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  });
}

// ================================================================
// 수동 생성
// ================================================================

export function useGenerateSchedules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ApiResponse<{ generated: number }>>('/recurring-schedules/generate');
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  });
}
