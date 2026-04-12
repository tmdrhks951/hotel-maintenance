/**
 * CSV 다운로드 유틸 — 한국어 Excel 호환 (BOM 포함).
 */
export function exportToCsv(filename: string, headers: string[], rows: string[][]) {
  // BOM for Korean Excel compatibility
  const BOM = '\uFEFF';
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => `"${(cell ?? '').replace(/"/g, '""')}"`).join(','),
    ),
  ].join('\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
