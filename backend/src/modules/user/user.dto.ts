import { Role, Position } from '@prisma/client';

// ================================================================
// User DTOs
// ================================================================

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role: Role;
  position?: Position;
  branchId?: string;
}

export interface UpdateUserDto {
  name?: string;
  role?: Role;
  position?: Position;
  branchId?: string | null;
  /// 담당 지점 복수 배정 — 전달 시 branchId(주 지점)는 배열 첫 항목으로 동기화
  branchIds?: string[];
  isActive?: boolean;
}

export interface ListUsersQuery {
  role?: Role;
  branchId?: string;
  isActive?: boolean;
}
