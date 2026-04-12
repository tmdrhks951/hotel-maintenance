import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, KpiSummary, AgingRequest, ReopenedResult, RepeatIssue, AdminFilters } from '@/types';

function buildParams(filters: AdminFilters): string {
  const p = new URLSearchParams();
  if (filters.branchId) p.set('branchId', filters.branchId);
  if (filters.startDate) p.set('startDate', filters.startDate);
  if (filters.endDate) p.set('endDate', filters.endDate);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function useKpiSummary(filters: AdminFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'kpi', 'summary', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<KpiSummary>>(
        `/admin/kpi/summary${buildParams(filters)}`,
      );
      return data.data;
    },
  });
}

export function useAgingRequests(filters: AdminFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'exceptions', 'aging', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<AgingRequest[]>>(
        `/admin/exceptions/aging${buildParams(filters)}`,
      );
      return data.data;
    },
  });
}

export function useReopenedRequests(filters: AdminFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'exceptions', 'reopened', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<ReopenedResult>>(
        `/admin/exceptions/reopened${buildParams(filters)}`,
      );
      return data.data;
    },
  });
}

export function useRepeatIssues(filters: AdminFilters = {}) {
  return useQuery({
    queryKey: ['admin', 'exceptions', 'repeat-issues', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<RepeatIssue[]>>(
        `/admin/exceptions/repeat-issues${buildParams(filters)}`,
      );
      return data.data;
    },
  });
}
