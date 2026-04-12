'use client';

import { useRef, useState, useEffect } from 'react';

interface PhotoUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  label?: string;
}

const MAX_VIDEO_SECONDS = 5;
const ACCEPT_TYPES = 'image/*,video/mp4,video/quicktime,video/webm,video/3gpp';

export default function PhotoUpload({ value, onChange, label }: PhotoUploadProps) {
  const cameraPhotoRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');

  const isVideo = value?.type.startsWith('video/') ?? false;
  const previewUrl = value ? URL.createObjectURL(value) : null;

  // 영상 길이 검증
  useEffect(() => {
    if (!value || !isVideo || !videoPreviewRef.current) return;

    const video = videoPreviewRef.current;
    function onLoaded() {
      if (video.duration > MAX_VIDEO_SECONDS) {
        setError(`영상은 최대 ${MAX_VIDEO_SECONDS}초까지 가능합니다 (현재 ${Math.round(video.duration)}초)`);
        onChange(null);
      } else {
        setError('');
      }
    }
    video.addEventListener('loadedmetadata', onLoaded);
    return () => video.removeEventListener('loadedmetadata', onLoaded);
  }, [value, isVideo, onChange]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError('');
    onChange(file);
    e.target.value = '';
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}

      {/* Hidden file inputs */}
      <input ref={cameraPhotoRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
      <input ref={cameraVideoRef} type="file" accept="video/*" capture="environment" onChange={handleFileChange} className="hidden" />
      <input ref={fileInputRef} type="file" accept={ACCEPT_TYPES} onChange={handleFileChange} className="hidden" />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-2">{error}</p>
      )}

      {!value ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
          <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          <p className="text-xs text-gray-500 mb-3">사진/영상을 촬영하거나 파일을 선택하세요</p>
          <p className="text-xs text-gray-400 mb-3">영상은 최대 {MAX_VIDEO_SECONDS}초</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={() => cameraPhotoRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              사진
            </button>
            <button
              type="button"
              onClick={() => cameraVideoRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              영상
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
              파일 선택
            </button>
          </div>
        </div>
      ) : (
        <div className="relative inline-block">
          {isVideo ? (
            <video
              ref={videoPreviewRef}
              src={previewUrl!}
              controls
              playsInline
              className="w-full max-w-xs h-48 object-cover rounded-lg border border-gray-200"
              onLoadedData={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); }}
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={previewUrl!}
              alt="첨부 사진 미리보기"
              className="w-full max-w-xs h-48 object-cover rounded-lg border border-gray-200"
              onLoad={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); }}
            />
          )}
          <button
            type="button"
            onClick={() => { setError(''); onChange(null); }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow-md transition-colors"
            aria-label="첨부 제거"
          >
            X
          </button>
          <p className="text-xs text-gray-500 mt-1 truncate max-w-xs">
            {isVideo ? '🎬 ' : '📷 '}{value.name}
          </p>
        </div>
      )}
    </div>
  );
}
