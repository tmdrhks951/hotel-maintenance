'use client';

import type { Priority } from '@/types';
import { PRIORITY_LABEL } from '@/types';

interface Props {
  priority: Priority;
  isEmergency?: boolean;
}

export default function PriorityBadge({ priority, isEmergency }: Props) {
  if (isEmergency) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        긴급
      </span>
    );
  }

  if (priority === 'NORMAL') return null;

  const color = priority === 'URGENT' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700';

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
