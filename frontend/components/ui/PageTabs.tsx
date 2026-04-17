'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface PageTabItem {
  label: string;
  href: string;
}

/// [PATCH] 하이브리드 탭 — URL 분리 기반 페이지 네비게이션.
///   외관은 페이지 상단 탭이지만 각 탭은 별도 URL(Next.js 파일 라우트)로 이동한다.
///   새로고침/북마크/공유 가능, 페이지 파일 분리로 단일 파일 비대화 방지.
export default function PageTabs({ tabs }: { tabs: PageTabItem[] }) {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-5">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              active
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            ].join(' ')}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
