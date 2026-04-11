'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, getStoredUser } from '@/lib/auth';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    const user = getStoredUser();
    if (user?.role === 'OPERATIONS') {
      router.replace('/camera');
    } else if (user?.role === 'QC') {
      router.replace('/qc');
    } else {
      router.replace('/branches');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-400">이동 중...</p>
    </div>
  );
}
