'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

/**
 * Floating Action Button — 빠른 요청 등록.
 * QC / OPERATIONS 역할만 표시.
 */
export default function QuickCreateFab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  // QC, OPERATIONS 역할만 노출
  if (!user || (user.role !== 'QC' && user.role !== 'OPERATIONS')) return null;

  return (
    <button
      onClick={() => router.push('/requests/new')}
      aria-label="요청 등록"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      {/* Plus icon */}
      <svg
        className="w-7 h-7"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
    </button>
  );
}
