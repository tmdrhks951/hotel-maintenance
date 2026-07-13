'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  useQcReview,
  useQcVerify,
  useOperationsConfirm,
  useCompleteWork,
  useReopenFacilityRequest,
} from '@/hooks/useQcQueue';
import type { FacilityRequestDetail, FacilityRequestStatus, Role } from '@/types';
import { BTN } from './buttonStyles';
import ConfirmModal, { type ConfirmModalConfig } from './modals/ConfirmModal';
import ReasonModal, { type ReasonModalConfig } from './modals/ReasonModal';
import NoteModal, { type NoteModalConfig } from './modals/NoteModal';
import CompleteWorkModal from './modals/CompleteWorkModal';
import ReceiveModal from './modals/ReceiveModal';

// ================================================================
// Props
// ================================================================

interface Props {
  request: FacilityRequestDetail;
  onRefresh: () => void;
}

export default function ActionButtons({ request, onRefresh }: Props) {
  const user = useAuthStore((s) => s.user);
  const role = user?.role as Role | undefined;

  // Mutations
  const qcReview = useQcReview(request.id);
  const qcVerify = useQcVerify(request.id);
  const opsConfirm = useOperationsConfirm(request.id);
  const completeWork = useCompleteWork(request.id);
  const reopenRequest = useReopenFacilityRequest(request.id);

  // Modal states
  const [confirmModal, setConfirmModal] = useState<ConfirmModalConfig | null>(null);

  const [reasonModal, setReasonModal] = useState<ReasonModalConfig | null>(null);
  const [reasonText, setReasonText] = useState('');

  const [noteModal, setNoteModal] = useState<NoteModalConfig | null>(null);
  const [noteText, setNoteText] = useState('');

  const [showCompleteForm, setShowCompleteForm] = useState(false);

  // STEP 12: QC RECEIVE form states
  const [showReceiveForm, setShowReceiveForm] = useState(false);
  const [qcVisitDate, setQcVisitDate] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState<string>('');
  const [maintenanceRequired, setMaintenanceRequired] = useState<boolean | null>(null);
  const [receiveError, setReceiveError] = useState('');

  // ================================================================
  // Handlers
  // ================================================================

  function handleSimpleQcAction(
    action: 'MARK_REVIEW' | 'START_WORK' | 'CANCEL' | 'REVERT_TO_REQUESTED',
    title: string,
    message: string,
  ) {
    setConfirmModal({
      title,
      message,
      onConfirm: () => {
        qcReview.mutate(
          { action },
          {
            onSuccess: () => {
              setConfirmModal(null);
              onRefresh();
            },
          },
        );
      },
    });
  }

  // STEP 12: QC 수령 — 방문일시/소요시간/정비필요 여부 필수 입력
  function openReceiveForm() {
    setQcVisitDate('');
    setEstimatedDuration('');
    setMaintenanceRequired(null);
    setReceiveError('');
    setShowReceiveForm(true);
  }

  function handleReceiveSubmit() {
    setReceiveError('');

    if (!qcVisitDate) {
      setReceiveError('QC 방문 예정일시를 입력해주세요');
      return;
    }
    const durationNum = parseInt(estimatedDuration, 10);
    if (!estimatedDuration || isNaN(durationNum) || durationNum <= 0) {
      setReceiveError('예상 소요시간(분)을 입력해주세요');
      return;
    }
    if (maintenanceRequired === null) {
      setReceiveError('정비 필요 여부를 선택해주세요');
      return;
    }

    // datetime-local -> ISO string
    const isoDate = new Date(qcVisitDate).toISOString();

    qcReview.mutate(
      {
        action: 'RECEIVE',
        qcVisitScheduledAt: isoDate,
        estimatedDuration: durationNum,
        maintenanceRequired,
      },
      {
        onSuccess: () => {
          setShowReceiveForm(false);
          onRefresh();
        },
        onError: (e: unknown) => {
          const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
          setReceiveError(msg ?? '수령 처리에 실패했습니다');
        },
      },
    );
  }

  function handleVerify() {
    setConfirmModal({
      title: '검증 승인',
      message: 'QC 작업 결과를 승인하시겠습니까?',
      onConfirm: () => {
        qcVerify.mutate(
          { action: 'VERIFY' },
          {
            onSuccess: () => {
              setConfirmModal(null);
              onRefresh();
            },
          },
        );
      },
    });
  }

  function handleQcReopen() {
    setReasonText('');
    setReasonModal({
      title: '재오픈',
      label: '재오픈 사유를 입력하세요',
      onConfirm: (reason) => {
        qcVerify.mutate(
          { action: 'REOPEN', note: reason },
          {
            onSuccess: () => {
              setReasonModal(null);
              onRefresh();
            },
          },
        );
      },
    });
  }

  function handleOpsConfirm() {
    setNoteText('');
    setNoteModal({
      title: '운영팀 확인',
      onConfirm: (note) => {
        opsConfirm.mutate(
          { note: note || undefined },
          {
            onSuccess: () => {
              setNoteModal(null);
              onRefresh();
            },
          },
        );
      },
    });
  }

  function handleReopen() {
    setReasonText('');
    setReasonModal({
      title: '재오픈',
      label: '재오픈 사유를 입력하세요',
      onConfirm: (reason) => {
        reopenRequest.mutate(
          { reason },
          {
            onSuccess: () => {
              setReasonModal(null);
              onRefresh();
            },
          },
        );
      },
    });
  }

  // ================================================================
  // [RESTORE] 긴급 지정 / 해제
  // master 브랜치 qc/page.tsx 에 있던 "🚨 긴급 처리 체크박스 + 긴급 사유"
  // 섹션이 main 리팩토링(queue + ActionButtons 분해) 과정에서 누락되어
  // 복원. 백엔드 API(qcReview — action 없으면 emergency/priority만 업데이트),
  // 타입(QcReviewBody.isEmergency/emergencyReason), hook(useQcReview) 은
  // 이미 완비되어 있어 UI 버튼만 연결하면 즉시 동작.
  // ================================================================
  function handleSetEmergency() {
    setReasonText('');
    setReasonModal({
      title: '긴급 지정',
      label: '긴급 사유를 입력하세요 (필수)',
      onConfirm: (reason) => {
        qcReview.mutate(
          { isEmergency: true, emergencyReason: reason },
          {
            onSuccess: () => {
              setReasonModal(null);
              onRefresh();
            },
          },
        );
      },
    });
  }

  function handleClearEmergency() {
    setConfirmModal({
      title: '긴급 해제',
      message: '이 요청의 긴급 플래그를 해제하시겠습니까?',
      onConfirm: () => {
        qcReview.mutate(
          { isEmergency: false },
          {
            onSuccess: () => {
              setConfirmModal(null);
              onRefresh();
            },
          },
        );
      },
    });
  }

  // ================================================================
  // Determine which buttons to show
  // ================================================================

  const status: FacilityRequestStatus = request.status;
  const isQc = role === 'QC';
  const isOps = role === 'OPERATIONS';
  const isAdmin = role === 'ADMIN';
  const isPending = qcReview.isPending || qcVerify.isPending || opsConfirm.isPending || completeWork.isPending || reopenRequest.isPending;

  const buttons: JSX.Element[] = [];

  if (status === 'REQUESTED' && isQc) {
    buttons.push(
      <button
        key="receive"
        type="button"
        disabled={isPending}
        className={BTN.primary}
        onClick={openReceiveForm}
      >
        수령
      </button>,
      <button
        key="mark-review"
        type="button"
        disabled={isPending}
        className={BTN.warning}
        onClick={() => handleSimpleQcAction('MARK_REVIEW', '판단 필요', '검토가 필요한 요청으로 표시하시겠습니까?')}
      >
        판단필요
      </button>,
    );
  }

  if (status === 'REVIEW_REQUIRED' && isQc) {
    buttons.push(
      <button
        key="receive-review"
        type="button"
        disabled={isPending}
        className={BTN.primary}
        onClick={openReceiveForm}
      >
        수령
      </button>,
      <button
        key="revert"
        type="button"
        disabled={isPending}
        className={BTN.secondary}
        onClick={() => handleSimpleQcAction('REVERT_TO_REQUESTED', '요청으로 되돌리기', '신규 요청 상태로 되돌리시겠습니까?')}
      >
        요청으로 되돌리기
      </button>,
    );
  }

  if (status === 'RECEIVED' && isQc) {
    buttons.push(
      <button
        key="start-work"
        type="button"
        disabled={isPending}
        className={BTN.primary}
        onClick={() => handleSimpleQcAction('START_WORK', '작업 시작', '작업을 시작하시겠습니까?')}
      >
        작업 시작
      </button>,
      <button
        key="cancel"
        type="button"
        disabled={isPending}
        className={BTN.danger}
        onClick={() => handleSimpleQcAction('CANCEL', '취소', '이 요청을 취소하시겠습니까?')}
      >
        취소
      </button>,
    );
  }

  if (status === 'SCHEDULED' && isQc) {
    buttons.push(
      <button
        key="start-work-sch"
        type="button"
        disabled={isPending}
        className={BTN.primary}
        onClick={() => handleSimpleQcAction('START_WORK', '작업 시작', '작업을 시작하시겠습니까?')}
      >
        작업 시작
      </button>,
    );
  }

  if (status === 'IN_PROGRESS' && isQc) {
    buttons.push(
      <button
        key="complete"
        type="button"
        disabled={isPending}
        className={BTN.teal}
        onClick={() => setShowCompleteForm(true)}
      >
        작업 완료
      </button>,
    );
  }

  if (status === 'DONE_BY_QC' && isQc) {
    buttons.push(
      <button
        key="verify"
        type="button"
        disabled={isPending}
        className={BTN.success}
        onClick={handleVerify}
      >
        검증 승인
      </button>,
      <button
        key="qc-reopen"
        type="button"
        disabled={isPending}
        className={BTN.warning}
        onClick={handleQcReopen}
      >
        재오픈
      </button>,
    );
  }

  if (status === 'QC_VERIFIED' && (isOps || isAdmin)) {
    buttons.push(
      <button
        key="ops-confirm"
        type="button"
        disabled={isPending}
        className={BTN.success}
        onClick={handleOpsConfirm}
      >
        운영팀 확인
      </button>,
    );
  }

  if ((status === 'CLOSED' || status === 'OPERATIONS_CONFIRMED') && (isQc || isOps || isAdmin)) {
    buttons.push(
      <button
        key="reopen"
        type="button"
        disabled={isPending}
        className={BTN.warning}
        onClick={handleReopen}
      >
        재오픈
      </button>,
    );
  }

  // [RESTORE] 긴급 지정 / 해제 버튼
  // - 종료/운영확정 상태를 제외한 모든 활성 상태에서 노출
  // - 권한: QC 또는 ADMIN
  // - 이미 긴급이면 "긴급 해제", 아니면 "🚨 긴급 지정"을 표시
  if (
    status !== 'CLOSED' &&
    status !== 'OPERATIONS_CONFIRMED' &&
    (isQc || isAdmin)
  ) {
    if (!request.isEmergency) {
      buttons.push(
        <button
          key="set-emergency"
          type="button"
          disabled={isPending}
          className={BTN.danger}
          onClick={handleSetEmergency}
          title="긴급 요청으로 지정"
        >
          🚨 긴급 지정
        </button>,
      );
    } else {
      buttons.push(
        <button
          key="clear-emergency"
          type="button"
          disabled={isPending}
          className={BTN.secondary}
          onClick={handleClearEmergency}
          title="긴급 플래그 해제"
        >
          긴급 해제
        </button>,
      );
    }
  }

  if (buttons.length === 0) return null;

  return (
    <>
      {/* Action button row */}
      <div className="flex flex-wrap gap-2">{buttons}</div>

      {/* Simple confirm modal */}
      <ConfirmModal
        config={confirmModal}
        onClose={() => setConfirmModal(null)}
        isPending={isPending}
      />

      {/* Reason input modal */}
      <ReasonModal
        config={reasonModal}
        onClose={() => setReasonModal(null)}
        isPending={isPending}
        value={reasonText}
        onChange={setReasonText}
      />

      {/* Note (optional) modal */}
      <NoteModal
        config={noteModal}
        onClose={() => setNoteModal(null)}
        isPending={isPending}
        value={noteText}
        onChange={setNoteText}
      />

      {/* Work completion form modal */}
      <CompleteWorkModal
        open={showCompleteForm}
        onClose={() => setShowCompleteForm(false)}
        request={request}
        completeWork={completeWork}
        onRefresh={onRefresh}
      />

      {/* STEP 12: QC 수령 폼 모달 */}
      <ReceiveModal
        open={showReceiveForm}
        onClose={() => setShowReceiveForm(false)}
        error={receiveError}
        qcVisitDate={qcVisitDate}
        onQcVisitDateChange={setQcVisitDate}
        estimatedDuration={estimatedDuration}
        onEstimatedDurationChange={setEstimatedDuration}
        maintenanceRequired={maintenanceRequired}
        onMaintenanceRequiredChange={setMaintenanceRequired}
        isPending={qcReview.isPending}
        onSubmit={handleReceiveSubmit}
      />
    </>
  );
}
