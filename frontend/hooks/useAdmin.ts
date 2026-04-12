import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  ApiResponse,
  KpiSummary,
  AgingRequest,
  ReopenedResult,
  RepeatIssue,
  AdminFilters,
} from '@/types';

// ================================================================
// KPI 요약
// ================================================================

export function useKpiSummary(filters: AdminFilters) {
  return useQuery<KpiSummary>({
    queryKey: ['admin-kpi', filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const { data } = await apiClient.get<ApiResponse<KpiSummary>>('/admin/kpi/summary', { params });
      return data.data;
    },
  });
}

// ================================================================
// 장기 미처리 건
// ================================================================

export function useAgingRequests(filters: AdminFilters) {
  return useQuery<AgingRequest[]>({
    queryKey: ['admin-aging', filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const { data } = await apiClient.get<ApiResponse<AgingRequest[]>>('/admin/exceptions/aging', { params });
      return data.data;
    },
  });
}

// ================================================================
// 재오픈 건
// ================================================================

export function useReopenedRequests(filters: AdminFilters) {
  return useQuery<ReopenedResult>({
    queryKey: ['admin-reopened', filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const { data } = await apiClient.get<ApiResponse<ReopenedResult>>('/admin/exceptions/reopened', { params });
      return data.data;
    },
  });
}

// ================================================================
// 반복 이슈
// ================================================================

export function useRepeatIssues(filters: AdminFilters) {
  return useQuery<RepeatIssue[]>({
    queryKey: ['admin-repeat', filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const { data } = await apiClient.get<ApiResponse<RepeatIssue[]>>('/admin/exceptions/repeat-issues', { params });
      return data.data;
    },
  });
}
