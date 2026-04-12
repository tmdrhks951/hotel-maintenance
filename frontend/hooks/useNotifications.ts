import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, Notification } from '@/types';

// ================================================================
// 알림 목록 조회
// ================================================================

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ['notifications', { unreadOnly }],
    queryFn: async () => {
      const params = unreadOnly ? '?unreadOnly=true' : '';
      const { data } = await apiClient.get<ApiResponse<Notification[]>>(
        `/notifications${params}`,
      );
      return data.data;
    },
  });
}

// ================================================================
// unread count
// SSE가 실시간 푸시를 담당하므로 폴링은 5분 간격 fallback으로만 유지
// ================================================================

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<{ count: number }>>(
        '/notifications/unread-count',
      );
      return data.data;
    },
    refetchInterval: 5 * 60_000, // 5분 — SSE 끊김 대비 fallback
  });
}

// ================================================================
// 개별 읽음 처리
// ================================================================

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.patch(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ================================================================
// 전체 읽음 처리
// ================================================================

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notifications/read-all');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
