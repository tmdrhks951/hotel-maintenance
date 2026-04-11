import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, Location, LocationType } from '@/types';

// ----------------------------------------------------------------
// 목록 (Branch 하위)
// ----------------------------------------------------------------

export function useLocations(branchId: string, type?: LocationType) {
  return useQuery({
    queryKey: ['locations', branchId, { type }],
    queryFn: async () => {
      const params = type ? { type } : {};
      const { data } = await apiClient.get<ApiResponse<Location[]>>(
        `/branches/${branchId}/locations`,
        { params },
      );
      return data.data;
    },
    enabled: !!branchId,
  });
}

// ----------------------------------------------------------------
// 생성
// ----------------------------------------------------------------

export interface CreateLocationDto {
  name: string;
  type: LocationType;
  code?: string;
}

export function useCreateLocation(branchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateLocationDto) => {
      const { data } = await apiClient.post<ApiResponse<Location>>(
        `/branches/${branchId}/locations`,
        dto,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations', branchId] });
      qc.invalidateQueries({ queryKey: ['branches', branchId] });
    },
  });
}

// ----------------------------------------------------------------
// 수정
// ----------------------------------------------------------------

export interface UpdateLocationDto {
  name?: string;
  code?: string;
  isActive?: boolean;
}

export function useUpdateLocation(branchId: string, locationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateLocationDto) => {
      const { data } = await apiClient.patch<ApiResponse<Location>>(
        `/locations/${locationId}`,
        dto,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations', branchId] });
    },
  });
}
