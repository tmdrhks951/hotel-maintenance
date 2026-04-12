'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications';
import { useAppStore } from '@/stores/appStore';
import type { Notification } from '@/types';
import { NOTIFICATION_TYPE_LABEL } from '@/types';

// ================================================================
// 날짜 헬퍼
// ================================================================

function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

// ================================================================
// 타입별 아이콘
// ================================================================

function typeIcon(type: Notification['type']): string {
  switch (type) {
    case 'FACILITY_REQUEST_CREATED': return '📋';
    case 'EMERGENCY_SET': return '🚨';
    case 'WORKER_ASSIGNED': return '📅';
    case 'REQUEST_REOPENED': return '🔄';
    case 'OPERATIONS_CONFIRM_REQUESTED': return '✅';
    case 'COMMENT_CREATED': return '💬';
    case 'STATUS_CHANGED': return '🔁';
    default: return '🔔';
  }
}

// ================================================================
// 타입별 카드 색상 (전체 탭 — 색상으로 구분)
// ================================================================

function typeCardColor(type: Notification['type'], isRead: boolean, isToday_: boolean): string {
  const dim = isRead ? 'opacity-60' : '';
  // 금일 진행은 타입보다 우선해서 노란색
  if (isToday_) return `border-yellow-200 bg-yellow-50 ${dim}`;
  switch (type) {
    case 'FACILITY_REQUEST_CREATED':
      return `border-orange-100 bg-orange-50 ${dim}`;
    case 'WORKER_ASSIGNED':
      return `border-blue-200 bg-blue-50 ${dim}`;
    case 'OPERATIONS_CONFIRM_REQUESTED':
      return `border-green-200 bg-green-50 ${dim}`;
    case 'COMMENT_CREATED':
      return `border-purple-100 bg-purple-50 ${dim}`;
    case 'EMERGENCY_SET':
      return `border-red-200 bg-red-50 ${dim}`;
    case 'REQUEST_REOPENED':
      return `border-yellow-200 bg-yellow-50 ${dim}`;
    default:
      return `border-gray-200 bg-gray-50 ${dim}`;
  }
}

// ================================================================
// 필터 정의
// ================================================================

type FilterKey = 'all' | 'requested' | 'scheduled' | 'today' | 'completed';

const FILTERS: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all',       label: '전체',     icon: '🔔' },
  { key: 'requested', label: '일정 요청', icon: '📋' },
  { key: 'scheduled', label: '일정 확정', icon: '📅' },
  { key: 'today',     label: '금일 진행', icon: '🏃' },
  { key: 'completed', label: '작업 완료', icon: '✅' },
];

// 전체 탭 대상: 4개 카테고리의 합집합
function isWorkflowNotification(n: Notification): boolean {
  return (
    n.type === 'FACILITY_REQUEST_CREATED' ||
    n.type === 'WORKER_ASSIGNED' ||
    n.type === 'OPERATIONS_CONFIRM_REQUESTED' ||
    isToday(n.request?.plannedWorkDate)
  );
}

// ================================================================
// 알림 카드
// ================================================================

function NotificationCard({
  item,
  onRead,
  requestLink,
  colorByType,
}: {
  item: Notification;
  onRead: (id: string) => void;
  requestLink: string;
  colorByType: boolean;
}) {
  const cardClass = colorByType
    ? typeCardColor(item.type, item.isRead, isToday(item.request?.plannedWorkDate))
    : item.isRead
      ? 'border-gray-100 bg-white'
      : 'border-blue-200 bg-blue-50';

  return (
    <div
      onClick={() => { if (!item.isRead) onRead(item.id); }}
      className={`p-4 rounded-lg border transition-colors ${cardClass} ${!item.isRead ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0 mt-0.5">{typeIcon(item.type)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-gray-500 bg-white/80 rounded px-1.5 py-0.5">
                {NOTIFICATION_TYPE_LABEL[item.type]}
              </span>
              {!item.isRead && (
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              )}
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {new Date(item.createdAt).toLocaleString('ko-KR', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-gray-900">{item.title}</p>
          {item.message && (
            <p className="mt-0.5 text-xs text-gray-500">{item.message}</p>
          )}
          <div className="mt-2 flex items-center gap-3">
            {item.requestId && (
              <a
                href={requestLink}
                onClick={() => { if (!item.isRead) onRead(item.id); }}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                요청 보기 →
              </a>
            )}
            {!item.isRead && (
              <button
                onClick={(e) => { e.stopPropagation(); onRead(item.id); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                읽음 처리
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// 알림 페이지
// ================================================================

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const { user } = useAppStore();
  const requestLink = user?.role === 'OPERATIONS' ? '/operations' : '/qc';

  const { data: allNotifications = [], isLoading, refetch } = useNotifications(false);
  const markReadMutation = useMarkRead();
  const markAllReadMutation = useMarkAllRead();

  // 페이지 진입 시 전체 읽음 처리 → 벨 뱃지 즉시 소거
  const autoReadOnMountRef = useRef<boolean>(false);
  useEffect(() => {
    if (autoReadOnMountRef.current || isLoading) return;
    autoReadOnMountRef.current = true;
    markAllReadMutation.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const totalUnread = allNotifications.filter((n) => !n.isRead).length;

  // 필터별 목록
  const filtered = useMemo(() => {
    switch (activeFilter) {
      case 'requested':
        return allNotifications.filter((n) => n.type === 'FACILITY_REQUEST_CREATED');
      case 'scheduled':
        return allNotifications.filter((n) => n.type === 'WORKER_ASSIGNED');
      case 'today':
        return allNotifications.filter((n) => isToday(n.request?.plannedWorkDate));
      case 'completed':
        return allNotifications.filter((n) => n.type === 'OPERATIONS_CONFIRM_REQUESTED');
      default:
        // 전체 = 4개 카테고리 합집합
        return allNotifications.filter(isWorkflowNotification);
    }
  }, [allNotifications, activeFilter]);

  // 필터 칩 미읽음 뱃지 수
  function badgeCount(key: FilterKey): number {
    switch (key) {
      case 'all':
        return allNotifications.filter((n) => !n.isRead && isWorkflowNotification(n)).length;
      case 'requested':
        return allNotifications.filter((n) => !n.isRead && n.type === 'FACILITY_REQUEST_CREATED').length;
      case 'scheduled':
        return allNotifications.filter((n) => !n.isRead && n.type === 'WORKER_ASSIGNED').length;
      case 'today':
        return allNotifications.filter((n) => !n.isRead && isToday(n.request?.plannedWorkDate)).length;
      case 'completed':
        return allNotifications.filter((n) => !n.isRead && n.type === 'OPERATIONS_CONFIRM_REQUESTED').length;
      default:
        return 0;
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">알림</h1>
          {totalUnread > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">읽지 않은 알림 {totalUnread}건</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="text-xs text-gray-500 hover:text-blue-600 border border-gray-200 rounded px-2 py-1"
          >
            새로고침
          </button>
          {totalUnread > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded px-2 py-1 disabled:opacity-50"
            >
              {markAllReadMutation.isPending ? '처리 중...' : '전체 읽음'}
            </button>
          )}
        </div>
      </div>

      {/* 필터 칩 — 항상 4개 고정 */}
      <div className="flex gap-2 mb-4">
        {FILTERS.map(({ key, label, icon }) => {
          const unread = badgeCount(key);
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {unread > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${
                    isActive ? 'bg-white text-gray-800' : 'bg-blue-500 text-white'
                  }`}
                >
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 전체 탭 색상 범례 */}
      {activeFilter === 'all' && !isLoading && filtered.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-[10px] text-gray-400 self-center">색상 구분:</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 border border-orange-100 text-orange-600">일정 요청</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600">일정 확정</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700">금일 진행</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-600">작업 완료</span>
        </div>
      )}

      {/* 목록 */}
      {isLoading && (
        <div className="text-center py-16 text-sm text-gray-400">불러오는 중...</div>
      )}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-sm text-gray-400">해당 알림이 없습니다</div>
      )}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((n) => (
            <NotificationCard
              key={n.id}
              item={n}
              onRead={(id) => markReadMutation.mutate(id)}
              requestLink={requestLink}
              colorByType={activeFilter === 'all'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
