'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/**
 * SSE 실시간 알림 훅
 * - /notifications/stream 엔드포인트에 EventSource로 연결
 * - notification 이벤트 수신 시 관련 TanStack Query 캐시 자동 무효화
 * - 연결 오류 시 EventSource가 자동 재연결 (브라우저 기본 동작)
 */
export function useNotificationSSE(enabled = true) {
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const token = getAccessToken();
    if (!token) return;

    const url = `${API_BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    // 연결 성공
    es.addEventListener('connected', () => {
      console.debug('[SSE] 알림 스트림 연결됨');
    });

    // 새 알림 수신 — 타입 구분 없이 모든 작업 큐 즉시 강제 갱신
    es.addEventListener('notification', () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['qc-queue'] });
      qc.invalidateQueries({ queryKey: ['qc-completed'] });
      qc.invalidateQueries({ queryKey: ['operations-dashboard'] });
    });

    // ping — 무시 (연결 유지 전용)
    es.addEventListener('ping', () => {});

    // 오류 — EventSource가 자동 재연결하므로 별도 처리 불필요
    es.onerror = () => {
      console.debug('[SSE] 연결 오류 — 자동 재연결 시도');
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [enabled, qc]);
}
