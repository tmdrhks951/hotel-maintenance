'use client';

import { useState, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import PhotoUpload from '@/components/ui/PhotoUpload';
import type { useCompleteWork } from '@/hooks/useQcQueue';
import type { FacilityRequestDetail, WorkAction } from '@/types';
import { WORK_ACTIONS, WORK_ACTION_ITEMS, generateCompletionText } from '@/types';
import { BTN } from '../buttonStyles';

interface Props {
  open: boolean;
  onClose: () => void;
  request: FacilityRequestDetail;
  completeWork: ReturnType<typeof useCompleteWork>;
  onRefresh: () => void;
}

/** Work completion form modal (작업유형/작업항목/비고/수리 후 사진) */
export default function CompleteWorkModal({
  open,
  onClose,
  request,
  completeWork,
  onRefresh,
}: Props) {
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
        onClose();
        setWorkAction('');
        setWorkItem('');
        setCompletionNote('');
        setAfterPhoto(null);
        onRefresh();
      },
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="작업 완료 등록" wide>
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
          <button type="button" className={BTN.secondary} onClick={onClose}>
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
  );
}
