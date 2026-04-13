import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  ApiResponse,
  RecurringSchedule,
  CreateScheduleBody,
  UpdateScheduleBody,
} from '@/types';

const KEY = ['recurring-schedules'];

export function useRecurringSchedules(branchId?: string) {
  return useQuery({
    queryKey: [...KEY, branchId],
    queryFn: async () => {
      const params = branchId ? `?branchId=${branchId}` : '';
      const { data } = await apiClient.get<ApiResponse<RecurringSchedule[]>>(
        `/recurring-schedules${params}`,
      );
      return data.data;
    },
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateScheduleBody) => {
      const { data } = await apiClient.post<ApiResponse<RecurringSchedule>>(
        '/recurring-schedules',
        body,
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateScheduleBody }) => {
      const { data } = await apiClient.patch<ApiResponse<RecurringSchedule>>(
        `/recurring-schedules/${id}`,
        body,
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/recurring-schedules/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useGenerateSchedules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ApiResponse<{ createdCount: number; checkedCount: number }>>(
        '/recurring-schedules/generate',
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['qc-queue'] });
    },
  });
}
