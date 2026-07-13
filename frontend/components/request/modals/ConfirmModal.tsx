'use client';

import Modal from '@/components/ui/Modal';
import { BTN } from '../buttonStyles';

export interface ConfirmModalConfig {
  title: string;
  message: string;
  onConfirm: () => void;
}

interface Props {
  config: ConfirmModalConfig | null;
  onClose: () => void;
  isPending: boolean;
}

/** Simple confirm modal */
export default function ConfirmModal({ config, onClose, isPending }: Props) {
  return (
    <Modal open={!!config} onClose={onClose} title={config?.title ?? ''}>
      <p className="text-sm text-gray-700 mb-4">{config?.message}</p>
      <div className="flex justify-end gap-2">
        <button type="button" className={BTN.secondary} onClick={onClose}>
          취소
        </button>
        <button
          type="button"
          className={BTN.primary}
          disabled={isPending}
          onClick={config?.onConfirm}
        >
          {isPending ? '처리 중...' : '확인'}
        </button>
      </div>
    </Modal>
  );
}
