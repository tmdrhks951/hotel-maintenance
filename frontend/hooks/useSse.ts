'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/api';

/**
 * SSE 실시간 알림 연결 훅
 * - /notifications/stream 엔드포인트에 EventSource 연결
 * - notification 이벤트 수신 시 React Query 캐시 무효화 → 즉시 리페치
 * - 연결 끊김 시 자동 재연결 (3초 딜레이)
 */
export function useSse() {
  const qc = useQueryClient();
  const retryRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const token = localStorage.getItem('auth_access_token');
    if (!token) return;

    let es: EventSource | null = null;
    let unmounted = false;

    function connect() {
      if (unmounted) return;

      const baseUrl = API_BASE_URL.replace(/\/api\/v1$/, '');
      es = new EventSource(`${baseUrl}/api/v1/notifications/stream?token=${encodeURIComponent(token!)}`);

      es.addEventListener('notification', () => {
        qc.invalidateQueries({ queryKey: ['notifications'] });
        qc.invalidateQueries({ queryKey: ['unread-count'] });
      });

      es.addEventListener('connected', () => {
        // 연결 성공 — 재연결 타이머 정리
      });

      es.onerror = () => {
        es?.close();
        if (!unmounted) {
          retryRef.current = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      unmounted = true;
      es?.close();
      clearTimeout(retryRef.current);
    };
  }, [qc]);
}
