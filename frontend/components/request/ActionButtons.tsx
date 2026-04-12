'use client';

import { useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import {
  useQcReview,
  useQcVerify,
  useOperationsConfirm,
  useCompleteWork,
  useReopenFacilityRequest,
} from '@/hooks/useQcQueue';
import Modal from '@/components/ui/Modal';
import PhotoUpload from '@/components/ui/PhotoUpload';
import type {
  FacilityRequestDetail,
  FacilityRequestStatus,
  WorkAction,
  RequestCategory,
  Role,
} from '@/types';
import {
  WORK_ACTIONS,
  WORK_ACTION_ITEMS,
  generateCompletionText,
} from '@/types';

// ================================================================
// Helper: button style presets
// ================================================================

const BTN = {
  primary:
    'px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
  danger:
    'px-4 py-2 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
  warning:
    'px-4 py-2 text-sm font-medium rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
  secondary:
    'px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
  success:
    'px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
  teal:
    'px-4 py-2 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
} as const;

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
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [reasonModal, setReasonModal] = useState<{
    title: string;
    label: string;
    onConfirm: (reason: string) => void;
  } | null>(null);
  const [reasonText, setReasonText] = useState('');

  const [noteModal, setNoteModal] = useState<{
    title: string;
    onConfirm: (note: string) => void;
  } | null>(null);
  const [noteText, setNoteText] = useState('');

  const [showCompleteForm, setShowCompleteForm] = useState(false);

  // Work completion form states
  const [workAction, setWorkAction] = useState<WorkAction | ''>('');
  const [workItem, setWorkItem] = useState('');
  const [completionNote, setCompletionNote] = useState('');
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);

  // Available work items based on selected action + request category
  const availableItems = useMemo(() => {
    if (!workAction) return [];
    const byCategory = WORK_ACTION_ITEMS[workAction as WorkAction];
    return byCategory?.[request.category] ?? [];
  }, [workAction, request.category]);

  // Reset item when action changes
  function handleActionChange(action: WorkAction | '') {
    setWorkAction(action);
    setWorkItem('');
  }

  // ================================================================
  // Handlers
  // ================================================================

  function handleSimpleQcAction(
    action: 'RECEIVE' | 'MARK_REVIEW' | 'START_WORK' | 'CANCEL' | 'REVERT_TO_REQUESTED',
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

  function handleCompleteSubmit() {
    if (!workAction || !workItem) return;

    const generatedText = generateCompletionText(
      request.category,
      workAction as WorkAction,
      workItem,
    );

    const fd = new FormData();
    fd.append('workAction', workAction);
    fd.append('workItem', workItem);
    fd.append('generatedText', generatedText);
    if (completionNote.trim()) fd.append('note', completionNote.trim());
    if (afterPhoto) fd.append('image', afterPhoto);

    completeWork.mutate(fd, {
      onSuccess: () => {
        setShowCompleteForm(false);
        setWorkAction('');
        setWorkItem('');
        setCompletionNote('');
        setAfterPhoto(null);
        onRefresh();
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
        onClick={() => handleSimpleQcAction('RECEIVE', '수령 확인', '이 요청을 수령하시겠습니까?')}
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
        onClick={() => handleSimpleQcAction('RECEIVE', '수령 확인', '이 요청을 수령하시겠습니까?')}
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

  if (buttons.length === 0) return null;

  return (
    <>
      {/* Action button row */}
      <div className="flex flex-wrap gap-2">{buttons}</div>

      {/* Simple confirm modal */}
      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.title ?? ''}
      >
        <p className="text-sm text-gray-700 mb-4">{confirmModal?.message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={BTN.secondary}
            onClick={() => setConfirmModal(null)}
          >
            취소
          </button>
          <button
            type="button"
            className={BTN.primary}
            disabled={isPending}
            onClick={confirmModal?.onConfirm}
          >
            {isPending ? '처리 중...' : '확인'}
          </button>
        </div>
      </Modal>

      {/* Reason input modal */}
      <Modal
        open={!!reasonModal}
        onClose={() => setReasonModal(null)}
        title={reasonModal?.title ?? ''}
      >
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {reasonModal?.label}
        </label>
        <textarea
          value={reasonText}
          onChange={(e) => setReasonText(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={BTN.secondary}
            onClick={() => setReasonModal(null)}
          >
            취소
          </button>
          <button
            type="button"
            className={BTN.primary}
            disabled={!reasonText.trim() || isPending}
            onClick={() => reasonModal?.onConfirm(reasonText.trim())}
          >
            {isPending ? '처리 중...' : '확인'}
          </button>
        </div>
      </Modal>

      {/* Note (optional) modal */}
      <Modal
        open={!!noteModal}
        onClose={() => setNoteModal(null)}
        title={noteModal?.title ?? ''}
      >
        <label className="block text-sm font-medium text-gray-700 mb-1">
          메모 (선택사항)
        </label>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={3}
          placeholder="추가 메모를 입력하세요..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={BTN.secondary}
            onClick={() => setNoteModal(null)}
          >
            취소
          </button>
          <button
            type="button"
            className={BTN.primary}
            disabled={isPending}
            onClick={() => noteModal?.onConfirm(noteText.trim())}
          >
            {isPending ? '처리 중...' : '확인'}
          </button>
        </div>
      </Modal>

      {/* Work completion form modal */}
      <Modal
        open={showCompleteForm}
        onClose={() => setShowCompleteForm(false)}
        title="작업 완료 등록"
        wide
      >
        <div className="space-y-4">
          {/* Work Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              작업 유형
            </label>
            <select
              value={workAction}
              onChange={(e) => handleActionChange(e.target.value as WorkAction | '')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
            >
              <option value="">선택하세요</option>
              {WORK_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Work Item */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              작업 항목
            </label>
            <select
              value={workItem}
              onChange={(e) => setWorkItem(e.target.value)}
              disabled={!workAction}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">선택하세요</option>
              {availableItems.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Preview generated text */}
          {workAction && workItem && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600">
              {generateCompletionText(request.category, workAction as WorkAction, workItem)}
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비고 (선택사항)
            </label>
            <textarea
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              rows={2}
              placeholder="추가 메모를 입력하세요..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none"
            />
          </div>

          {/* After photo */}
          <PhotoUpload
            value={afterPhoto}
            onChange={setAfterPhoto}
            label="수리 후 사진/영상 (선택사항)"
          />

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              className={BTN.secondary}
              onClick={() => setShowCompleteForm(false)}
            >
              취소
            </button>
            <button
              type="button"
              className={BTN.teal}
              disabled={!workAction || !workItem || completeWork.isPending}
              onClick={handleCompleteSubmit}
            >
              {completeWork.isPending ? '등록 중...' : '작업 완료 등록'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
