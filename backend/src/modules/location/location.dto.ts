import { LocationType } from '@prisma/client';

// ================================================================
// Location DTOs
// ================================================================

export interface CreateLocationDto {
  name: string;
  type: LocationType;
  /// 위치 식별 코드 (optional). ROOM이면 객실번호로 활용.
  code?: string;
}

export interface UpdateLocationDto {
  name?: string;
  code?: string;
  isActive?: boolean;
}

export interface ListLocationsQuery {
  type?: LocationType;
  isActive?: boolean;
}
