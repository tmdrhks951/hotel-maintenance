'use client';

import type { FacilityRequestStatus } from '@/types';
import { REQUEST_STATUS_LABEL } from '@/types';

const COLOR_MAP: Record<FacilityRequestStatus, string> = {
  PENDING:                'bg-blue-50 text-blue-700',
  REQUESTED:              'bg-blue-50 text-blue-700',
  REVIEW_REQUIRED:        'bg-yellow-50 text-yellow-700',
  RECEIVED:               'bg-indigo-50 text-indigo-700',
  SCHEDULED:              'bg-indigo-50 text-indigo-700',
  IN_PROGRESS:            'bg-purple-50 text-purple-700',
  DONE_BY_QC:             'bg-teal-50 text-teal-700',
  QC_VERIFIED:            'bg-teal-50 text-teal-700',
  OPERATIONS_CONFIRMED:   'bg-green-50 text-green-700',
  CLOSED:                 'bg-green-50 text-green-700',
  COMPLETED:              'bg-green-50 text-green-700',
  REOPENED:               'bg-orange-50 text-orange-700',
  CANCELLED:              'bg-gray-100 text-gray-500',
};

export default function StatusBadge({ status }: { status: FacilityRequestStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ring-black/[0.04] ${COLOR_MAP[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {REQUEST_STATUS_LABEL[status] ?? status}
    </span>
  );
}
