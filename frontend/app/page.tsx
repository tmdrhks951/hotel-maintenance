'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_access_token');
    const userStr = localStorage.getItem('auth_user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        switch (user.role) {
          case 'QC': router.replace('/qc/queue'); break;
          case 'OPERATIONS': router.replace('/operations/dashboard'); break;
          case 'ADMIN': router.replace('/admin/dashboard'); break;
          case 'VENDOR': router.replace('/vendor/assignments'); break;
          default: router.replace('/login');
        }
      } catch {
        router.replace('/login');
      }
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </main>
  );
}
