'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { apiClient } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ChangePasswordModal({ open, onClose, onSuccess }: Props) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    setError('');
    if (next.length < 8) {
      setError('새 비밀번호는 8자 이상이어야 합니다');
      return;
    }
    if (next !== confirm) {
      setError('새 비밀번호가 서로 일치하지 않습니다');
      return;
    }
    if (current === next) {
      setError('새 비밀번호가 기존 비밀번호와 동일합니다');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.patch('/users/me/password', {
        currentPassword: current,
        newPassword: next,
      });
      reset();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      setError(
        e.response?.data?.error?.message ??
          e.response?.data?.message ??
          '비밀번호 변경에 실패했습니다',
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="비밀번호 변경">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호</label>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 (8자 이상)</label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleClose}
            className="flex-1 text-sm border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !current || !next || !confirm}
            className="flex-1 text-sm bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '변경 중...' : '변경'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
