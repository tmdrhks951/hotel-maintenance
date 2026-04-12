import type { StatusLog, FacilityRequestStatus } from '@/types';
import { REQUEST_STATUS_LABEL } from '@/types';

const STATUS_DOT_COLOR: Partial<Record<FacilityRequestStatus, string>> = {
  REQUESTED: 'bg-blue-300',
  REVIEW_REQUIRED: 'bg-yellow-400',
  RECEIVED: 'bg-blue-400',
  SCHEDULED: 'bg-indigo-400',
  IN_PROGRESS: 'bg-orange-400',
  DONE_BY_QC: 'bg-green-400',
  QC_VERIFIED: 'bg-purple-400',
  OPERATIONS_CONFIRMED: 'bg-teal-400',
  CLOSED: 'bg-gray-400',
  REOPENED: 'bg-red-300',
  CANCELLED: 'bg-red-400',
};

export function StatusTimeline({ logs }: { logs: StatusLog[] }) {
  if (logs.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        처리 이력
      </h4>
      <div>
        {logs.map((log, i) => {
          const dotColor = STATUS_DOT_COLOR[log.toStatus] ?? 'bg-gray-300';
          return (
            <div key={log.id} className="flex gap-3">
              {/* 타임라인 라인 + 점 */}
              <div className="flex flex-col items-center w-4 flex-shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full mt-0.5 ${dotColor}`} />
                {i < logs.length - 1 && (
                  <div className="w-px flex-1 bg-gray-200 mt-1 mb-0" style={{ minHeight: '16px' }} />
                )}
              </div>
              {/* 내용 */}
              <div className="pb-3 min-w-0 flex-1">
                <span className="text-xs font-medium text-gray-700">
                  {log.fromStatus ? REQUEST_STATUS_LABEL[log.fromStatus] : '(생성)'}{' '}
                  <span className="text-gray-400">→</span>{' '}
                  {REQUEST_STATUS_LABEL[log.toStatus]}
                </span>
                {log.reason && (
                  <p className="text-xs text-gray-400 mt-0.5">{log.reason}</p>
                )}
                <p className="text-xs text-gray-300 mt-0.5">
                  {log.changedBy.name} ·{' '}
                  {new Date(log.createdAt).toLocaleString('ko-KR', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
