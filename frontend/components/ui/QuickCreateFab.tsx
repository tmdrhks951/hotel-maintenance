'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

/**
 * Floating Action Button — 역할별 빠른 액션.
 * OPERATIONS: 시설요청 등록 / 사진 촬영 / 영상 촬영 / 앨범
 * QC: 작업완료 사진 촬영 / 영상 촬영 / 앨범에서 선택
 */
export default function QuickCreateFab() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cameraPhotoRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);

  // QC, OPERATIONS 역할만 노출
  if (!user || (user.role !== 'QC' && user.role !== 'OPERATIONS')) return null;

  const isQC = user.role === 'QC';

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleCameraPhoto() {
    setOpen(false);
    cameraPhotoRef.current?.click();
  }

  function handleCameraVideo() {
    setOpen(false);
    cameraVideoRef.current?.click();
  }

  function handleAlbum() {
    setOpen(false);
    albumRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileUrls = Array.from(files).map((f) => URL.createObjectURL(f));

    if (isQC) {
      sessionStorage.setItem('fab_photos', JSON.stringify(fileUrls));
      sessionStorage.setItem('fab_photo_role', 'QC');
      router.push('/qc/verify?from=fab');
    } else {
      sessionStorage.setItem('fab_photos', JSON.stringify(fileUrls));
      sessionStorage.setItem('fab_photo_role', 'OPERATIONS');
      router.push('/requests/new?from=fab');
    }

    e.target.value = '';
  }

  const menuItems = isQC
    ? [
        { icon: '📷', label: '작업완료 사진 촬영', action: handleCameraPhoto },
        { icon: '🎬', label: '작업완료 영상 촬영', action: handleCameraVideo },
        { icon: '🖼️', label: '앨범에서 선택', action: handleAlbum },
      ]
    : [
        { icon: '📝', label: '시설요청 등록', action: () => { setOpen(false); router.push('/requests/new'); } },
        { icon: '📷', label: '사진 촬영', action: handleCameraPhoto },
        { icon: '🎬', label: '영상 촬영', action: handleCameraVideo },
        { icon: '🖼️', label: '앨범', action: handleAlbum },
      ];

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-40">
      {/* 숨겨진 파일 input */}
      <input ref={cameraPhotoRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelected} className="hidden" />
      <input ref={cameraVideoRef} type="file" accept="video/*" capture="environment" onChange={handleFileSelected} className="hidden" />
      <input ref={albumRef} type="file" accept="image/*,video/mp4,video/quicktime,video/webm" multiple onChange={handleFileSelected} className="hidden" />

      {/* 팝업 메뉴 */}
      {open && (
        <div className="absolute bottom-16 right-0 bg-white rounded-xl shadow-xl border border-gray-200 py-2 min-w-[200px] animate-in fade-in slide-in-from-bottom-2 duration-200">
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* FAB 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="빠른 메뉴"
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          open
            ? 'bg-gray-600 text-white rotate-45 focus:ring-gray-500'
            : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
        }`}
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
