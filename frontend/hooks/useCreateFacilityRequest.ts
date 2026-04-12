import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, CreateFacilityRequestResult } from '@/types';

export function useCreateFacilityRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await apiClient.post<ApiResponse<CreateFacilityRequestResult>>(
        '/facility-requests',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qc-queue'] });
      qc.invalidateQueries({ queryKey: ['operations-dashboard'] });
    },
  });
}
