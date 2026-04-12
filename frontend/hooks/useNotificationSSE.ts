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

    // 새 알림 수신
    es.addEventListener('notification', (e: MessageEvent) => {
      // 알림 뱃지 갱신
      qc.invalidateQueries({ queryKey: ['notifications'] });

      // 작업 큐도 갱신 (알림이 상태 전이와 함께 오기 때문)
      try {
        const payload = JSON.parse(e.data) as { type?: string };
        const type = payload.type ?? '';

        // QC 관련 알림 → QC 큐 갱신
        if (
          type.includes('ASSIGNED') ||
          type.includes('SCHEDULED') ||
          type.includes('REVIEW') ||
          type.includes('QC')
        ) {
          qc.invalidateQueries({ queryKey: ['qc-queue'] });
          qc.invalidateQueries({ queryKey: ['qc-completed'] });
        }

        // 운영팀 관련 알림 → 운영팀 대시보드 갱신
        if (
          type.includes('COMPLETED') ||
          type.includes('VERIFIED') ||
          type.includes('OPERATIONS')
        ) {
          qc.invalidateQueries({ queryKey: ['operations-dashboard'] });
        }

        // 모든 알림 → 안전하게 전체 작업 큐 갱신
        qc.invalidateQueries({ queryKey: ['qc-queue'] });
        qc.invalidateQueries({ queryKey: ['operations-dashboard'] });
      } catch {
        // JSON 파싱 실패 시 기본 갱신만
        qc.invalidateQueries({ queryKey: ['qc-queue'] });
        qc.invalidateQueries({ queryKey: ['operations-dashboard'] });
      }
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
