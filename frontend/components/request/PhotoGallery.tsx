'use client';

import { useState } from 'react';
import type { Media } from '@/types';
import Modal from '@/components/ui/Modal';

function resolveUrl(url: string): string {
  if (url.startsWith('/')) return `http://localhost:4000${url}`;
  return url;
}

interface Props {
  media: Media[];
}

export default function PhotoGallery({ media }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const before = media.filter((m) => m.phase === 'BEFORE');
  const after = media.filter((m) => m.phase === 'AFTER');

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BEFORE */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            수리 전
          </h4>
          {before.length === 0 ? (
            <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-400">사진 없음</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {before.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLightbox(resolveUrl(m.url))}
                  className="focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-lg overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveUrl(m.url)}
                    alt={m.filename}
                    className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AFTER */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            수리 후
          </h4>
          {after.length === 0 ? (
            <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-400">사진 없음</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {after.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLightbox(resolveUrl(m.url))}
                  className="focus:outline-none focus:ring-2 focus:ring-blue-300 rounded-lg overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveUrl(m.url)}
                    alt={m.filename}
                    className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <Modal
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        title="사진 보기"
        wide
      >
        {lightbox && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lightbox}
            alt="확대 사진"
            className="w-full max-w-3xl rounded-lg"
          />
        )}
      </Modal>
    </>
  );
}
