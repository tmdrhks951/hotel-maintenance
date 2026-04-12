import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, Location } from '@/types';

export function useLocations(branchId: string | null) {
  return useQuery<Location[]>({
    queryKey: ['locations', branchId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Location[]>>(`/branches/${branchId}/locations`);
      return data.data;
    },
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  });
}
