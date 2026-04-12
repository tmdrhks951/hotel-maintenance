import type { Media } from '@/types';

export function PhotoComparison({ media }: { media: Media[] }) {
  const before = media.filter((m) => m.phase === 'BEFORE');
  const after = media.filter((m) => m.phase === 'AFTER');

  if (before.length === 0 && after.length === 0) return null;

  if (before.length > 0 && after.length > 0) {
    return (
      <div className="mt-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-gray-400 mb-1 text-center">요청 사진</p>
            {before.map((m) => (
              <img
                key={m.id}
                src={m.url}
                alt="BEFORE"
                className="w-full rounded-lg object-cover aspect-square"
              />
            ))}
          </div>
          <div>
            <p className="text-xs text-green-600 mb-1 text-center">완료 사진</p>
            {after.map((m) => (
              <img
                key={m.id}
                src={m.url}
                alt="AFTER"
                className="w-full rounded-lg object-cover aspect-square border-2 border-green-200"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (before.length > 0) {
    return (
      <div className="mt-3">
        <p className="text-xs text-gray-400 mb-1">요청 사진</p>
        {before.map((m) => (
          <img
            key={m.id}
            src={m.url}
            alt="BEFORE"
            className="w-full rounded-lg object-cover max-h-48"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <p className="text-xs text-green-600 mb-1">완료 사진</p>
      {after.map((m) => (
        <img
          key={m.id}
          src={m.url}
          alt="AFTER"
          className="w-full rounded-lg object-cover max-h-48 border-2 border-green-200"
        />
      ))}
    </div>
  );
}
