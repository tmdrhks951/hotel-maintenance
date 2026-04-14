'use client';

import { useState } from 'react';
import type { Media } from '@/types';
import Modal from '@/components/ui/Modal';
import { API_BASE_URL } from '@/lib/api';

function resolveUrl(url: string): string {
  if (url.startsWith('/')) {
    // /uploads/xxx → API 서버 주소 기반 변환
    const base = API_BASE_URL.replace(/\/api\/v1$/, '');
    return `${base}${url}`;
  }
  return url;
}

function isVideoMedia(m: Media): boolean {
  return m.type === 'VIDEO' || /\.(mp4|mov|webm|3gp)$/i.test(m.url);
}

async function downloadMedia(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, '_blank');
  }
}

interface Props {
  media: Media[];
}

export default function PhotoGallery({ media }: Props) {
  const [lightbox, setLightbox] = useState<{ url: string; isVideo: boolean; filename: string } | null>(null);

  const before = media.filter((m) => m.phase === 'BEFORE');
  const after = media.filter((m) => m.phase === 'AFTER');

  function renderMediaGrid(items: Media[], emptyLabel: string) {
    if (items.length === 0) {
      return (
        <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-sm text-gray-400">{emptyLabel}</span>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-2">
        {items.map((m) => {
          const url = resolveUrl(m.url);
          const video = isVideoMedia(m);

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setLightbox({ url, isVideo: video, filename: m.filename })}
              className="relative focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-lg overflow-hidden"
            >
              {video ? (
                <>
                  <video
                    src={url}
                    className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  {/* 영상 아이콘 오버레이 */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/50 rounded-full p-2">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={url}
                  alt={m.filename}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">수리 전</h4>
          {renderMediaGrid(before, '사진/영상 없음')}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">수리 후</h4>
          {renderMediaGrid(after, '사진/영상 없음')}
        </div>
      </div>

      {/* Lightbox */}
      <Modal open={!!lightbox} onClose={() => setLightbox(null)} title="미디어 보기" wide>
        {lightbox && (
          <div className="flex flex-col items-center gap-3">
            {lightbox.isVideo ? (
              <video
                src={lightbox.url}
                controls
                autoPlay
                playsInline
                className="w-full max-w-3xl rounded-lg"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={lightbox.url} alt="확대 사진" className="w-full max-w-3xl rounded-lg" />
            )}
            <button
              onClick={() => downloadMedia(lightbox.url, lightbox.filename)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              다운로드
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}
