import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, Notification } from '@/types';

export function useNotifications(unreadOnly?: boolean) {
  return useQuery<Notification[]>({
    queryKey: ['notifications', unreadOnly],
    queryFn: async () => {
      const params = unreadOnly ? { unreadOnly: 'true' } : {};
      const { data } = await apiClient.get<ApiResponse<Notification[]>>('/notifications', { params });
      return data.data;
    },
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery<number>({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<number>>('/notifications/unread-count');
      return data.data;
    },
    refetchInterval: 15_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notifications/read-all');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });
}
