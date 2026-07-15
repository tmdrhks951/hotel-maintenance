import { redirect } from 'next/navigation';

// 빈 /qc 접근 시 QC 목록(대기열)으로 안전 리다이렉트
export default function QcIndexPage() {
  redirect('/qc/queue');
}
