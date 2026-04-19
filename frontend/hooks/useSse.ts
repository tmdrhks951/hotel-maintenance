'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/api';

/**
 * SSE 실시간 알림 연결 훅
 * - /notifications/stream 엔드포인트에 EventSource 연결
 * - notification 이벤트 수신 시 React Query 캐시 무효화 → 즉시 리페치
 * - 연결 끊김 시 자동 재연결 (3초 딜레이)
 *
 * [FIX] 이전 구현은 useEffect 진입 시 토큰을 1회만 읽어 캡처했음 → axios 인터셉터가
 *       만료된 access token을 refresh 해서 localStorage 를 업데이트해도, SSE는 옛
 *       토큰으로 계속 재연결 시도하여 401 Unauthorized 무한 루프를 유발함.
 *       이제는 매 connect 시점마다 localStorage 에서 최신 토큰을 다시 읽는다.
 */
export function useSse() {
  const qc = useQueryClient();
  const retryRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    let es: EventSource | null = null;
    let unmounted = false;

    function connect() {
      if (unmounted) return;

      // [FIX] 매 재연결 시점에 최신 토큰을 다시 읽는다.
      const token = localStorage.getItem('auth_access_token');
      if (!token) {
        // 토큰이 사라졌거나 refresh 실패 후 로그아웃 상태 → 재시도하지 않음.
        // 사용자가 재로그인하면 useSse 가 다시 마운트되며 연결이 복구된다.
        return;
      }

      const baseUrl = API_BASE_URL.replace(/\/api\/v1$/, '');
      es = new EventSource(
        `${baseUrl}/api/v1/notifications/stream?token=${encodeURIComponent(token)}`,
      );

      es.addEventListener('notification', () => {
        qc.invalidateQueries({ queryKey: ['notifications'] });
        qc.invalidateQueries({ queryKey: ['unread-count'] });
      });

      es.addEventListener('connected', () => {
        // 연결 성공 — 재연결 타이머는 onerror 경로에서만 쓰이므로 특별히 리셋 불필요
      });

      es.onerror = () => {
        es?.close();
        es = null;
        if (!unmounted) {
          // 3초 후 재연결 — 이때 다시 최신 토큰을 읽어 유효하면 재연결 시도,
          // 유효하지 않으면 connect() 초입에서 조용히 return.
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
