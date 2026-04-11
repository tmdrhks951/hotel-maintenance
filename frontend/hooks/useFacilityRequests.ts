import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type {
  ApiResponse,
  DuplicateCheckResult,
  CreateFacilityRequestResult,
  RequestCategory,
} from '@/types';

// ================================================================
// 중복 확인 — 등록 전 사전 체크 (수동 트리거)
// ================================================================

export async function checkDuplicates(
  branchId: string,
  locationId?: string,
): Promise<DuplicateCheckResult> {
  const params = new URLSearchParams({ branchId });
  if (locationId) params.append('locationId', locationId);

  const { data } = await apiClient.get<ApiResponse<DuplicateCheckResult>>(
    `/facility-requests/duplicate-check?${params.toString()}`,
  );
  return data.data;
}

// ================================================================
// 요청 생성 — multipart/form-data
// ================================================================

export interface CreateFacilityRequestInput {
  branchId: string;
  locationId?: string;
  category: RequestCategory;
  description: string;
  imageFile?: File;
}

export function useCreateFacilityRequest() {
  return useMutation({
    mutationFn: async (input: CreateFacilityRequestInput) => {
      const formData = new FormData();
      formData.append('branchId', input.branchId);
      formData.append('category', input.category);
      formData.append('description', input.description);
      if (input.locationId) formData.append('locationId', input.locationId);
      if (input.imageFile) {
        const ext = input.imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        formData.append('image', input.imageFile, `photo_${Date.now()}.${ext}`);
      }

      const { data } = await apiClient.post<ApiResponse<CreateFacilityRequestResult>>(
        '/facility-requests',
        formData,
        { headers: { 'Content-Type': undefined } },
      );
      return data.data;
    },
  });
}
