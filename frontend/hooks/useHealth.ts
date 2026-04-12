import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface HealthResponse {
  success: boolean;
  status: 'ok' | 'degraded';
  checks: Record<string, string>;
  timestamp: string;
}

async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>('/health');
  return data;
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000, // 30초마다 자동 polling
    retry: 1,
  });
}
