'use client';

import { useHealth } from '@/hooks/useHealth';

const statusDot: Record<string, string> = {
  ok: 'bg-green-500',
  unavailable: 'bg-red-500',
  not_connected: 'bg-gray-300',
};

const statusText: Record<string, string> = {
  ok: 'text-green-600',
  unavailable: 'text-red-500',
  not_connected: 'text-gray-400',
};

export function HealthCheck() {
  const { data, isLoading, isError, error, refetch, isFetching } = useHealth();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Backend 연결 상태</h2>
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-300 underline"
        >
          {isFetching ? '확인 중...' : '새로고침'}
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-300 animate-pulse" />
          확인 중...
        </div>
      )}

      {isError && !isLoading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-sm font-medium text-red-600">연결 실패</span>
          </div>
          <p className="text-xs text-red-400 bg-red-50 rounded-lg p-3 font-mono break-all">
            {error instanceof Error ? error.message : '알 수 없는 오류'}
          </p>
          <p className="text-xs text-gray-400">
            backend가 실행 중인지 확인하세요.{' '}
            <code className="font-mono bg-gray-100 px-1 rounded">localhost:4000</code>
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {/* 전체 상태 */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                data.status === 'ok' ? 'bg-green-500' : 'bg-yellow-400'
              }`}
            />
            <span className="text-sm font-medium text-gray-700">
              전체 상태:{' '}
              <span className={data.status === 'ok' ? 'text-green-600' : 'text-yellow-600'}>
                {data.status === 'ok' ? '정상' : '부분 연결'}
              </span>
            </span>
          </div>

          {/* 서비스별 상태 */}
          <div className="space-y-1.5">
            {Object.entries(data.checks).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${statusDot[value] ?? 'bg-gray-300'}`} />
                  <span className="text-sm text-gray-600 font-mono">{key}</span>
                </div>
                <span className={`text-xs font-medium ${statusText[value] ?? 'text-gray-400'}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-300">
            {new Date(data.timestamp).toLocaleString('ko-KR')}
          </p>
        </div>
      )}
    </div>
  );
}
