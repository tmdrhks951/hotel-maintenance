'use client';

import Modal from '@/components/ui/Modal';
import { BTN } from '../buttonStyles';

export interface ReasonModalConfig {
  title: string;
  label: string;
  onConfirm: (reason: string) => void;
}

interface Props {
  config: ReasonModalConfig | null;
  onClose: () => void;
  isPending: boolean;
  value: string;
  onChange: (value: string) => void;
}

/** Reason input modal */
export default function ReasonModal({ config, onClose, isPending, value, onChange }: Props) {
  return (
    <Modal open={!!config} onClose={onClose} title={config?.title ?? ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {config?.label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none mb-4"
      />
      <div className="flex justify-end gap-2">
        <button type="button" className={BTN.secondary} onClick={onClose}>
          취소
        </button>
        <button
          type="button"
          className={BTN.primary}
          disabled={!value.trim() || isPending}
          onClick={() => config?.onConfirm(value.trim())}
        >
          {isPending ? '처리 중...' : '확인'}
        </button>
      </div>
    </Modal>
  );
}
