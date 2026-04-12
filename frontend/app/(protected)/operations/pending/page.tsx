'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOperationsPending, useOperationsConfirm } from '@/hooks/useQcQueue';
import BranchFilter from '@/components/ui/BranchFilter';
import StatusBadge from '@/components/ui/StatusBadge';
import PriorityBadge from '@/components/ui/PriorityBadge';
import Modal from '@/components/ui/Modal';
import { REQUEST_CATEGORY_LABEL } from '@/types';
import type { OperationsCard } from '@/types';

// ================================================================
// 유틸
// ================================================================

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

// ================================================================
// 확인 대기 카드 (확인 버튼 포함)
// ================================================================

function PendingCard({
  card,
  onConfirmClick,
}: {
  card: OperationsCard;
  onConfirmClick: (card: OperationsCard) => void;
}) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/requests/${card.id}`)}
      className="bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{card.title}</h4>
        <PriorityBadge priority={card.priority} isEmergency={card.isEmergency} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">{card.branch.name}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {REQUEST_CATEGORY_LABEL[card.category]}
        </span>
        <StatusBadge status={card.status} />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{card.assignedTo ? card.assignedTo.name : '미배정'}</span>
        <span>{card.qcVerifiedAt ? timeAgo(card.qcVerifiedAt) : timeAgo(card.updatedAt)}</span>
      </div>

      {/* 확인 버튼 */}
      <div className="pt-1 border-t border-gray-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConfirmClick(card);
          }}
          className="w-full text-xs py-1.5 rounded bg-green-50 text-green-700 font-medium hover:bg-green-100"
        >
          확인
        </button>
      </div>
    </div>
  );
}

// ================================================================
// 최근 종료 카드 (읽기 전용)
// ================================================================

function ClosedCard({ card }: { card: OperationsCard }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/requests/${card.id}`)}
      className="bg-white border border-gray-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm hover:border-gray-300 transition-all space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{card.title}</h4>
        <PriorityBadge priority={card.priority} isEmergency={card.isEmergency} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">{card.branch.name}</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
          {REQUEST_CATEGORY_LABEL[card.category]}
        </span>
        <StatusBadge status={card.status} />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{card.operationsConfirmedBy?.name ?? '-'}</span>
        <span>{card.operationsConfirmedAt ? timeAgo(card.operationsConfirmedAt) : '-'}</span>
      </div>
    </div>
  );
}

// ================================================================
// 확인 모달 내부 — useMutation 래퍼
// ================================================================

function ConfirmModalContent({
  card,
  onClose,
}: {
  card: OperationsCard;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const confirm = useOperationsConfirm(card.id);

  const handleSubmit = () => {
    confirm.mutate({ note: note.trim() || undefined }, { onSuccess: () => onClose() });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700">
        <strong>{card.title}</strong> 요청을 확인 처리합니다.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="메모 (선택사항)"
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={confirm.isPending}
          className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {confirm.isPending ? '처리 중...' : '확인'}
        </button>
      </div>
    </div>
  );
}

// ================================================================
// 메인 페이지
// ================================================================

export default function OperationsPendingPage() {
  const [branchId, setBranchId] = useState<string | null>(null);
  const { data, isLoading } = useOperationsPending(branchId ?? undefined);
  const [selectedCard, setSelectedCard] = useState<OperationsCard | null>(null);

  const pendingCards = data?.pending ?? [];
  const recentClosed = data?.recentClosed ?? [];

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">확인 대기</h1>
        <BranchFilter value={branchId} onChange={setBranchId} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* 확인 대기 섹션 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-yellow-500" />
              <h2 className="text-sm font-bold text-gray-900">확인 대기</h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                {pendingCards.length}
              </span>
            </div>
            {pendingCards.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">데이터가 없습니다</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingCards.map((c) => (
                  <PendingCard key={c.id} card={c} onConfirmClick={setSelectedCard} />
                ))}
              </div>
            )}
          </section>

          {/* 최근 종료 섹션 */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-green-500" />
              <h2 className="text-sm font-bold text-gray-900">최근 종료</h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                {recentClosed.length}
              </span>
            </div>
            {recentClosed.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">데이터가 없습니다</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentClosed.map((c) => (
                  <ClosedCard key={c.id} card={c} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 확인 모달 */}
      <Modal
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        title="운영팀 확인"
      >
        {selectedCard && (
          <ConfirmModalContent
            card={selectedCard}
            onClose={() => setSelectedCard(null)}
          />
        )}
      </Modal>
    </div>
  );
}
