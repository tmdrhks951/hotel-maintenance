'use client';

import type { StatusLog, FacilityRequestStatus } from '@/types';
import StatusBadge from '@/components/ui/StatusBadge';

const DOT_COLOR: Record<FacilityRequestStatus, string> = {
  PENDING:                'bg-blue-400',
  REQUESTED:              'bg-blue-400',
  REVIEW_REQUIRED:        'bg-yellow-400',
  RECEIVED:               'bg-indigo-400',
  SCHEDULED:              'bg-indigo-400',
  IN_PROGRESS:            'bg-purple-400',
  DONE_BY_QC:             'bg-teal-400',
  QC_VERIFIED:            'bg-teal-400',
  OPERATIONS_CONFIRMED:   'bg-green-400',
  CLOSED:                 'bg-green-500',
  COMPLETED:              'bg-green-500',
  REOPENED:               'bg-orange-400',
  CANCELLED:              'bg-gray-400',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${h}:${min}`;
}

interface Props {
  logs: StatusLog[];
}

export default function StatusTimeline({ logs }: Props) {
  const sorted = [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        상태 변경 이력이 없습니다.
      </p>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-200" />

      <ul className="space-y-4">
        {sorted.map((log, idx) => {
          const dotColor = DOT_COLOR[log.toStatus] ?? 'bg-gray-400';
          const isFirst = idx === 0;
          return (
            <li key={log.id} className="relative flex gap-3">
              {/* Dot */}
              <div
                className={`absolute -left-6 top-1 w-[18px] h-[18px] rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                  isFirst ? 'ring-2 ring-offset-1 ring-blue-200' : ''
                }`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={log.toStatus} />
                  <span className="text-xs text-gray-500">
                    {log.changedBy.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
                {log.reason && (
                  <p className="mt-1 text-xs text-gray-500 italic">
                    {log.reason}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
