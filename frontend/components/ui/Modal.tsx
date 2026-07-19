'use client';

import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}

export default function Modal({ open, onClose, title, children, wide }: Props) {
  // ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 — 흐림 + 어둡게 (초점 유도) */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* 모달 카드 — 재질이 도착하는 등장 */}
      <div
        className={`relative bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-lg' : 'max-w-md'} max-h-[90vh] flex flex-col animate-modal-pop`}
        style={{ transformOrigin: 'center' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h3 className="text-[17px] font-semibold text-gray-900 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-black/[0.05] text-xl leading-none"
            aria-label="닫기"
          >
            &times;
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="px-6 pb-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
