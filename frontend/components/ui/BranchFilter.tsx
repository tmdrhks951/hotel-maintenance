'use client';

import { useBranches } from '@/hooks/useBranches';

interface Props {
  value: string | null;
  onChange: (branchId: string | null) => void;
}

export default function BranchFilter({ value, onChange }: Props) {
  const { data: branches } = useBranches(true);

  const flat = (branches ?? []).flatMap((b) => {
    const children = b.children ?? [];
    if (children.length === 0) return [b];
    return [b]; // 부모만 표시
  });

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">전체 지점</option>
      {flat.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  );
}
