'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUnreadCount, useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications';
import { NOTIFICATION_TYPE_LABEL } from '@/types';
import type { Notification, NotificationType } from '@/types';

// ================================================================
// 유틸
// ================================================================

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

const TYPE_COLOR: Record<NotificationType, string> = {
  FACILITY_REQUEST_CREATED: 'bg-blue-500',
  COMMENT_CREATED: 'bg-indigo-500',
  STATUS_CHANGED: 'bg-purple-500',
  EMERGENCY_SET: 'bg-red-500',
  WORKER_ASSIGNED: 'bg-yellow-500',
  REQUEST_REOPENED: 'bg-orange-500',
  OPERATIONS_CONFIRM_REQUESTED: 'bg-green-500',
};

// ================================================================
// 알림 항목
// ================================================================

function NotificationItem({
  notification,
  onSelect,
}: {
  notification: Notification;
  onSelect: (n: Notification) => void;
}) {
  return (
    <button
      onClick={() => onSelect(notification)}
      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 ${
        !notification.isRead ? 'bg-blue-50/40' : ''
      }`}
    >
      {/* 타입 컬러 닷 */}
      <div className="flex-shrink-0 mt-1">
        <div className={`w-2 h-2 rounded-full ${TYPE_COLOR[notification.type] ?? 'bg-gray-400'}`} />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">
            {NOTIFICATION_TYPE_LABEL[notification.type] ?? notification.type}
          </span>
          {!notification.isRead && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-sm text-gray-900 font-medium truncate mt-0.5">{notification.title}</p>
        {notification.message && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{notification.message}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{timeAgo(notification.createdAt)}</p>
      </div>
    </button>
  );
}

// ================================================================
// 메인 컴포넌트
// ================================================================

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount } = useUnreadCount();
  const { data: notifications } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const displayCount = unreadCount ?? 0;
  const displayList = (notifications ?? []).slice(0, 20);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleSelect(n: Notification) {
    if (!n.isRead) {
      markRead.mutate(n.id);
    }
    setOpen(false);
    if (n.requestId) {
      router.push(`/requests/${n.requestId}`);
    }
  }

  function handleMarkAllRead() {
    markAllRead.mutate();
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* 벨 아이콘 버튼 */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-1.5 text-gray-400 hover:text-gray-600"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {displayCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {displayCount > 99 ? '99+' : displayCount}
          </span>
        )}
      </button>

      {/* 드롭다운 패널 */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[480px] flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">알림</h3>
            {displayCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
              >
                모두 읽음
              </button>
            )}
          </div>

          {/* 목록 */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {displayList.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-gray-400">알림이 없습니다</p>
              </div>
            ) : (
              displayList.map((n) => (
                <NotificationItem key={n.id} notification={n} onSelect={handleSelect} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
