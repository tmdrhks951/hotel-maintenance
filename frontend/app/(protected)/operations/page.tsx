import { redirect } from 'next/navigation';

// 빈 /operations 접근 시 운영팀 대시보드로 안전 리다이렉트
export default function OperationsIndexPage() {
  redirect('/operations/dashboard');
}
