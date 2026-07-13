'use client';

import Modal from '@/components/ui/Modal';
import { BTN } from '../buttonStyles';

interface Props {
  open: boolean;
  onClose: () => void;
  error: string;
  qcVisitDate: string;
  onQcVisitDateChange: (value: string) => void;
  estimatedDuration: string;
  onEstimatedDurationChange: (value: string) => void;
  maintenanceRequired: boolean | null;
  onMaintenanceRequiredChange: (value: boolean) => void;
  isPending: boolean;
  onSubmit: () => void;
}

/** STEP 12: QC 수령 폼 모달 (방문일시/예상소요/정비필요) */
export default function ReceiveModal({
  open,
  onClose,
  error,
  qcVisitDate,
  onQcVisitDateChange,
  estimatedDuration,
  onEstimatedDurationChange,
  maintenanceRequired,
  onMaintenanceRequiredChange,
  isPending,
  onSubmit,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title="QC 수령">
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* QC 방문 예정일시 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            QC 방문 예정일시 <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={qcVisitDate}
            onChange={(e) => onQcVisitDateChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
          />
        </div>

        {/* 예상 소요시간 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            예상 소요시간 (분) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            step={1}
            value={estimatedDuration}
            onChange={(e) => onEstimatedDurationChange(e.target.value)}
            placeholder="예: 30"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
          />
        </div>

        {/* 정비 필요 여부 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            정비 필요 여부 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onMaintenanceRequiredChange(true)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                maintenanceRequired === true
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              정비 필요
            </button>
            <button
              type="button"
              onClick={() => onMaintenanceRequiredChange(false)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                maintenanceRequired === false
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              정비 불필요
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" className={BTN.secondary} onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className={BTN.primary}
            disabled={isPending}
            onClick={onSubmit}
          >
            {isPending ? '처리 중...' : '수령 확인'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
